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
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/home_snapshot_builder.dart';
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

  void _publishFromSnapshot(HomeSnapshot snapshot) {
    final keepMotivation = snapshot.activeDelay != null;
    state = HomeUiState.fromSnapshot(
      snapshot,
      pendingTriggerSmokeId: state.pendingTriggerSmokeId,
      quickTriggers: _quickTriggers,
      contextualInsight: _contextualInsight,
      motivationMessageId:
          keepMotivation ? state.motivationMessageId : null,
      motivationBody: keepMotivation ? state.motivationBody : null,
      coachCards: keepMotivation ? state.coachCards : const [],
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

  void _applyMotivation(DateTime nowUtc) {
    if (_coach.activeSession == null) {
      if (state.motivationMessageId != null ||
          state.motivationBody != null ||
          state.coachCards.isNotEmpty) {
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
    final cards = snapshot.cards
        .map(
          (c) => CoachCardVm(
            kind: c.kind.name,
            title: c.title,
            value: c.value,
          ),
        )
        .toList(growable: false);

    if (message == null && cards.isEmpty) {
      if (state.motivationMessageId != null ||
          state.motivationBody != null ||
          state.coachCards.isNotEmpty) {
        state = state.copyWith(clearMotivation: true);
      }
      return;
    }

    if (message?.id == state.motivationMessageId &&
        message?.body == state.motivationBody &&
        _sameCards(cards, state.coachCards)) {
      return;
    }

    state = state.copyWith(clearMotivation: true).copyWith(
      motivationMessageId: message?.id,
      motivationBody: message?.body,
      coachCards: cards,
    );
  }

  bool _sameCards(List<CoachCardVm> a, List<CoachCardVm> b) {
    if (identical(a, b)) return true;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
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
    );
    _applyMotivation(now.toUtc());
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

    if (!clocksUnchanged) {
      state = state.copyWith(
        elapsedLabel: nextElapsed,
        hasLastSmoke: nextHasLast,
        hasActiveDelay: nextHasDelay,
        delayElapsedLabel: nextDelayElapsed,
        delayTimedOut: nextTimedOut,
        delayIntendedMinutes: nextIntended,
        clearDelayIntended: delay == null,
      );
    }

    _applyMotivation(now.toUtc());
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
      String? delayMsg;
      if (closed != null) {
        final celebration = _coach.celebrateSmoke(
          resisted: closed,
          allEvents: _cachedEvents,
          nowLocal: DateTime.now(),
        );
        delayMsg = celebration.message;
        _coach.clear();
      }

      state = state.copyWith(
        isSaving: false,
        infoMessage: delayMsg ?? AppStrings.smokedSaved,
        pendingTriggerSmokeId: result.smokeId,
        clearMotivation: true,
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
    state = state.copyWith(isDelayBusy: true, clearError: true, clearInfo: true);
    try {
      await _ref.read(smokingHabitActionsProvider).beginDelay(
            intendedDuration: intended,
          );
      if (!mounted) return;
      await _ref.read(hapticPortProvider).lightImpact();
      if (!mounted) return;
      state = state.copyWith(isDelayBusy: false);
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
    state = state.copyWith(isDelayBusy: true, clearError: true, clearInfo: true);
    try {
      await _ref.read(smokingHabitActionsProvider).finishDelayUrgePassed();
      if (!mounted) return;
      state = state.copyWith(
        isDelayBusy: false,
        infoMessage: AppStrings.delayCompleteDone,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        isDelayBusy: false,
        errorMessage: AppStrings.delayStartFailed,
      );
    }
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
