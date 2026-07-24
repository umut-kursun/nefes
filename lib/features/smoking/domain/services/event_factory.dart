import 'package:nefes/core/time/datetime_context.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_event_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:uuid/uuid.dart';

/// Builds immutable smoking / delay events with UTC + local timezone context.
class EventFactory {
  EventFactory({Uuid? uuid, this.habitType = HabitType.smoking})
    : _uuid = uuid ?? const Uuid();

  final Uuid _uuid;
  final HabitType habitType;

  static const int payloadSchemaVersion = 1;

  SmokingLogEvent createSmoke({DateTime? at}) {
    final context = DateTimeContext.fromNow(at);
    final id = _uuid.v4();

    return SmokingLogEvent(
      id: id,
      createdAtUtc: context.createdAtUtc,
      localDay: context.localDay,
      localMonth: context.localMonth,
      localYear: context.localYear,
      localHour: context.localHour,
      localMinute: context.localMinute,
      localWeekday: context.localWeekday,
      timezone: context.timezone,
      utcOffsetMinutes: context.utcOffsetMinutes,
      eventType: SmokingEventType.smoke,
      source: EventSource.manual,
      clientId: id,
      syncStatus: SyncStatus.local,
      schemaVersion: payloadSchemaVersion,
      payloadJson: _defaultPayload(),
      insertedAtUtc: DateTime.now().toUtc(),
      habitType: habitType,
    );
  }

  SmokingLogEvent createSmokeDeleted({
    required String parentSmokeId,
    DateTime? at,
    String reason = 'user_undo_last',
  }) {
    return _base(
      at: at,
      eventType: SmokingEventType.smokeDeleted,
      parentEventId: parentSmokeId,
      payload: <String, dynamic>{
        'v': payloadSchemaVersion,
        'reason': reason,
      },
    );
  }

  SmokingLogEvent createSmokeTriggerNoted({
    required String parentSmokeId,
    required SmokingTrigger trigger,
    DateTime? at,
  }) {
    return _base(
      at: at,
      eventType: SmokingEventType.smokeTriggerNoted,
      parentEventId: parentSmokeId,
      payload: <String, dynamic>{
        'v': payloadSchemaVersion,
        'trigger': trigger.storageId,
      },
    );
  }

  SmokingLogEvent createSmokeTriggerCleared({
    required String parentSmokeId,
    DateTime? at,
  }) {
    return _base(
      at: at,
      eventType: SmokingEventType.smokeTriggerCleared,
      parentEventId: parentSmokeId,
      payload: <String, dynamic>{
        'v': payloadSchemaVersion,
        'cleared': true,
      },
    );
  }

  SmokingLogEvent createDelayStarted({
    DateTime? at,
    Duration? intendedDuration,
  }) {
    return _base(
      at: at,
      eventType: SmokingEventType.delayStarted,
      payload: <String, dynamic>{
        'v': payloadSchemaVersion,
        'kind': 'resist_delay',
        if (intendedDuration != null)
          'intendedDurationMs': intendedDuration.inMilliseconds,
      },
    );
  }

  SmokingLogEvent createDelayEnded({
    required String delayStartedId,
    required DelayOutcome outcome,
    required Duration duration,
    String? relatedSmokeId,
    DateTime? at,
  }) {
    return _base(
      at: at,
      eventType: SmokingEventType.delayEnded,
      parentEventId: delayStartedId,
      payload: <String, dynamic>{
        'v': payloadSchemaVersion,
        'outcome': outcome.storageId,
        'durationMs': duration.inMilliseconds < 0 ? 0 : duration.inMilliseconds,
        'relatedSmokeId': ?relatedSmokeId,
      },
    );
  }

  SmokingLogEvent _base({
    required SmokingEventType eventType,
    required Map<String, dynamic> payload,
    String? parentEventId,
    DateTime? at,
  }) {
    final context = DateTimeContext.fromNow(at);
    final id = _uuid.v4();
    return SmokingLogEvent(
      id: id,
      createdAtUtc: context.createdAtUtc,
      localDay: context.localDay,
      localMonth: context.localMonth,
      localYear: context.localYear,
      localHour: context.localHour,
      localMinute: context.localMinute,
      localWeekday: context.localWeekday,
      timezone: context.timezone,
      utcOffsetMinutes: context.utcOffsetMinutes,
      eventType: eventType,
      parentEventId: parentEventId,
      source: EventSource.manual,
      clientId: id,
      syncStatus: SyncStatus.local,
      schemaVersion: payloadSchemaVersion,
      payloadJson: payload,
      insertedAtUtc: DateTime.now().toUtc(),
      habitType: habitType,
    );
  }

  Map<String, dynamic> _defaultPayload() {
    return <String, dynamic>{
      'v': payloadSchemaVersion,
      'mood': null,
      'reason': null,
      'intensity': null,
      'tags': <String>[],
      'context': <String, dynamic>{
        'placeLabel': null,
        'lat': null,
        'lng': null,
        'activity': null,
      },
      'device': <String, dynamic>{
        'platform': 'web',
        'appVersion': '1.5.2',
      },
      'ai': <String, dynamic>{
        'features': <String, dynamic>{},
        'labels': <String>[],
      },
    };
  }
}
