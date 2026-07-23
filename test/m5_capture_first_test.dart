import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/core/ports/product_telemetry_port.dart';
import 'package:nefes/features/habit/domain/services/behavior_pattern_service.dart';
import 'package:nefes/features/habit/domain/services/history_analytics.dart';
import 'package:nefes/features/smoking/data/datasources/smoking_local_data_source.dart';
import 'package:nefes/features/smoking/data/repositories/smoking_repository_impl.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/domain/services/smoking_habit_actions.dart';
import 'package:nefes/features/smoking/domain/services/trigger_personalizer.dart';
import 'package:nefes/features/smoking/domain/usecases/attach_smoke_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/cancel_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/clear_smoke_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/complete_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/correct_smoke_time.dart';
import 'package:nefes/features/smoking/domain/usecases/delete_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/record_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/start_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/undo_last_smoke.dart';
import 'package:sembast/sembast_memory.dart';

void main() {
  late NefesLocalDatabase database;
  late SmokingRepositoryImpl repository;
  late EventFactory factory;
  late SmokingHabitActions actions;

  setUp(() async {
    database = NefesLocalDatabase(newDatabaseFactoryMemory());
    repository = SmokingRepositoryImpl(SmokingLocalDataSource(database));
    factory = EventFactory();
    final deleteSmoke = DeleteSmoke(
      smokingRepository: repository,
      eventFactory: factory,
    );
    final attach = AttachSmokeTrigger(
      smokingRepository: repository,
      eventFactory: factory,
    );
    actions = SmokingHabitActions(
      recordSmoke: RecordSmoke(
        smokingRepository: repository,
        eventFactory: factory,
      ),
      attachSmokeTrigger: attach,
      clearSmokeTrigger: ClearSmokeTrigger(
        smokingRepository: repository,
        eventFactory: factory,
      ),
      startDelay: StartDelay(
        smokingRepository: repository,
        eventFactory: factory,
      ),
      completeDelay: CompleteDelay(
        smokingRepository: repository,
        eventFactory: factory,
      ),
      cancelDelay: CancelDelay(
        smokingRepository: repository,
        eventFactory: factory,
      ),
      undoLastSmoke: UndoLastSmoke(
        smokingRepository: repository,
        eventFactory: factory,
      ),
      deleteSmoke: deleteSmoke,
      correctSmokeTime: CorrectSmokeTime(
        smokingRepository: repository,
        eventFactory: factory,
        deleteSmoke: deleteSmoke,
        attachSmokeTrigger: attach,
      ),
      telemetry: const NoopProductTelemetryPort(),
    );
  });

  tearDown(() async {
    await database.close();
  });

  group('Capture-first logging', () {
    test('one-tap log without trigger is valid', () async {
      final result = await actions.logCigarette();
      final all = await repository.getAllEvents();
      expect(all.where((e) => e.isSmoke), hasLength(1));
      expect(all.where((e) => e.isSmokeTriggerNoted), isEmpty);
      expect(result.smokeId, isNotEmpty);
    });

    test('trigger can be added after creation', () async {
      final result = await actions.logCigarette();
      await actions.updateEventContext(
        smokeEventId: result.smokeId,
        trigger: SmokingTrigger.coffeeTea,
      );
      final map = SmokeTriggerResolver.resolveMap(await repository.getAllEvents());
      expect(map[result.smokeId], SmokingTrigger.coffeeTea);
    });

    test('trigger can be cleared', () async {
      final result = await actions.logCigarette();
      await actions.updateEventContext(
        smokeEventId: result.smokeId,
        trigger: SmokingTrigger.stress,
      );
      await actions.removeEventContext(smokeEventId: result.smokeId);
      final map = SmokeTriggerResolver.resolveMap(await repository.getAllEvents());
      expect(map.containsKey(result.smokeId), isFalse);
    });
  });

  group('Trigger personalization', () {
    test('uses default order with insufficient history', () {
      final picks = TriggerPersonalizer.rankedQuickPicks(allEvents: const []);
      expect(picks, TriggerPersonalizer.defaultQuickOrder);
    });

    test('ranks by frequency when enough annotations exist', () async {
      for (var i = 0; i < 5; i++) {
        final r = await actions.logCigarette(
          at: DateTime(2026, 7, 20, 10 + i),
        );
        await actions.updateEventContext(
          smokeEventId: r.smokeId,
          trigger: SmokingTrigger.afterMeal,
        );
      }
      for (var i = 0; i < 3; i++) {
        final r = await actions.logCigarette(
          at: DateTime(2026, 7, 21, 10 + i),
        );
        await actions.updateEventContext(
          smokeEventId: r.smokeId,
          trigger: SmokingTrigger.stress,
        );
      }
      final picks = TriggerPersonalizer.rankedQuickPicks(
        allEvents: await repository.getAllEvents(),
      );
      expect(picks.first, SmokingTrigger.afterMeal);
      expect(picks[1], SmokingTrigger.stress);
    });
  });

  group('Retroactive logging', () {
    test('stores past UTC and local day', () async {
      final at = DateTime(2026, 7, 22, 9, 15);
      final result = await actions.logCigarette(at: at, retroactive: true);
      final smoke = (await repository.getAllEvents())
          .firstWhere((e) => e.id == result.smokeId);
      expect(smoke.localDay, 22);
      expect(smoke.localHour, 9);
      expect(smoke.localMinute, 15);
      expect(smoke.createdAtUtc, at.toUtc());
    });

    test('crosses local day boundary correctly', () async {
      final at = DateTime(2026, 7, 21, 23, 50);
      final result = await actions.logCigarette(at: at, retroactive: true);
      final smoke = (await repository.getAllEvents())
          .firstWhere((e) => e.id == result.smokeId);
      expect(smoke.localDay, 21);
      final summary = HistoryAnalytics.summaryForDay(
        allEvents: await repository.getAllEvents(),
        localDay: DateTime(2026, 7, 21),
      );
      expect(summary?.smokeCount, 1);
    });
  });

  group('Event correction', () {
    test('edits time and preserves trigger; metrics update', () async {
      final first = await actions.logCigarette(at: DateTime(2026, 7, 22, 10));
      await actions.updateEventContext(
        smokeEventId: first.smokeId,
        trigger: SmokingTrigger.social,
      );
      final corrected = await actions.editEventTime(
        smokeEventId: first.smokeId,
        newLocalTime: DateTime(2026, 7, 22, 11, 30),
      );
      final all = await repository.getAllEvents();
      // one smoke + one delete tombstone path → one active via resolver metrics
      final summary = HistoryAnalytics.summaryForDay(
        allEvents: all,
        localDay: DateTime(2026, 7, 22),
      );
      expect(summary?.smokeCount, 1);
      expect(summary?.smokesAsc.single.id, corrected.newSmokeId);
      final triggers = SmokeTriggerResolver.resolveMap(all);
      expect(triggers[corrected.newSmokeId], SmokingTrigger.social);
    });

    test('rejects future timestamps', () async {
      final first = await actions.logCigarette();
      expect(
        () => actions.editEventTime(
          smokeEventId: first.smokeId,
          newLocalTime: DateTime.now().add(const Duration(hours: 2)),
        ),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('deletes incorrect event', () async {
      final a = await actions.logCigarette(at: DateTime(2026, 7, 22, 8));
      await actions.logCigarette(at: DateTime(2026, 7, 22, 9));
      await actions.deleteEvent(smokeEventId: a.smokeId);
      final summary = HistoryAnalytics.summaryForDay(
        allEvents: await repository.getAllEvents(),
        localDay: DateTime(2026, 7, 22),
      );
      expect(summary?.smokeCount, 1);
    });
  });

  group('Delay durations', () {
    test('starts with intended duration', () async {
      final session = await actions.beginDelay(
        intendedDuration: const Duration(minutes: 10),
      );
      expect(session.intendedDuration, const Duration(minutes: 10));
      final active = DelaySessionResolver.resolveActive(
        await repository.getAllEvents(),
      );
      expect(active?.intendedDuration?.inMinutes, 10);
    });

    test('completed without smoking', () async {
      await actions.beginDelay(intendedDuration: const Duration(minutes: 5));
      final duration = await actions.finishDelayUrgePassed(
        at: DateTime.now().add(const Duration(minutes: 5)),
      );
      expect(duration, isNotNull);
      expect(
        DelaySessionResolver.resolveActive(await repository.getAllEvents()),
        isNull,
      );
    });

    test('delay followed by cigarette closes as smoked', () async {
      await actions.beginDelay(intendedDuration: const Duration(minutes: 15));
      final result = await actions.logCigarette();
      expect(result.closedDelayDuration, isNotNull);
      final ended = (await repository.getAllEvents())
          .where((e) => e.isDelayEnded)
          .single;
      expect(ended.payloadJson['outcome'], DelayOutcome.smoked.storageId);
    });
  });

  group('Behavior patterns', () {
    test('returns null insight without enough data', () {
      final insight = BehaviorPatternService.todayInsight(
        allEvents: const [],
        nowLocal: DateTime(2026, 7, 22, 12),
      );
      expect(insight, isNull);
    });
  });

  group('Offline repository compatibility', () {
    test('actions work against in-memory local store', () async {
      await actions.logCigarette();
      await actions.beginDelay();
      await actions.abandonDelay();
      expect(await repository.getAllEvents(), isNotEmpty);
    });
  });
}
