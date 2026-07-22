import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';

/// UI state for the Home screen (M3).
class HomeUiState {
  const HomeUiState({
    required this.todayCount,
    required this.dailyTarget,
    required this.remaining,
    required this.isTargetExceeded,
    required this.todayEvents,
    required this.hasCompletedOnboarding,
    required this.elapsedLabel,
    required this.hasLastSmoke,
    required this.canUndo,
    required this.hasActiveDelay,
    required this.delayElapsedLabel,
    required this.todayDelayCount,
    required this.todayDelayInsight,
    this.pendingTriggerSmokeId,
    this.isSaving = false,
    this.isUndoing = false,
    this.isDelayBusy = false,
    this.isHydrated = true,
    this.errorMessage,
    this.infoMessage,
  });

  factory HomeUiState.initial() => const HomeUiState(
    todayCount: 0,
    dailyTarget: 20,
    remaining: 20,
    isTargetExceeded: false,
    todayEvents: [],
    hasCompletedOnboarding: false,
    elapsedLabel: '',
    hasLastSmoke: false,
    canUndo: false,
    hasActiveDelay: false,
    delayElapsedLabel: '',
    todayDelayCount: 0,
    todayDelayInsight: null,
    isHydrated: false,
  );

  final int todayCount;
  final int dailyTarget;
  final int remaining;
  final bool isTargetExceeded;
  final List<HomeEventItem> todayEvents;
  final bool hasCompletedOnboarding;
  final String elapsedLabel;
  final bool hasLastSmoke;
  final bool canUndo;
  final bool hasActiveDelay;
  final String delayElapsedLabel;
  final int todayDelayCount;
  final String? todayDelayInsight;
  final String? pendingTriggerSmokeId;
  final bool isSaving;
  final bool isUndoing;
  final bool isDelayBusy;
  final bool isHydrated;
  final String? errorMessage;
  final String? infoMessage;

  bool get isBusy => isSaving || isUndoing || isDelayBusy;

  HomeUiState copyWith({
    int? todayCount,
    int? dailyTarget,
    int? remaining,
    bool? isTargetExceeded,
    List<HomeEventItem>? todayEvents,
    bool? hasCompletedOnboarding,
    String? elapsedLabel,
    bool? hasLastSmoke,
    bool? canUndo,
    bool? hasActiveDelay,
    String? delayElapsedLabel,
    int? todayDelayCount,
    String? todayDelayInsight,
    String? pendingTriggerSmokeId,
    bool? isSaving,
    bool? isUndoing,
    bool? isDelayBusy,
    bool? isHydrated,
    String? errorMessage,
    String? infoMessage,
    bool clearError = false,
    bool clearInfo = false,
    bool clearPendingTrigger = false,
  }) {
    return HomeUiState(
      todayCount: todayCount ?? this.todayCount,
      dailyTarget: dailyTarget ?? this.dailyTarget,
      remaining: remaining ?? this.remaining,
      isTargetExceeded: isTargetExceeded ?? this.isTargetExceeded,
      todayEvents: todayEvents ?? this.todayEvents,
      hasCompletedOnboarding:
          hasCompletedOnboarding ?? this.hasCompletedOnboarding,
      elapsedLabel: elapsedLabel ?? this.elapsedLabel,
      hasLastSmoke: hasLastSmoke ?? this.hasLastSmoke,
      canUndo: canUndo ?? this.canUndo,
      hasActiveDelay: hasActiveDelay ?? this.hasActiveDelay,
      delayElapsedLabel: delayElapsedLabel ?? this.delayElapsedLabel,
      todayDelayCount: todayDelayCount ?? this.todayDelayCount,
      todayDelayInsight: todayDelayInsight ?? this.todayDelayInsight,
      pendingTriggerSmokeId: clearPendingTrigger
          ? null
          : (pendingTriggerSmokeId ?? this.pendingTriggerSmokeId),
      isSaving: isSaving ?? this.isSaving,
      isUndoing: isUndoing ?? this.isUndoing,
      isDelayBusy: isDelayBusy ?? this.isDelayBusy,
      isHydrated: isHydrated ?? this.isHydrated,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      infoMessage: clearInfo ? null : (infoMessage ?? this.infoMessage),
    );
  }

  static String? _insightFor(HomeSnapshot snapshot) {
    if (snapshot.todayDelayCount <= 0) return null;
    final minutes = snapshot.todayDelayTotal.inMinutes;
    if (minutes >= 1) {
      return AppStrings.todayDelayTotalMinutes(minutes);
    }
    return AppStrings.todayDelayCount(snapshot.todayDelayCount);
  }

  static HomeUiState fromSnapshot(
    HomeSnapshot snapshot, {
    DateTime? now,
    String? pendingTriggerSmokeId,
  }) {
    final clock = now ?? DateTime.now();
    final last = snapshot.lastSmokeAtUtc;
    final hasLast = last != null;
    final delay = snapshot.activeDelay;

    return HomeUiState(
      todayCount: snapshot.todayCount,
      dailyTarget: snapshot.dailyTarget,
      remaining: snapshot.remaining,
      isTargetExceeded: snapshot.isTargetExceeded,
      todayEvents: snapshot.todayEvents,
      hasCompletedOnboarding: snapshot.hasCompletedOnboarding,
      hasLastSmoke: hasLast,
      canUndo: snapshot.canUndo,
      isHydrated: true,
      elapsedLabel: hasLast
          ? TimeDisplay.formatElapsedClock(clock.toUtc().difference(last))
          : '',
      hasActiveDelay: delay != null,
      delayElapsedLabel: delay == null
          ? ''
          : TimeDisplay.formatElapsedClock(
              clock.toUtc().difference(delay.startedAtUtc),
            ),
      todayDelayCount: snapshot.todayDelayCount,
      todayDelayInsight: _insightFor(snapshot),
      pendingTriggerSmokeId: pendingTriggerSmokeId,
    );
  }
}
