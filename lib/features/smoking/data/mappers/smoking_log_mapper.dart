import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_event_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';

/// Maps domain events ↔ Sembast records.
abstract final class SmokingLogMapper {
  static Map<String, Object?> toRecord(SmokingLogEvent event) {
    return <String, Object?>{
      'id': event.id,
      'createdAtUtc': event.createdAtUtc.millisecondsSinceEpoch,
      'localDay': event.localDay,
      'localMonth': event.localMonth,
      'localYear': event.localYear,
      'localHour': event.localHour,
      'localMinute': event.localMinute,
      'localWeekday': event.localWeekday,
      'timezone': event.timezone,
      'utcOffsetMinutes': event.utcOffsetMinutes,
      'eventType': event.eventType.name,
      'parentEventId': event.parentEventId,
      'source': event.source.name,
      'clientId': event.clientId,
      'syncStatus': event.syncStatus.name,
      'schemaVersion': event.schemaVersion,
      'payloadJson': event.payloadJson,
      'insertedAtUtc': event.insertedAtUtc.millisecondsSinceEpoch,
      'habitType': event.habitType.storageId,
    };
  }

  static SmokingLogEvent fromRecord(Map<String, Object?> record) {
    final payload = record['payloadJson'];
    return SmokingLogEvent(
      id: record['id']! as String,
      createdAtUtc: DateTime.fromMillisecondsSinceEpoch(
        record['createdAtUtc']! as int,
        isUtc: true,
      ),
      localDay: record['localDay']! as int,
      localMonth: record['localMonth']! as int,
      localYear: record['localYear']! as int,
      localHour: record['localHour']! as int,
      localMinute: record['localMinute']! as int,
      localWeekday: record['localWeekday']! as int,
      timezone: record['timezone']! as String,
      utcOffsetMinutes: record['utcOffsetMinutes']! as int,
      eventType: SmokingEventType.fromStorage(record['eventType']! as String),
      parentEventId: record['parentEventId'] as String?,
      source: EventSource.fromStorage(record['source']! as String),
      clientId: record['clientId']! as String,
      syncStatus: SyncStatus.fromStorage(record['syncStatus']! as String),
      schemaVersion: record['schemaVersion']! as int,
      payloadJson: payload is Map
          ? Map<String, dynamic>.from(payload)
          : <String, dynamic>{},
      insertedAtUtc: DateTime.fromMillisecondsSinceEpoch(
        record['insertedAtUtc']! as int,
        isUtc: true,
      ),
      habitType: HabitType.fromStorage(record['habitType'] as String?),
    );
  }
}
