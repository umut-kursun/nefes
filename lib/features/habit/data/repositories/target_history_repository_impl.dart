import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/habit/repository/target_history_repository.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:sembast/sembast.dart';

class TargetHistoryRepositoryImpl implements TargetHistoryRepository {
  TargetHistoryRepositoryImpl(this._database);

  final NefesLocalDatabase _database;

  @override
  Future<List<DailyTargetPeriod>> getAll({
    HabitType habitType = HabitType.smoking,
  }) async {
    final db = await _database.database;
    final records = await NefesStores.dailyTargets.find(db);
    return records
        .map((r) => DailyTargetPeriod.fromRecord(r.value))
        .where((p) => p.habitType == habitType.storageId)
        .toList()
      ..sort((a, b) => a.effectiveFromLocalDate.compareTo(b.effectiveFromLocalDate));
  }

  @override
  Stream<List<DailyTargetPeriod>> watchAll({
    HabitType habitType = HabitType.smoking,
  }) async* {
    final db = await _database.database;
    yield* NefesStores.dailyTargets
        .query()
        .onSnapshots(db)
        .map(
          (snaps) => snaps
              .map((s) => DailyTargetPeriod.fromRecord(s.value))
              .where((p) => p.habitType == habitType.storageId)
              .toList()
            ..sort(
              (a, b) =>
                  a.effectiveFromLocalDate.compareTo(b.effectiveFromLocalDate),
            ),
        );
  }

  @override
  Future<void> appendPeriod(DailyTargetPeriod period) async {
    final db = await _database.database;
    await NefesStores.dailyTargets.record(period.id).add(db, period.toRecord());
  }

  @override
  Future<void> replaceAll(List<DailyTargetPeriod> periods) async {
    final db = await _database.database;
    await db.transaction((txn) async {
      await NefesStores.dailyTargets.delete(txn);
      for (final period in periods) {
        await NefesStores.dailyTargets
            .record(period.id)
            .put(txn, period.toRecord());
      }
    });
  }
}
