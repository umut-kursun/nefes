import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/motivation/domain/services/catalog_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/delay_session_manager.dart';
import 'package:nefes/features/motivation/domain/services/health_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/milestone_evaluator.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/motivation_engine.dart';
import 'package:nefes/features/motivation/domain/services/personal_stats_provider.dart';
import 'package:nefes/features/motivation/domain/services/personalized_message_provider.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_event_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';

void main() {
  group('MoneyCalculator', () {
    test('normalizes pack price to pricePerCigarette', () {
      expect(
        MoneyCalculator.normalizePricePerCigarette(
          packPrice: 120,
          cigarettesPerPack: 20,
        ),
        6,
      );
    });

    test('prefers explicit cigarette price', () {
      expect(
        MoneyCalculator.normalizePricePerCigarette(
          packPrice: 120,
          cigarettePrice: 7.5,
          cigarettesPerPack: 20,
        ),
        7.5,
      );
    });
  });

  group('MilestoneEvaluator', () {
    final evaluator = MilestoneEvaluator();

    test('selects highest reached without hardcoded branches', () {
      expect(evaluator.highestReached(const Duration(seconds: 30)), isNull);
      expect(evaluator.highestReached(const Duration(minutes: 1))?.id, 'm_1');
      expect(evaluator.highestReached(const Duration(minutes: 12))?.id, 'm_10');
      expect(evaluator.nextAfter(const Duration(minutes: 12))?.id, 'm_15');
    });
  });

  group('MotivationEngine / Delay Coach', () {
    late MotivationEngine engine;

    setUp(() {
      engine = MotivationEngine(
        statsProvider: const EventPersonalStatsProvider(),
        messageProviders: const [
          PersonalizedMessageProvider(),
          HealthMessageProvider(),
          CatalogMessageProvider(),
        ],
      );
    });

    test('opens delay session with count and streak fields', () {
      final start = DateTime.utc(2026, 7, 24, 10);
      final events = [
        _smoke(id: 's1', at: start.subtract(const Duration(hours: 1))),
        _smoke(id: 's2', at: start.subtract(const Duration(minutes: 10))),
      ];

      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: events,
      );

      expect(session.sessionId, 'd1');
      expect(session.cigaretteCountAtStart, 2);
      expect(session.completedDelaysToday, 0);
    });

    test('shows pre-milestone coach message before first minute', () {
      final start = DateTime.utc(2026, 7, 24, 10);
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );

      final evaluation = engine.evaluate(
        session: session,
        allEvents: const [],
        nowUtc: start.add(const Duration(seconds: 20)),
      );

      expect(evaluation.milestone, isNull);
      expect(evaluation.message?.id, 'pre_milestone');
      expect(evaluation.moneyCaption, isNull);
    });

    test('session money is one cigarette at configured price', () {
      final start = DateTime.utc(2026, 7, 24, 10);
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );

      final evaluation = engine.evaluate(
        session: session,
        allEvents: const [],
        nowUtc: start.add(const Duration(minutes: 1)),
        pricePerCigarette: 6,
      );

      expect(evaluation.milestone?.id, 'm_1');
      expect(evaluation.message?.id, 'first_minute');
      expect(evaluation.moneyCaption, contains('Bu oturum tahmini'));
      expect(evaluation.moneyCaption, contains('₺6'));
    });

    test('encouragement appears at three minutes', () {
      final start = DateTime.utc(2026, 7, 24, 10);
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );

      final evaluation = engine.evaluate(
        session: session,
        allEvents: const [],
        nowUtc: start.add(const Duration(minutes: 3)),
      );

      expect(evaluation.milestone?.id, 'm_3');
      expect(evaluation.message?.id, 'urge_fades');
    });

    test('today savings use urge-passed count only', () {
      final start = DateTime.utc(2026, 7, 24, 12);
      final earlier = start.subtract(const Duration(hours: 2));
      final events = [
        _delayEnded(
          id: 'e1',
          parentId: 'old',
          at: earlier,
          duration: const Duration(minutes: 8),
        ),
      ];
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: events,
      );
      final context = engine.buildContext(
        session: session,
        allEvents: events,
        nowUtc: start.add(const Duration(seconds: 10)),
        pricePerCigarette: 7,
      );

      expect(context.moneySaved, isNull);
      expect(context.moneySavedToday, 7);
    });

    test('celebrates effort without framing failure', () {
      final now = DateTime(2026, 7, 24, 12);
      final yesterday = now.subtract(const Duration(days: 1));
      final events = [
        _delayEnded(
          id: 'e1',
          parentId: 'old',
          at: yesterday,
          duration: const Duration(minutes: 7),
        ),
      ];

      final celebration = engine.celebrateEffort(
        resisted: const Duration(minutes: 18),
        allEvents: events,
        nowLocal: now,
      );

      expect(celebration.resisted.inMinutes, 18);
      expect(celebration.yesterdayBest?.inMinutes, 7);
      expect(celebration.improvement?.inMinutes, 11);
      expect(celebration.message, contains('18 dakika'));
      expect(celebration.message.toLowerCase(), isNot(contains('başarısız')));
    });
  });

  group('DelaySessionManager', () {
    test('keeps coaching messages across milestones', () {
      final manager = DelaySessionManager(engine: MotivationEngine());
      final start = DateTime.utc(2026, 7, 24, 10);
      manager.open(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );

      final at1 = manager.evaluate(
        allEvents: const [],
        nowUtc: start.add(const Duration(minutes: 1)),
        pricePerCigarette: 6,
      );
      final at5 = manager.evaluate(
        allEvents: const [],
        nowUtc: start.add(const Duration(minutes: 5)),
        pricePerCigarette: 6,
      );

      expect(at1?.message, isNotNull);
      expect(at5?.message?.id, 'health_waiting_success');
      expect(at1!.moneyCaption, contains('Bu oturum tahmini'));
    });
  });
}

SmokingLogEvent _smoke({required String id, required DateTime at}) {
  final local = at.toLocal();
  return SmokingLogEvent(
    id: id,
    createdAtUtc: at,
    localDay: local.day,
    localMonth: local.month,
    localYear: local.year,
    localHour: local.hour,
    localMinute: local.minute,
    localWeekday: local.weekday,
    timezone: 'UTC',
    utcOffsetMinutes: local.timeZoneOffset.inMinutes,
    eventType: SmokingEventType.smoke,
    source: EventSource.manual,
    clientId: 'test',
    syncStatus: SyncStatus.local,
    schemaVersion: 1,
    payloadJson: const {'v': 1},
    insertedAtUtc: at,
    habitType: HabitType.smoking,
  );
}

SmokingLogEvent _delayEnded({
  required String id,
  required String parentId,
  required DateTime at,
  required Duration duration,
}) {
  final local = at.toLocal();
  return SmokingLogEvent(
    id: id,
    createdAtUtc: at,
    localDay: local.day,
    localMonth: local.month,
    localYear: local.year,
    localHour: local.hour,
    localMinute: local.minute,
    localWeekday: local.weekday,
    timezone: 'UTC',
    utcOffsetMinutes: local.timeZoneOffset.inMinutes,
    eventType: SmokingEventType.delayEnded,
    parentEventId: parentId,
    source: EventSource.manual,
    clientId: 'test',
    syncStatus: SyncStatus.local,
    schemaVersion: 1,
    payloadJson: {
      'v': 1,
      'outcome': DelayOutcome.completed.storageId,
      'durationMs': duration.inMilliseconds,
    },
    insertedAtUtc: at,
    habitType: HabitType.smoking,
  );
}
