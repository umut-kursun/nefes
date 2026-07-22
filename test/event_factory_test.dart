import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_event_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';

void main() {
  group('EventFactory', () {
    test('createSmoke stores UTC instant and local projection', () {
      final factory = EventFactory();
      final local = DateTime(2026, 7, 22, 14, 35);

      final event = factory.createSmoke(at: local);

      expect(event.eventType, SmokingEventType.smoke);
      expect(event.createdAtUtc.isUtc, isTrue);
      expect(event.createdAtUtc, local.toUtc());
      expect(event.localYear, 2026);
      expect(event.localMonth, 7);
      expect(event.localDay, 22);
      expect(event.localHour, 14);
      expect(event.localMinute, 35);
      expect(event.id, isNotEmpty);
      expect(event.clientId, event.id);
      expect(event.syncStatus, SyncStatus.local);
      expect(event.payloadJson['v'], 1);
      expect(event.timezone, isNotEmpty);
    });

    test('createSmokeDeleted references parent without overwrite', () {
      final factory = EventFactory();
      final smoke = factory.createSmoke();
      final deleted = factory.createSmokeDeleted(parentSmokeId: smoke.id);

      expect(deleted.eventType, SmokingEventType.smokeDeleted);
      expect(deleted.parentEventId, smoke.id);
      expect(deleted.id, isNot(smoke.id));
    });

    test('createSmokeTriggerNoted stores stable trigger id', () {
      final factory = EventFactory();
      final smoke = factory.createSmoke();
      final noted = factory.createSmokeTriggerNoted(
        parentSmokeId: smoke.id,
        trigger: SmokingTrigger.afterMeal,
      );

      expect(noted.eventType, SmokingEventType.smokeTriggerNoted);
      expect(noted.parentEventId, smoke.id);
      expect(noted.payloadJson['trigger'], 'after_meal');
    });

    test('createDelayStarted and createDelayEnded preserve outcome payload', () {
      final factory = EventFactory();
      final started = factory.createDelayStarted();
      final ended = factory.createDelayEnded(
        delayStartedId: started.id,
        outcome: DelayOutcome.completed,
        duration: const Duration(minutes: 5),
      );

      expect(started.eventType, SmokingEventType.delayStarted);
      expect(ended.eventType, SmokingEventType.delayEnded);
      expect(ended.parentEventId, started.id);
      expect(ended.payloadJson['outcome'], 'completed');
      expect(ended.payloadJson['durationMs'], 300000);
    });
  });
}
