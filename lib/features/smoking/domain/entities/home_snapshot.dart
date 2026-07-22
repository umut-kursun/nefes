import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';

/// Home read model for Milestone M3.
class HomeSnapshot {
  const HomeSnapshot({
    required this.todayCount,
    required this.dailyTarget,
    required this.remaining,
    required this.isTargetExceeded,
    required this.todayEvents,
    required this.lastSmokeAtUtc,
    required this.latestActiveSmokeId,
    required this.hasCompletedOnboarding,
    required this.activeDelay,
    required this.todayDelayCount,
    required this.todayDelayTotal,
  });

  final int todayCount;
  final int dailyTarget;
  final int remaining;
  final bool isTargetExceeded;
  final List<HomeEventItem> todayEvents;
  final DateTime? lastSmokeAtUtc;
  final String? latestActiveSmokeId;
  final bool hasCompletedOnboarding;
  final ActiveDelaySession? activeDelay;
  final int todayDelayCount;
  final Duration todayDelayTotal;

  bool get canUndo => latestActiveSmokeId != null;

  bool get hasActiveDelay => activeDelay != null;
}

class HomeEventItem {
  const HomeEventItem({
    required this.id,
    required this.createdAtUtc,
    required this.sequenceNumber,
    this.intervalSincePrevious,
    this.trigger,
  });

  final String id;
  final DateTime createdAtUtc;
  final int sequenceNumber;
  final Duration? intervalSincePrevious;
  final SmokingTrigger? trigger;
}

/// Active resist/delay session reconstructed from persisted timestamps.
class ActiveDelaySession {
  const ActiveDelaySession({
    required this.id,
    required this.startedAtUtc,
  });

  final String id;
  final DateTime startedAtUtc;
}

/// App settings projection (SharedPreferences).
class AppSettings {
  const AppSettings({
    required this.hasCompletedOnboarding,
    required this.dailyTarget,
    this.averagePerDay,
  });

  final bool hasCompletedOnboarding;
  final int dailyTarget;
  final int? averagePerDay;
}

/// Result of logging a smoke (may close an active delay).
class RecordSmokeResult {
  const RecordSmokeResult({
    required this.smokeId,
    required this.smokeCreatedAtUtc,
    this.closedDelayDuration,
  });

  final String smokeId;
  final DateTime smokeCreatedAtUtc;
  final Duration? closedDelayDuration;
}
