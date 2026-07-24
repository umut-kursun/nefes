import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/errors/failures.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/habit/domain/services/behavior_pattern_service.dart';
import 'package:nefes/features/motivation/domain/services/delay_session_manager.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/personal_stats_provider.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/home_snapshot_builder.dart';
import 'package:nefes/features/smoking/domain/services/success_moment_builder.dart';
import 'package:nefes/features/smoking/domain/services/today_gains_builder.dart';
import 'package:nefes/features/smoking/domain/services/trigger_personalizer.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';
import 'package:uuid/uuid.dart';

/// Home ViewModel — capture-first logging, optional enrichment, Delay Coach.
class HomeViewModel extends StateNotifier<HomeUiState> {
  HomeViewModel(this._ref) : super(HomeUiState.initial()) {
    _coach = DelaySessionManager(
      engine: _ref.read(motivationEngineProvider),
    );
    _subscription = _ref.read(watchHomeSnapshotProvider)().listen(
      (snapshot) {
        _latestSnapshot = snapshot;
        _publishFromSnapshot(snapshot);
        unawaited(_refreshDerived(snapshot));
      },
      onError: (Object error, StackTrace stackTrace) {
        state = state.copyWith(errorMessage: AppStrings.smokeSaveFailed);
      },
    );

    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _onTick());
  }

  final Ref _ref;
  late final DelaySessionManager _coach;
  StreamSubscription<HomeSnapshot>? _subscription;
  Timer? _ticker;
  Timer? _contextDismissTimer;
  HomeSnapshot? _latestSnapshot;
  DateTime _lastLocalDay = DateTime.now();
  List<SmokingTrigger> _quickTriggers = TriggerPersonalizer.defaultQuickOrder;
  String? _contextualInsight;
  DateTime? _lastInsightRefresh;
  List<SmokingLogEvent> _cachedEvents = const [];
  double? _pricePerCigarette;
  List<TodayGainTileVm> _gainTiles = const [];
  final Set<String> _shownMomentKeys = {};
  final Set<int> _shownMoneyBuckets = {};
  static const _stats = EventPersonalStatsProvider();

  String _momentDayKey(String id) {
    final n = DateTime.now();
    return '${n.year}-${n.month}-${n.day}:$id';
  }

  void _offerSuccessMoment(SuccessMoment? moment) {
    if (moment == null) return;
    final key = _momentDayKey(moment.id);
    if (_shownMomentKeys.contains(key)) return;
    _shownMomentKeys.add(key);
    if (moment.id.startsWith('money_')) {
      final bucket = int.tryParse(moment.id.split('_').last);
      if (bucket != null) _shownMoneyBuckets.add(bucket);
    }
    state = state.copyWith(
      successMoment: SuccessMomentVm(id: moment.id, text: moment.text),
    );
  }

  void _publishFromSnapshot(HomeSnapshot snapshot) {
    final keepMotivation = snapshot.activeDelay != null;
    state = HomeUiState.fromSnapshot(
      snapshot,
      pendingTriggerSmokeId: state.pendingTriggerSmokeId,
      quickTriggers: _quickTriggers,
      contextualInsight: _contextualInsight,
      gainTiles: _gainTiles,
      successMoment: state.successMoment,
      motivationMessageId:
          keepMotivation ? state.motivationMessageId : null,
      motivationBody: keepMotivation ? state.motivationBody : null,
      coachMoneyCaption: keepMotivation ? state.coachMoneyCaption : null,
    ).copyWith(
      isSaving: state.isSaving,
      isUndoing: state.isUndoing,
      isDelayBusy: state.isDelayBusy,
      errorMessage: state.errorMessage,
      infoMessage: state.infoMessage,
    );
    if (!keepMotivation) {
      _coach.clear();
    }
  }

  void _syncDelaySession(HomeSnapshot snapshot) {
    _coach.sync(
      active: snapshot.activeDelay,
      allEvents: _cachedEvents,
    );
  }

  List<TodayGainTileVm> _buildGainTiles({
    required HomeSnapshot snapshot,
    required List<SmokingLogEvent> events,
    required DateTime nowLocal,
  }) {
    final day = DateTime(nowLocal.year, nowLocal.month, nowLocal.day);
    final urgePassed = _stats.urgePassedCountOnDay(
      allEvents: events,
      localDay: day,
    );
    final active = snapshot.activeDelay;
    final activeElapsed = active == null
        ? null
        : nowLocal.toUtc().difference(active.startedAtUtc);

    return TodayGainsBuilder.build(
      snapshot: snapshot,
      pricePerCigarette: _pricePerCigarette,
      urgePassedCount: urgePassed,
      activeDelayElapsed: activeElapsed,
      nowLocal: nowLocal,
    )
        .map(
          (t) => TodayGainTileVm(
            id: t.id,
            label: t.label,
            value: t.value,
            numericValue: t.numericValue,
            format: t.format,
            showPlus: t.showPlus,
          ),
        )
        .toList(growable: false);
  }

  void _applyMotivation(DateTime nowUtc) {
    if (_coach.activeSession == null) {
      if (state.motivationMessageId != null ||
          state.motivationBody != null ||
          state.coachMoneyCaption != null) {
        state = state.copyWith(clearMotivation: true);
      }
      return;
    }

    final snapshot = _coach.evaluate(
      allEvents: _cachedEvents,
      nowUtc: nowUtc,
      pricePerCigarette: _pricePerCigarette,
    );
    if (snapshot == null) {
      state = state.copyWith(clearMotivation: true);
      return;
    }

    final message = snapshot.message;
    final moneyCaption = snapshot.moneyCaption;

    if (message == null && moneyCaption == null) {
      if (state.motivationMessageId != null ||
          state.motivationBody != null ||
          state.coachMoneyCaption != null) {
        state = state.copyWith(clearMotivation: true);
      }
      return;
    }

    if (message?.id == state.motivationMessageId &&
        message?.body == state.motivationBody &&
        moneyCaption == state.coachMoneyCaption) {
      return;
    }

    state = state.copyWith(clearMotivation: true).copyWith(
      motivationMessageId: message?.id,
      motivationBody: message?.body,
      coachMoneyCaption: moneyCaption,
    );
  }

  Future<void> _refreshDerived(HomeSnapshot snapshot) async {
    final now = DateTime.now();
    final shouldRefreshInsight = _lastInsightRefresh == null ||
        now.difference(_lastInsightRefresh!) > const Duration(seconds: 30) ||
        snapshot.todayCount != state.todayCount;

    final events = await _ref.read(smokingRepositoryProvider).getAllEvents();
    if (!mounted) return;
    _cachedEvents = events;

    final settings = await _ref.read(settingsRepositoryProvider).getSettings();
    if (!mounted) return;
    _pricePerCigarette = settings.pricePerCigarette;
    _gainTiles = _buildGainTiles(
      snapshot: snapshot,
      events: events,
      nowLocal: now,
    );

    _quickTriggers = TriggerPersonalizer.rankedQuickPicks(allEvents: events);

    if (shouldRefreshInsight) {
      _lastInsightRefresh = now;
      _contextualInsight = BehaviorPatternService.todayInsight(
        allEvents: events,
        nowLocal: now,
      )?.message;
    }

    if (!mounted) return;
    _syncDelaySession(snapshot);
    state = state.copyWith(
      quickTriggers: _quickTriggers,
      contextualInsight: _contextualInsight,
      clearContextualInsight: _contextualInsight == null,
      gainTiles: _gainTiles,
      todayDelayMinutes: snapshot.todayDelayTotal.inMinutes,
      todayDelayCount: snapshot.todayDelayCount,
    );
    _applyMotivation(now.toUtc());

    _offerSuccessMoment(
      SuccessMomentBuilder.laterFirstCigarette(
        snapshot: snapshot,
        allEvents: events,
        nowLocal: now,
      ),
    );

    final money = MoneyCalculator.moneyNotSpent(
      cigarettesDelayed: _stats.urgePassedCountOnDay(
        allEvents: events,
        localDay: DateTime(now.year, now.month, now.day),
      ),
      pricePerCigarette: _pricePerCigarette,
    );
    _offerSuccessMoment(
      SuccessMomentBuilder.moneyMilestone(
        amountTry: money,
        alreadyShown: _shownMoneyBuckets,
      ),
    );
  }

  Future<void> _onTick() async {
    if (!mounted) return;
    final now = DateTime.now();
    final dayChanged = now.year != _lastLocalDay.year ||
        now.month != _lastLocalDay.month ||
        now.day != _lastLocalDay.day;

    if (dayChanged) {
      _lastLocalDay = now;
      final events = await _ref.read(smokingRepositoryProvider).getAllEvents();
      if (!mounted) return;
      final settings = await _ref.read(settingsRepositoryProvider).getSettings();
      if (!mounted) return;
      final snapshot = HomeSnapshotBuilder.build(
        allEvents: events,
        settings: settings,
        nowLocal: now,
      );
      _latestSnapshot = snapshot;
      _publishFromSnapshot(snapshot);
      await _refreshDerived(snapshot);
      return;
    }

    final snap = _latestSnapshot;
    if (snap == null) return;

    final last = snap.lastSmokeAtUtc;
    final delay = snap.activeDelay;
    final nextElapsed = last == null
        ? state.elapsedLabel
        : TimeDisplay.formatElapsedClock(now.toUtc().difference(last));
    final nextDelayElapsed = delay == null
        ? ''
        : TimeDisplay.formatElapsedClock(
            now.toUtc().difference(delay.startedAtUtc),
          );
    final nextTimedOut = delay?.isElapsed(now.toUtc()) ?? false;
    final nextIntended = delay?.intendedDuration?.inMinutes;
    final nextHasLast = last != null;
    final nextHasDelay = delay != null;

    _syncDelaySession(snap);

    // Avoid notifying listeners when the visible clocks did not change.
    final clocksUnchanged = nextElapsed == state.elapsedLabel &&
        nextDelayElapsed == state.delayElapsedLabel &&
        nextTimedOut == state.delayTimedOut &&
        nextIntended == state.delayIntendedMinutes &&
        nextHasLast == state.hasLastSmoke &&
        nextHasDelay == state.hasActiveDelay;

    List<TodayGainTileVm>? nextGains;
    if (nextHasDelay || state.gainTiles.isEmpty) {
      nextGains = _buildGainTiles(
        snapshot: snap,
        events: _cachedEvents,
        nowLocal: now,
      );
      if (_listEqualsGain(nextGains, state.gainTiles)) {
        nextGains = null;
      } else {
        _gainTiles = nextGains;
      }
    }

    if (!clocksUnchanged || nextGains != null) {
      state = state.copyWith(
        elapsedLabel: nextElapsed,
        hasLastSmoke: nextHasLast,
        hasActiveDelay: nextHasDelay,
        delayElapsedLabel: nextDelayElapsed,
        delayTimedOut: nextTimedOut,
        delayIntendedMinutes: nextIntended,
        clearDelayIntended: delay == null,
        gainTiles: nextGains,
      );
    }

    _applyMotivation(now.toUtc());
  }

  static bool _listEqualsGain(List<TodayGainTileVm> a, List<TodayGainTileVm> b) {
    if (identical(a, b)) return true;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  void _scheduleContextDismiss() {
    _contextDismissTimer?.cancel();
    _contextDismissTimer = Timer(const Duration(seconds: 12), () {
      if (!mounted) return;
      state = state.copyWith(clearPendingTrigger: true);
    });
  }

  Future<void> onISmokedPressed() async {
    if (state.isBusy) return;
    state = state.copyWith(isSaving: true, clearError: true, clearInfo: true);

    try {
      final result =
          await _ref.read(smokingHabitActionsProvider).logCigarette();
      if (!mounted) return;
      await _ref.read(hapticPortProvider).lightImpact();
      if (!mounted) return;

      final closed = result.closedDelayDuration;
      SuccessMomentVm? momentVm;
      if (closed != null) {
        final celebration = _coach.celebrateSmoke(
          resisted: closed,
          allEvents: _cachedEvents,
          nowLocal: DateTime.now(),
        );
        final allTime = _stats.longestCompletedDelay(
          allEvents: _cachedEvents,
        );
        final moment = SuccessMomentBuilder.fromClosedDelay(
          celebration: celebration,
          allTimeBest: allTime,
        );
        if (moment != null) {
          final key = _momentDayKey(moment.id);
          if (!_shownMomentKeys.contains(key)) {
            _shownMomentKeys.add(key);
            momentVm = SuccessMomentVm(id: moment.id, text: moment.text);
          }
        }
        _coach.clear();
      }

      state = state.copyWith(
        isSaving: false,
        infoMessage: AppStrings.smokedSaved,
        pendingTriggerSmokeId: result.smokeId,
        clearMotivation: true,
        successMoment: momentVm,
      );
      _scheduleContextDismiss();
    } on Failure {
      if (!mounted) return;
      state = state.copyWith(
        isSaving: false,
        errorMessage: AppStrings.smokeSaveFailed,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        isSaving: false,
        errorMessage: AppStrings.smokeSaveFailed,
      );
    }
  }

  Future<void> logEarlier({required int minutesAgo}) async {
    if (state.isBusy) return;
    await _logAt(DateTime.now().subtract(Duration(minutes: minutesAgo)));
  }

  Future<void> logAtCustomLocal(DateTime localTime) async {
    if (state.isBusy) return;
    final now = DateTime.now();
    if (localTime.isAfter(now.add(const Duration(minutes: 1)))) {
      state = state.copyWith(errorMessage: AppStrings.invalidPastTime);
      return;
    }
    await _logAt(localTime);
  }

  Future<void> _logAt(DateTime at) async {
    state = state.copyWith(isSaving: true, clearError: true, clearInfo: true);
    try {
      final result = await _ref.read(smokingHabitActionsProvider).logCigarette(
            at: at,
            retroactive: true,
          );
      if (!mounted) return;
      await _ref.read(hapticPortProvider).lightImpact();
      if (!mounted) return;
      state = state.copyWith(
        isSaving: false,
        infoMessage: AppStrings.smokedSaved,
        pendingTriggerSmokeId: result.smokeId,
      );
      _scheduleContextDismiss();
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        isSaving: false,
        errorMessage: AppStrings.smokeSaveFailed,
      );
    }
  }

  Future<void> selectTrigger(SmokingTrigger trigger) async {
    final smokeId = state.pendingTriggerSmokeId;
    if (smokeId == null) return;
    _contextDismissTimer?.cancel();
    try {
      await _ref.read(smokingHabitActionsProvider).updateEventContext(
            smokeEventId: smokeId,
            trigger: trigger,
          );
    } catch (_) {}
    if (!mounted) return;
    state = state.copyWith(clearPendingTrigger: true);
  }

  void dismissOptionalContext() {
    _contextDismissTimer?.cancel();
    state = state.copyWith(clearPendingTrigger: true);
  }

  void skipTrigger() => dismissOptionalContext();

  Future<void> startDelayWithDuration(Duration? intended) async {
    if (state.isBusy) return;
    final firstToday =
        !state.hasActiveDelay && state.todayDelayCount == 0;
    state = state.copyWith(isDelayBusy: true, clearError: true, clearInfo: true);
    try {
      await _ref.read(smokingHabitActionsProvider).beginDelay(
            intendedDuration: intended,
          );
      if (!mounted) return;
      await _ref.read(hapticPortProvider).lightImpact();
      if (!mounted) return;
      state = state.copyWith(isDelayBusy: false);
      _offerSuccessMoment(
        SuccessMomentBuilder.firstDelayOfDay(isFirstToday: firstToday),
      );
    } on Failure {
      if (!mounted) return;
      state = state.copyWith(
        isDelayBusy: false,
        errorMessage: AppStrings.delayStartFailed,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        isDelayBusy: false,
        errorMessage: AppStrings.delayStartFailed,
      );
    }
  }

  Future<void> onDelayPressed() => startDelayWithDuration(null);

  Future<void> onUrgePassed() async {
    if (state.isBusy || !state.hasActiveDelay) return;
    final minutes = state.todayDelayMinutes;
    // Prefer active delay elapsed if labeled — fall back to session minutes.
    final elapsedLabel = state.delayElapsedLabel;
    final activeMinutes = _parseRoughMinutes(elapsedLabel) ?? minutes;
    state = state.copyWith(isDelayBusy: true, clearError: true, clearInfo: true);
    try {
      await _ref.read(smokingHabitActionsProvider).finishDelayUrgePassed();
      if (!mounted) return;
      final moment = SuccessMomentBuilder.urgePassed(minutes: activeMinutes);
      final key = _momentDayKey(moment.id);
      SuccessMomentVm? momentVm;
      if (!_shownMomentKeys.contains(key)) {
        _shownMomentKeys.add(key);
        momentVm = SuccessMomentVm(id: moment.id, text: moment.text);
      }
      state = state.copyWith(
        isDelayBusy: false,
        infoMessage: AppStrings.delayCompleteDone,
        successMoment: momentVm,
        clearMotivation: true,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        isDelayBusy: false,
        errorMessage: AppStrings.delayStartFailed,
      );
    }
  }

  static int? _parseRoughMinutes(String label) {
    // Elapsed clock is typically HH:MM:SS or MM:SS — use total minutes approx.
    final parts = label.split(':');
    if (parts.length == 3) {
      final h = int.tryParse(parts[0]) ?? 0;
      final m = int.tryParse(parts[1]) ?? 0;
      return h * 60 + m;
    }
    if (parts.length == 2) {
      return int.tryParse(parts[0]);
    }
    return null;
  }

  Future<void> onCancelDelay() async {
    if (state.isBusy || !state.hasActiveDelay) return;
    state = state.copyWith(isDelayBusy: true, clearError: true, clearInfo: true);
    try {
      await _ref.read(smokingHabitActionsProvider).abandonDelay();
      if (!mounted) return;
      state = state.copyWith(
        isDelayBusy: false,
        infoMessage: AppStrings.delayCancelled,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        isDelayBusy: false,
        errorMessage: AppStrings.delayStartFailed,
      );
    }
  }

  Future<void> onDelayEndedWithSmoke() => onISmokedPressed();

  Future<void> undoLastConfirmed() async {
    if (state.isBusy || !state.canUndo) return;
    state = state.copyWith(isUndoing: true, clearError: true, clearInfo: true);

    try {
      final result = await _ref.read(smokingHabitActionsProvider).undoLatest();
      if (!mounted) return;
      if (result == null) {
        state = state.copyWith(isUndoing: false);
        return;
      }
      await _ref.read(hapticPortProvider).lightImpact();
      if (!mounted) return;
      state = state.copyWith(
        isUndoing: false,
        infoMessage: AppStrings.undoDone,
        clearPendingTrigger: true,
      );
    } on Failure {
      if (!mounted) return;
      state = state.copyWith(
        isUndoing: false,
        errorMessage: AppStrings.undoFailed,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        isUndoing: false,
        errorMessage: AppStrings.undoFailed,
      );
    }
  }

  Future<void> completeOnboarding({
    required int averagePerDay,
    required int dailyTarget,
  }) async {
    await _ref.read(settingsRepositoryProvider).completeOnboarding(
          averagePerDay: averagePerDay,
          dailyTarget: dailyTarget,
        );
    await _appendTargetPeriod(dailyTarget);
  }

  Future<void> updateDailyTarget(int value) async {
    await _ref.read(settingsRepositoryProvider).setDailyTarget(value);
    await _appendTargetPeriod(value);
  }

  Future<void> _appendTargetPeriod(int target) async {
    final now = DateTime.now();
    await _ref.read(targetHistoryRepositoryProvider).appendPeriod(
          DailyTargetPeriod(
            id: const Uuid().v4(),
            habitType: HabitType.smoking.storageId,
            target: target,
            effectiveFromLocalYear: now.year,
            effectiveFromLocalMonth: now.month,
            effectiveFromLocalDay: now.day,
            createdAtUtc: now.toUtc(),
          ),
        );
  }

  void clearMessages() {
    state = state.copyWith(clearError: true, clearInfo: true);
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _contextDismissTimer?.cancel();
    _subscription?.cancel();
    super.dispose();
  }
}

final homeViewModelProvider =
    StateNotifierProvider.autoDispose<HomeViewModel, HomeUiState>((ref) {
  return HomeViewModel(ref);
});
