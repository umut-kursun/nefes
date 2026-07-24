import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/today_gains_builder.dart';
import 'package:nefes/features/smoking/domain/services/trigger_personalizer.dart';

/// Compact tile for the “Bugün kazandıkların” dashboard.
class TodayGainTileVm {
  const TodayGainTileVm({
    required this.id,
    required this.label,
    required this.value,
    this.numericValue,
    this.format = GainValueFormat.plain,
    this.showPlus = false,
  });

  final String id;
  final String label;
  final String value;
  final double? numericValue;
  final GainValueFormat format;
  final bool showPlus;

  @override
  bool operator ==(Object other) =>
      other is TodayGainTileVm &&
      other.id == id &&
      other.label == label &&
      other.value == value &&
      other.numericValue == numericValue &&
      other.format == format &&
      other.showPlus == showPlus;

  @override
  int get hashCode =>
      Object.hash(id, label, value, numericValue, format, showPlus);
}

/// Subtle in-UI celebration line.
class SuccessMomentVm {
  const SuccessMomentVm({
    required this.id,
    required this.text,
  });

  final String id;
  final String text;

  @override
  bool operator ==(Object other) =>
      other is SuccessMomentVm && other.id == id && other.text == text;

  @override
  int get hashCode => Object.hash(id, text);
}

/// UI state for the Home screen.
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
    required this.todayDelayMinutes,
    required this.todayDelayInsight,
    this.gainTiles = const [],
    this.successMoment,
    this.pendingTriggerSmokeId,
    this.quickTriggers = TriggerPersonalizer.defaultQuickOrder,
    this.contextualInsight,
    this.delayIntendedMinutes,
    this.delayTimedOut = false,
    this.motivationMessageId,
    this.motivationBody,
    this.coachMoneyCaption,
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
        todayDelayMinutes: 0,
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
  final int todayDelayMinutes;
  final String? todayDelayInsight;
  final List<TodayGainTileVm> gainTiles;
  final SuccessMomentVm? successMoment;
  final String? pendingTriggerSmokeId;
  final List<SmokingTrigger> quickTriggers;
  final String? contextualInsight;
  final int? delayIntendedMinutes;
  final bool delayTimedOut;
  final String? motivationMessageId;
  final String? motivationBody;
  final String? coachMoneyCaption;
  final bool isSaving;
  final bool isUndoing;
  final bool isDelayBusy;
  final bool isHydrated;
  final String? errorMessage;
  final String? infoMessage;

  bool get isBusy => isSaving || isUndoing || isDelayBusy;

  /// Rebuild key for Today chrome excluding 1Hz clock labels.
  Object get structureKey => Object.hash(
        todayCount,
        dailyTarget,
        remaining,
        isTargetExceeded,
        identityHashCode(todayEvents),
        hasCompletedOnboarding,
        hasLastSmoke,
        canUndo,
        hasActiveDelay,
        todayDelayCount,
        todayDelayMinutes,
        todayDelayInsight,
        Object.hashAll(gainTiles),
        successMoment,
        pendingTriggerSmokeId,
        identityHashCode(quickTriggers),
        contextualInsight,
        Object.hash(
          delayIntendedMinutes,
          delayTimedOut,
          motivationMessageId,
          motivationBody,
          coachMoneyCaption,
          isSaving,
          isUndoing,
          isDelayBusy,
          isHydrated,
        ),
      );

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
    int? todayDelayMinutes,
    String? todayDelayInsight,
    List<TodayGainTileVm>? gainTiles,
    SuccessMomentVm? successMoment,
    String? pendingTriggerSmokeId,
    List<SmokingTrigger>? quickTriggers,
    String? contextualInsight,
    int? delayIntendedMinutes,
    bool? delayTimedOut,
    String? motivationMessageId,
    String? motivationBody,
    String? coachMoneyCaption,
    bool? isSaving,
    bool? isUndoing,
    bool? isDelayBusy,
    bool? isHydrated,
    String? errorMessage,
    String? infoMessage,
    bool clearError = false,
    bool clearInfo = false,
    bool clearPendingTrigger = false,
    bool clearContextualInsight = false,
    bool clearDelayIntended = false,
    bool clearMotivation = false,
    bool clearSuccessMoment = false,
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
      todayDelayMinutes: todayDelayMinutes ?? this.todayDelayMinutes,
      todayDelayInsight: todayDelayInsight ?? this.todayDelayInsight,
      gainTiles: gainTiles ?? this.gainTiles,
      successMoment: clearSuccessMoment
          ? null
          : (successMoment ?? this.successMoment),
      pendingTriggerSmokeId: clearPendingTrigger
          ? null
          : (pendingTriggerSmokeId ?? this.pendingTriggerSmokeId),
      quickTriggers: quickTriggers ?? this.quickTriggers,
      contextualInsight: clearContextualInsight
          ? null
          : (contextualInsight ?? this.contextualInsight),
      delayIntendedMinutes: clearDelayIntended
          ? null
          : (delayIntendedMinutes ?? this.delayIntendedMinutes),
      delayTimedOut: delayTimedOut ?? this.delayTimedOut,
      motivationMessageId: clearMotivation
          ? null
          : (motivationMessageId ?? this.motivationMessageId),
      motivationBody:
          clearMotivation ? null : (motivationBody ?? this.motivationBody),
      coachMoneyCaption: clearMotivation
          ? null
          : (coachMoneyCaption ?? this.coachMoneyCaption),
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
    List<SmokingTrigger>? quickTriggers,
    String? contextualInsight,
    String? motivationMessageId,
    String? motivationBody,
    String? coachMoneyCaption,
    List<TodayGainTileVm>? gainTiles,
    SuccessMomentVm? successMoment,
  }) {
    final clock = now ?? DateTime.now();
    final last = snapshot.lastSmokeAtUtc;
    final hasLast = last != null;
    final delay = snapshot.activeDelay;
    final intended = delay?.intendedDuration;

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
      delayIntendedMinutes: intended?.inMinutes,
      delayTimedOut: delay?.isElapsed(clock.toUtc()) ?? false,
      todayDelayCount: snapshot.todayDelayCount,
      todayDelayMinutes: snapshot.todayDelayTotal.inMinutes,
      todayDelayInsight: _insightFor(snapshot),
      gainTiles: gainTiles ?? const [],
      successMoment: successMoment,
      pendingTriggerSmokeId: pendingTriggerSmokeId,
      quickTriggers: quickTriggers ?? TriggerPersonalizer.defaultQuickOrder,
      contextualInsight: contextualInsight,
      motivationMessageId: delay == null ? null : motivationMessageId,
      motivationBody: delay == null ? null : motivationBody,
      coachMoneyCaption: delay == null ? null : coachMoneyCaption,
    );
  }
}
