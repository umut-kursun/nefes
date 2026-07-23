import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_event_type.dart';

/// Immutable habit event (append-only historical record).
///
/// Smoking remains the first module; [habitType] enables future modules
/// without rewriting persistence.
class SmokingLogEvent {
  const SmokingLogEvent({
    required this.id,
    required this.createdAtUtc,
    required this.localDay,
    required this.localMonth,
    required this.localYear,
    required this.localHour,
    required this.localMinute,
    required this.localWeekday,
    required this.timezone,
    required this.utcOffsetMinutes,
    required this.eventType,
    required this.source,
    required this.clientId,
    required this.syncStatus,
    required this.schemaVersion,
    required this.payloadJson,
    required this.insertedAtUtc,
    this.parentEventId,
    this.habitType = HabitType.smoking,
  });

  final String id;
  final DateTime createdAtUtc;
  final int localDay;
  final int localMonth;
  final int localYear;
  final int localHour;
  final int localMinute;
  final int localWeekday;
  final String timezone;
  final int utcOffsetMinutes;
  final SmokingEventType eventType;
  final String? parentEventId;
  final EventSource source;
  final String clientId;
  final SyncStatus syncStatus;
  final int schemaVersion;
  final Map<String, dynamic> payloadJson;
  final DateTime insertedAtUtc;
  final HabitType habitType;

  DateTime get localDate => DateTime(localYear, localMonth, localDay);

  bool get isSmoke => eventType == SmokingEventType.smoke;

  bool get isSmokeDeleted => eventType == SmokingEventType.smokeDeleted;

  bool get isSmokeTriggerNoted =>
      eventType == SmokingEventType.smokeTriggerNoted;

  bool get isSmokeTriggerCleared =>
      eventType == SmokingEventType.smokeTriggerCleared;

  bool get isDelayStarted => eventType == SmokingEventType.delayStarted;

  bool get isDelayEnded => eventType == SmokingEventType.delayEnded;
}
