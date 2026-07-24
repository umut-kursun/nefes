import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/motivation/domain/entities/progress_card.dart';
import 'package:nefes/features/motivation/domain/services/catalog_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/delay_session_manager.dart';
import 'package:nefes/features/motivation/domain/services/milestone_evaluator.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/motivation_engine.dart';
import 'package:nefes/features/motivation/domain/services/personal_stats_provider.dart';
import 'package:nefes/features/motivation/domain/services/personalized_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/progress_card_provider.dart';
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
          CatalogMessageProvider(),
        ],
        progressCardProvider: const CatalogProgressCardProvider(),
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
      expect(evaluation.cards, isNotEmpty);
      expect(
        evaluation.cards.any((c) => c.kind == ProgressCardKind.nextTarget),
        isTrue,
      );
    });

    test('unlocks first-minute message and progress cards', () {
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
      expect(evaluation.cards.length, lessThanOrEqualTo(2));
      expect(
        evaluation.cards.any((c) => c.kind == ProgressCardKind.moneySaved),
        isTrue,
      );
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
      expect(celebration.message.toLowerCase(), isNot(contains('kaybettin')));
    });
  });

  group('DelaySessionManager', () {
    test('rotates progress cards across milestones', () {
      final manager = DelaySessionManager(
        engine: MotivationEngine(
          progressCardProvider: const CatalogProgressCardProvider(maxCards: 2),
        ),
      );
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
      expect(at5?.message, isNotNull);
      expect(at1!.cards, isNotEmpty);
      expect(at5!.cards, isNotEmpty);
    });
  });

  group('ProgressCardProvider', () {
    test('prefers kinds not recently shown', () {
      final provider = const CatalogProgressCardProvider(maxCards: 2);
      final engine = MotivationEngine();
      final start = DateTime.utc(2026, 7, 24, 10);
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );
      final context = engine.buildContext(
        session: session,
        allEvents: const [],
        nowUtc: start.add(const Duration(minutes: 10)),
        pricePerCigarette: 6,
        nextMilestone: engine.milestoneEvaluator.nextAfter(
          const Duration(minutes: 10),
        ),
      );

      final cards = provider.cardsFor(
        context: context,
        milestone: engine.milestoneEvaluator.highestReached(
          const Duration(minutes: 10),
        ),
        recentlyShown: {ProgressCardKind.moneySaved, ProgressCardKind.timeSmokeFree},
      );

      expect(cards, isNotEmpty);
      expect(cards.first.kind, isNot(ProgressCardKind.moneySaved));
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
