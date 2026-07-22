import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/habit/domain/services/backup_service.dart';
import 'package:nefes/features/habit/domain/services/history_analytics.dart';
import 'package:nefes/features/habit/domain/services/insights_engine.dart';
import 'package:nefes/features/habit/domain/services/target_history_resolver.dart';
import 'package:nefes/features/smoking/data/datasources/smoking_local_data_source.dart';
import 'package:nefes/features/smoking/data/repositories/smoking_repository_impl.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:sembast/sembast_memory.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('HabitType', () {
    test('defaults unknown/null to smoking', () {
      expect(HabitType.fromStorage(null), HabitType.smoking);
      expect(HabitType.fromStorage(''), HabitType.smoking);
      expect(HabitType.fromStorage('alcohol'), HabitType.smoking);
    });

    test('new events include habitType smoking', () async {
      SharedPreferences.setMockInitialValues({'daily_target': 18});
      final prefs = await SharedPreferences.getInstance();
      final db = NefesLocalDatabase(newDatabaseFactoryMemory(), prefs: prefs);
      final repo = SmokingRepositoryImpl(SmokingLocalDataSource(db));
      final factory = EventFactory();

      await repo.append(factory.createSmoke(at: DateTime(2026, 7, 20, 10)));

      final all = await repo.getAllEvents();
      expect(all.single.habitType, HabitType.smoking);
      await db.close();
    });
  });

  group('HistoryAnalytics', () {
    test('groups by local day with average interval', () {
      final factory = EventFactory();
      final a = factory.createSmoke(at: DateTime(2026, 7, 22, 8));
      final b = factory.createSmoke(at: DateTime(2026, 7, 22, 10));
      final c = factory.createSmoke(at: DateTime(2026, 7, 21, 9));

      final days = HistoryAnalytics.buildDaySummaries(allEvents: [a, b, c]);
      expect(days.first.localDate, DateTime(2026, 7, 22));
      expect(days.first.smokeCount, 2);
      expect(days.first.averageInterval, const Duration(hours: 2));
      expect(days.last.smokeCount, 1);
    });

    test('leap year day is valid', () {
      final factory = EventFactory();
      final smoke = factory.createSmoke(at: DateTime(2024, 2, 29, 12));
      final summary = HistoryAnalytics.summaryForDay(
        allEvents: [smoke],
        localDay: DateTime(2024, 2, 29),
      );
      expect(summary?.smokeCount, 1);
      expect(summary?.localDate, DateTime(2024, 2, 29));
    });
  });

  group('TargetHistoryResolver', () {
    test('picks effective target for historical day', () {
      final periods = [
        DailyTargetPeriod(
          id: '1',
          habitType: 'smoking',
          target: 25,
          effectiveFromLocalYear: 2026,
          effectiveFromLocalMonth: 7,
          effectiveFromLocalDay: 1,
          createdAtUtc: DateTime.utc(2026, 7, 1),
        ),
        DailyTargetPeriod(
          id: '2',
          habitType: 'smoking',
          target: 18,
          effectiveFromLocalYear: 2026,
          effectiveFromLocalMonth: 7,
          effectiveFromLocalDay: 21,
          createdAtUtc: DateTime.utc(2026, 7, 21),
        ),
      ];
      expect(
        TargetHistoryResolver.targetForLocalDay(
          periods: periods,
          localDay: DateTime(2026, 7, 10),
          fallbackTarget: 20,
        ),
        25,
      );
      expect(
        TargetHistoryResolver.targetForLocalDay(
          periods: periods,
          localDay: DateTime(2026, 7, 22),
          fallbackTarget: 20,
        ),
        18,
      );
    });
  });

  group('InsightsEngine', () {
    test('builds averages and does not invent when empty', () {
      final empty = InsightsEngine.build(
        allEvents: const [],
        nowLocal: DateTime(2026, 7, 22),
        period: InsightsPeriod.days7,
      );
      expect(empty.totalSmokes, 0);
      expect(empty.insights, isEmpty);

      final factory = EventFactory();
      final smokeA = factory.createSmoke(at: DateTime(2026, 7, 20, 10));
      final smokeB = factory.createSmoke(at: DateTime(2026, 7, 21, 11));
      final smokeC = factory.createSmoke(at: DateTime(2026, 7, 22, 9));
      final noted = factory.createSmokeTriggerNoted(
        parentSmokeId: smokeC.id,
        trigger: SmokingTrigger.coffeeTea,
        at: DateTime(2026, 7, 22, 9, 1),
      );
      final snap = InsightsEngine.build(
        allEvents: [smokeA, smokeB, smokeC, noted],
        nowLocal: DateTime(2026, 7, 22, 18),
        period: InsightsPeriod.days7,
      );
      expect(snap.totalSmokes, 3);
      expect(snap.dailyAverage, greaterThan(0));
      expect(snap.insights, isNotEmpty);
    });
  });

  group('BackupService validation', () {
    test('rejects invalid backup', () {
      expect(
        () => NefesBackupDocument.parse('{"nope":true}'),
        throwsA(isA<FormatException>()),
      );
      expect(
        () => NefesBackupDocument.parse('not-json'),
        throwsA(anything),
      );
    });
  });
}
