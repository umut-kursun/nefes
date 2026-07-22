import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/errors/failures.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/home_snapshot_builder.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';

/// Home ViewModel — capture, triggers, and delay/resist (M3).
class HomeViewModel extends StateNotifier<HomeUiState> {
  HomeViewModel(this._ref) : super(HomeUiState.initial()) {
    _subscription = _ref.read(watchHomeSnapshotProvider)().listen(
      (snapshot) {
        _latestSnapshot = snapshot;
        _publishFromSnapshot(snapshot);
      },
      onError: (Object error, StackTrace stackTrace) {
        state = state.copyWith(errorMessage: AppStrings.smokeSaveFailed);
      },
    );

    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _onTick());
  }

  final Ref _ref;
  StreamSubscription<HomeSnapshot>? _subscription;
  Timer? _ticker;
  HomeSnapshot? _latestSnapshot;
  DateTime _lastLocalDay = DateTime.now();

  void _publishFromSnapshot(HomeSnapshot snapshot) {
    state = HomeUiState.fromSnapshot(
      snapshot,
      pendingTriggerSmokeId: state.pendingTriggerSmokeId,
    ).copyWith(
      isSaving: state.isSaving,
      isUndoing: state.isUndoing,
      isDelayBusy: state.isDelayBusy,
      errorMessage: state.errorMessage,
      infoMessage: state.infoMessage,
    );
  }

  Future<void> _onTick() async {
    if (!mounted) return;
    final now = DateTime.now();
    final dayChanged =
        now.year != _lastLocalDay.year ||
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
      return;
    }

    final snap = _latestSnapshot;
    if (snap == null) return;

    final last = snap.lastSmokeAtUtc;
    final delay = snap.activeDelay;
    state = state.copyWith(
      elapsedLabel: last == null
          ? state.elapsedLabel
          : TimeDisplay.formatElapsedClock(now.toUtc().difference(last)),
      hasLastSmoke: last != null,
      hasActiveDelay: delay != null,
      delayElapsedLabel: delay == null
          ? ''
          : TimeDisplay.formatElapsedClock(
              now.toUtc().difference(delay.startedAtUtc),
            ),
    );
  }

  Future<void> onISmokedPressed() async {
    if (state.isBusy) return;

    state = state.copyWith(isSaving: true, clearError: true, clearInfo: true);

    try {
      final result = await _ref.read(recordSmokeProvider)();
      if (!mounted) return;
      await _ref.read(hapticPortProvider).lightImpact();
      if (!mounted) return;

      final delayMsg = result.closedDelayDuration == null
          ? null
          : AppStrings.delayedMinutes(
              result.closedDelayDuration!.inMinutes.clamp(0, 24 * 60),
            );

      state = state.copyWith(
        isSaving: false,
        infoMessage: delayMsg ?? AppStrings.smokedSaved,
        pendingTriggerSmokeId: result.smokeId,
      );
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

  Future<void> selectTrigger(SmokingTrigger trigger) async {
    final smokeId = state.pendingTriggerSmokeId;
    if (smokeId == null) return;
    try {
      await _ref.read(attachSmokeTriggerProvider)(
        smokeEventId: smokeId,
        trigger: trigger,
      );
    } catch (_) {
      // Trigger is optional enrichment — smoking already saved.
    }
    if (!mounted) return;
    state = state.copyWith(clearPendingTrigger: true);
  }

  void skipTrigger() {
    state = state.copyWith(clearPendingTrigger: true);
  }

  Future<void> onDelayPressed() async {
    if (state.isBusy) return;
    state = state.copyWith(isDelayBusy: true, clearError: true, clearInfo: true);
    try {
      await _ref.read(startDelayProvider)();
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

  Future<void> onUrgePassed() async {
    if (state.isBusy || !state.hasActiveDelay) return;
    state = state.copyWith(isDelayBusy: true, clearError: true, clearInfo: true);
    try {
      await _ref.read(completeDelayProvider)();
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
      await _ref.read(cancelDelayProvider)();
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

  Future<void> undoLastConfirmed() async {
    if (state.isBusy || !state.canUndo) return;

    state = state.copyWith(isUndoing: true, clearError: true, clearInfo: true);

    try {
      final result = await _ref.read(undoLastSmokeProvider)();
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
  }

  Future<void> updateDailyTarget(int value) async {
    await _ref.read(settingsRepositoryProvider).setDailyTarget(value);
  }

  void clearMessages() {
    state = state.copyWith(clearError: true, clearInfo: true);
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _subscription?.cancel();
    super.dispose();
  }
}

final homeViewModelProvider =
    StateNotifierProvider.autoDispose<HomeViewModel, HomeUiState>((ref) {
      return HomeViewModel(ref);
    });
