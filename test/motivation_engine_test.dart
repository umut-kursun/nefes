import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/motivation/domain/services/catalog_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/motivation_engine.dart';
import 'package:nefes/features/motivation/domain/services/personal_stats_provider.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_event_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';

void main() {
  group('MoneyCalculator', () {
    test('normalizes pack price to pricePerCigarette', () {
      expect(
        MoneyCalculator.normalizePricePerCigarette(packPrice: 120, cigarettesPerPack: 20),
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

    test('computes money not spent', () {
      expect(
        MoneyCalculator.moneyNotSpent(
          cigarettesDelayed: 1,
          pricePerCigarette: 6,
        ),
        6,
      );
    });
  });

  group('MotivationEngine', () {
    late MotivationEngine engine;

    setUp(() {
      engine = MotivationEngine(
        statsProvider: const EventPersonalStatsProvider(),
        messageProviders: const [CatalogMessageProvider()],
      );
    });

    test('opens delay session with cigarette count at start', () {
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
      expect(session.localDay, start.toLocal().day);
    });

    test('returns no message before first milestone', () {
      final start = DateTime.utc(2026, 7, 24, 10);
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );

      final evaluation = engine.evaluate(
        session: session,
        allEvents: const [],
        nowUtc: start.add(const Duration(seconds: 30)),
      );

      expect(evaluation.milestone, isNull);
      expect(evaluation.message, isNull);
    });

    test('unlocks first-minute catalog message', () {
      final start = DateTime.utc(2026, 7, 24, 10);
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );

      final evaluation = engine.evaluate(
        session: session,
        allEvents: const [],
        nowUtc: start.add(const Duration(minutes: 1)),
      );

      expect(evaluation.milestone?.id, 'm_1');
      expect(evaluation.message?.id, 'first_minute');
      expect(evaluation.message?.body, contains('İlk dakikayı'));
    });

    test('uses money-saved message when price is available', () {
      final start = DateTime.utc(2026, 7, 24, 10);
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );

      final evaluation = engine.evaluate(
        session: session,
        allEvents: const [],
        nowUtc: start.add(const Duration(minutes: 5)),
        pricePerCigarette: 6,
      );

      expect(evaluation.milestone?.id, 'm_5');
      expect(evaluation.message?.id, 'money_saved');
      expect(evaluation.message?.body, contains('₺6'));
    });

    test('reports personal record at 60 minutes', () {
      final start = DateTime.utc(2026, 7, 24, 10);
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: const [],
      );

      final evaluation = engine.evaluate(
        session: session,
        allEvents: const [],
        nowUtc: start.add(const Duration(minutes: 60)),
      );

      expect(evaluation.milestone?.id, 'm_60');
      expect(evaluation.message?.id, 'personal_record');
    });

    test('compares against prior completed delays for personal best', () {
      final start = DateTime.utc(2026, 7, 24, 12);
      final priorEnd = start.subtract(const Duration(hours: 2));
      final events = [
        _delayEnded(
          id: 'e1',
          parentId: 'old',
          at: priorEnd,
          duration: const Duration(minutes: 12),
        ),
      ];
      final session = engine.openSession(
        active: ActiveDelaySession(id: 'd1', startedAtUtc: start),
        allEvents: events,
      );

      final atTen = engine.evaluate(
        session: session,
        allEvents: events,
        nowUtc: start.add(const Duration(minutes: 10)),
      );
      expect(atTen.message?.id, isNot('best_today'));

      final atFifteen = engine.evaluate(
        session: session,
        allEvents: events,
        nowUtc: start.add(const Duration(minutes: 15)),
      );
      // 15-min milestone prefers vs_yesterday when available; otherwise fifteen_minutes.
      expect(atFifteen.milestone?.id, 'm_15');
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
