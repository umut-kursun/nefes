import 'package:nefes/core/errors/failures.dart';
import 'package:nefes/features/smoking/data/mappers/smoking_log_mapper.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_event_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:sembast/sembast.dart';

/// Local datasource wrapping Sembast. Append-only for historical events.
class SmokingLocalDataSource {
  SmokingLocalDataSource(this._database);

  final NefesLocalDatabase _database;

  Future<void> append(SmokingLogEvent event) async {
    try {
      final db = await _database.database;
      // `add` fails if the key exists — enforces append-only / no overwrite.
      await NefesStores.smokingLogs
          .record(event.id)
          .add(db, SmokingLogMapper.toRecord(event));
    } catch (e) {
      throw DatabaseFailure(e.toString());
    }
  }

  Future<void> appendAll(List<SmokingLogEvent> events) async {
    if (events.isEmpty) return;
    try {
      final db = await _database.database;
      await db.transaction((txn) async {
        for (final event in events) {
          await NefesStores.smokingLogs
              .record(event.id)
              .add(txn, SmokingLogMapper.toRecord(event));
        }
      });
    } catch (e) {
      throw DatabaseFailure(e.toString());
    }
  }

  Future<List<SmokingLogEvent>> getAllEvents() async {
    try {
      final db = await _database.database;
      final finder = Finder(sortOrders: [SortOrder('createdAtUtc')]);
      final records = await NefesStores.smokingLogs.find(db, finder: finder);
      return records.map((r) => SmokingLogMapper.fromRecord(r.value)).toList();
    } catch (e) {
      throw DatabaseFailure(e.toString());
    }
  }

  Stream<List<SmokingLogEvent>> watchAllEvents() async* {
    final db = await _database.database;
    final finder = Finder(sortOrders: [SortOrder('createdAtUtc')]);

    yield* NefesStores.smokingLogs
        .query(finder: finder)
        .onSnapshots(db)
        .map(
          (snapshots) => snapshots
              .map((s) => SmokingLogMapper.fromRecord(s.value))
              .toList(),
        );
  }

  Stream<List<SmokingLogEvent>> watchActiveSmokeEvents() {
    return watchAllEvents().map(ActiveSmokeResolver.resolve);
  }

  Future<List<SmokingLogEvent>> getSmokeEventsBetweenUtc({
    required DateTime fromUtc,
    required DateTime toUtc,
  }) async {
    final db = await _database.database;
    final finder = Finder(
      filter: Filter.and([
        Filter.equals('eventType', SmokingEventType.smoke.name),
        Filter.greaterThanOrEquals(
          'createdAtUtc',
          fromUtc.millisecondsSinceEpoch,
        ),
        Filter.lessThan('createdAtUtc', toUtc.millisecondsSinceEpoch),
      ]),
      sortOrders: [SortOrder('createdAtUtc')],
    );

    final records = await NefesStores.smokingLogs.find(db, finder: finder);
    final smokes = records
        .map((r) => SmokingLogMapper.fromRecord(r.value))
        .toList();

    // Apply deletes from full store for accuracy.
    final all = await NefesStores.smokingLogs.find(db);
    final allEvents = all
        .map((r) => SmokingLogMapper.fromRecord(r.value))
        .toList();
    final activeIds = ActiveSmokeResolver.resolve(
      allEvents,
    ).map((e) => e.id).toSet();

    return smokes.where((e) => activeIds.contains(e.id)).toList();
  }
}
