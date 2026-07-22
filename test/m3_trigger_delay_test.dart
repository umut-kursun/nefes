import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/smoking/data/datasources/smoking_local_data_source.dart';
import 'package:nefes/features/smoking/data/repositories/smoking_repository_impl.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_event_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/domain/services/home_snapshot_builder.dart';
import 'package:nefes/features/smoking/domain/usecases/attach_smoke_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/cancel_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/complete_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/record_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/start_delay.dart';
import 'package:sembast/sembast_memory.dart';

void main() {
  late DatabaseFactory dbFactory;
  late NefesLocalDatabase database;
  late SmokingRepositoryImpl repository;
  late EventFactory eventFactory;

  setUp(() async {
    dbFactory = newDatabaseFactoryMemory();
    database = NefesLocalDatabase(dbFactory);
    repository = SmokingRepositoryImpl(SmokingLocalDataSource(database));
    eventFactory = EventFactory();
  });

  tearDown(() async {
    await database.close();
  });

  group('SmokingTrigger', () {
    test('storage ids are stable snake_case', () {
      expect(SmokingTrigger.habit.storageId, 'habit');
      expect(SmokingTrigger.craving.storageId, 'craving');
      expect(SmokingTrigger.stress.storageId, 'stress');
      expect(SmokingTrigger.coffeeTea.storageId, 'coffee_tea');
      expect(SmokingTrigger.afterMeal.storageId, 'after_meal');
      expect(SmokingTrigger.social.storageId, 'social');
      expect(SmokingTrigger.other.storageId, 'other');
    });

    test('tryParse accepts storage ids and ignores unknown', () {
      expect(SmokingTrigger.tryParse('coffee_tea'), SmokingTrigger.coffeeTea);
      expect(SmokingTrigger.tryParse('unknown_future'), isNull);
      expect(SmokingTrigger.tryParse(null), isNull);
    });
  });

  group('Cigarette logging + triggers', () {
    test('logs cigarette without selecting a trigger', () async {
      final record = RecordSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final result = await record();

      final active = await repository.watchActiveSmokeEvents().first;
      expect(active, hasLength(1));
      expect(active.first.id, result.smokeId);
      expect(result.closedDelayDuration, isNull);

      final all = await repository.watchAllEvents().first;
      expect(all.where((e) => e.isSmokeTriggerNoted), isEmpty);
    });

    test('logs cigarette with each trigger type via related event', () async {
      final record = RecordSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final attach = AttachSmokeTrigger(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );

      for (final trigger in SmokingTrigger.values) {
        final result = await record();
        await attach(smokeEventId: result.smokeId, trigger: trigger);

        final all = await repository.watchAllEvents().first;
        final noted = all.where(
          (e) =>
              e.isSmokeTriggerNoted && e.parentEventId == result.smokeId,
        );
        expect(noted, hasLength(1));
        expect(noted.single.payloadJson['trigger'], trigger.storageId);

        // Smoke row itself is not rewritten.
        final smoke = all.firstWhere((e) => e.id == result.smokeId);
        expect(smoke.eventType, SmokingEventType.smoke);
        expect(smoke.payloadJson['trigger'], isNull);
      }
    });

    test('existing smoking events with no trigger remain valid', () {
      final now = DateTime(2026, 7, 22, 12, 0);
      final legacy = eventFactory.createSmoke(at: now);
      final snapshot = HomeSnapshotBuilder.build(
        allEvents: [legacy],
        settings: const AppSettings(
          hasCompletedOnboarding: true,
          dailyTarget: 20,
        ),
        nowLocal: now,
      );

      expect(snapshot.todayCount, 1);
      expect(snapshot.todayEvents.single.trigger, isNull);
      expect(snapshot.activeDelay, isNull);
    });

    test('trigger appears on home history items when noted', () {
      final now = DateTime(2026, 7, 22, 12, 0);
      final smoke = eventFactory.createSmoke(at: now);
      final noted = eventFactory.createSmokeTriggerNoted(
        parentSmokeId: smoke.id,
        trigger: SmokingTrigger.stress,
        at: now.add(const Duration(seconds: 5)),
      );

      final snapshot = HomeSnapshotBuilder.build(
        allEvents: [smoke, noted],
        settings: const AppSettings(
          hasCompletedOnboarding: true,
          dailyTarget: 20,
        ),
        nowLocal: now,
      );

      expect(snapshot.todayEvents.single.trigger, SmokingTrigger.stress);
    });
  });

  group('Delay / resist sessions', () {
    test('starting a delay session persists and reconstructs', () async {
      final start = StartDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final startedAt = DateTime(2026, 7, 22, 10, 0);
      final session = await start(at: startedAt);

      final all = await repository.watchAllEvents().first;
      expect(all.where((e) => e.isDelayStarted), hasLength(1));
      expect(all.where((e) => e.isSmoke), isEmpty);

      final active = DelaySessionResolver.resolveActive(all);
      expect(active, isNotNull);
      expect(active!.id, session.id);
      expect(active.startedAtUtc, startedAt.toUtc());

      // Persistence / reconstruction: elapsed from stored timestamp.
      final reopenAt = DateTime(2026, 7, 22, 10, 20);
      final elapsed = reopenAt.toUtc().difference(active.startedAtUtc);
      expect(elapsed.inMinutes, 20);
    });

    test('prevents duplicate active delay sessions', () async {
      final start = StartDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final first = await start(at: DateTime(2026, 7, 22, 10, 0));
      final second = await start(at: DateTime(2026, 7, 22, 10, 5));

      expect(second.id, first.id);
      final all = await repository.watchAllEvents().first;
      expect(all.where((e) => e.isDelayStarted), hasLength(1));
    });

    test('ending delay by smoking closes session and persists duration', () async {
      final start = StartDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final record = RecordSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );

      final delayStart = DateTime(2026, 7, 22, 10, 0);
      await start(at: delayStart);
      final smokeAt = delayStart.add(const Duration(minutes: 18));
      final result = await record(at: smokeAt);

      expect(result.closedDelayDuration, const Duration(minutes: 18));

      final all = await repository.watchAllEvents().first;
      expect(DelaySessionResolver.resolveActive(all), isNull);
      expect(all.where((e) => e.isSmoke), hasLength(1));
      expect(all.where((e) => e.isDelayEnded), hasLength(1));

      final ended = all.firstWhere((e) => e.isDelayEnded);
      expect(ended.payloadJson['outcome'], DelayOutcome.smoked.storageId);
      expect(ended.payloadJson['durationMs'], const Duration(minutes: 18).inMilliseconds);
      expect(ended.payloadJson['relatedSmokeId'], result.smokeId);
    });

    test('ending delay with urge passed does not create cigarette', () async {
      final start = StartDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final complete = CompleteDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );

      final delayStart = DateTime(2026, 7, 22, 11, 0);
      await start(at: delayStart);
      final duration = await complete(
        at: delayStart.add(const Duration(minutes: 12, seconds: 34)),
      );

      expect(duration, const Duration(minutes: 12, seconds: 34));

      final all = await repository.watchAllEvents().first;
      expect(all.where((e) => e.isSmoke), isEmpty);
      expect(DelaySessionResolver.resolveActive(all), isNull);

      final ended = all.firstWhere((e) => e.isDelayEnded);
      expect(ended.payloadJson['outcome'], DelayOutcome.completed.storageId);
    });

    test('accidental cancel does not count as success in today stats', () async {
      final start = StartDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final cancel = CancelDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );

      final now = DateTime(2026, 7, 22, 14, 0);
      await start(at: now);
      await cancel(at: now.add(const Duration(seconds: 10)));

      final all = await repository.watchAllEvents().first;
      final ended = all.firstWhere((e) => e.isDelayEnded);
      expect(ended.payloadJson['outcome'], DelayOutcome.cancelled.storageId);

      final stats = DelaySessionResolver.todayDelayStats(
        allEvents: all,
        nowLocal: now,
      );
      expect(stats.count, 0);
      expect(stats.total, Duration.zero);
    });

    test('correct delay duration calculation', () {
      final start = eventFactory.createDelayStarted(
        at: DateTime(2026, 7, 22, 10, 0),
      );
      final end = eventFactory.createDelayEnded(
        delayStartedId: start.id,
        outcome: DelayOutcome.completed,
        duration: const Duration(minutes: 7, seconds: 5),
        at: DateTime(2026, 7, 22, 10, 7, 5),
      );

      expect(end.payloadJson['durationMs'], 425000);
      expect(
        DelaySessionResolver.resolveActive([start, end]),
        isNull,
      );
    });

    test('smoking during active delay records smoke and ends delay', () async {
      final start = StartDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final record = RecordSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );

      await start(at: DateTime(2026, 7, 22, 9, 0));
      await record(at: DateTime(2026, 7, 22, 9, 25));

      final snapshot = HomeSnapshotBuilder.build(
        allEvents: await repository.watchAllEvents().first,
        settings: const AppSettings(
          hasCompletedOnboarding: true,
          dailyTarget: 15,
        ),
        nowLocal: DateTime(2026, 7, 22, 9, 25),
      );

      expect(snapshot.todayCount, 1);
      expect(snapshot.hasActiveDelay, isFalse);
      expect(snapshot.todayDelayCount, 1);
      expect(snapshot.todayDelayTotal, const Duration(minutes: 25));
      // Delay events must not appear in cigarette history.
      expect(snapshot.todayEvents, hasLength(1));
    });

    test("today's resist count and total delay calculation", () {
      final now = DateTime(2026, 7, 22, 18, 0);
      final d1 = eventFactory.createDelayStarted(
        at: now.subtract(const Duration(hours: 3)),
      );
      final e1 = eventFactory.createDelayEnded(
        delayStartedId: d1.id,
        outcome: DelayOutcome.completed,
        duration: const Duration(minutes: 10),
        at: now.subtract(const Duration(hours: 3) - const Duration(minutes: 10)),
      );
      final d2 = eventFactory.createDelayStarted(
        at: now.subtract(const Duration(hours: 1)),
      );
      final e2 = eventFactory.createDelayEnded(
        delayStartedId: d2.id,
        outcome: DelayOutcome.smoked,
        duration: const Duration(minutes: 32),
        relatedSmokeId: 'smoke-x',
        at: now.subtract(const Duration(hours: 1) - const Duration(minutes: 32)),
      );
      final d3 = eventFactory.createDelayStarted(
        at: now.subtract(const Duration(minutes: 5)),
      );
      final e3 = eventFactory.createDelayEnded(
        delayStartedId: d3.id,
        outcome: DelayOutcome.cancelled,
        duration: const Duration(seconds: 20),
        at: now.subtract(const Duration(minutes: 4)),
      );

      final stats = DelaySessionResolver.todayDelayStats(
        allEvents: [d1, e1, d2, e2, d3, e3],
        nowLocal: now,
      );

      expect(stats.count, 2);
      expect(stats.total, const Duration(minutes: 42));
    });

    test('no active delay: record smoke behaves normally', () async {
      final record = RecordSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final result = await record(at: DateTime(2026, 7, 22, 8, 0));
      expect(result.closedDelayDuration, isNull);
      expect(await repository.watchActiveSmokeEvents().first, hasLength(1));
    });
  });

  group('M2 behavior remains intact', () {
    test('undo still works alongside delay history', () async {
      final record = RecordSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final start = StartDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final complete = CompleteDelay(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );

      await start(at: DateTime(2026, 7, 22, 10, 0));
      await complete(at: DateTime(2026, 7, 22, 10, 8));
      final smoke = await record(at: DateTime(2026, 7, 22, 11, 0));

      final deleted = eventFactory.createSmokeDeleted(
        parentSmokeId: smoke.smokeId,
        at: DateTime(2026, 7, 22, 11, 1),
      );
      await repository.append(deleted);

      final snapshot = HomeSnapshotBuilder.build(
        allEvents: await repository.watchAllEvents().first,
        settings: const AppSettings(
          hasCompletedOnboarding: true,
          dailyTarget: 10,
        ),
        nowLocal: DateTime(2026, 7, 22, 11, 2),
      );

      expect(snapshot.todayCount, 0);
      expect(snapshot.todayDelayCount, 1);
      expect(snapshot.canUndo, isFalse);
    });

    test('schema v3 open keeps M1 smoke readable', () async {
      final smoke = eventFactory.createSmoke(at: DateTime(2026, 7, 22, 7, 0));
      await repository.append(smoke);
      final active = await repository.watchActiveSmokeEvents().first;
      expect(active.single.id, smoke.id);
    });
  });
}
