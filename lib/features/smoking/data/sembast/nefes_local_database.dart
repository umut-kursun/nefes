import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:sembast/sembast.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Opens the versioned NEFES Sembast database.
///
/// Schema migrations run in [onVersionChanged]. Domain code must not import this.
class NefesLocalDatabase {
  NefesLocalDatabase(this._factory, {SharedPreferences? prefs})
      : _prefs = prefs;

  static const String dbName = 'nefes.db';

  /// v1: smoking_logs baseline (M1)
  /// v2: smokeDeleted (M2)
  /// v3: smokeTriggerNoted + delayStarted/delayEnded (M3)
  /// v4: habitType on events + daily_targets store (multi-habit readiness)
  static const int schemaVersion = 4;

  final DatabaseFactory _factory;
  final SharedPreferences? _prefs;
  Database? _database;

  Future<Database> get database async {
    return _database ??= await _factory.openDatabase(
      dbName,
      version: schemaVersion,
      onVersionChanged: _onVersionChanged,
    );
  }

  Future<void> _onVersionChanged(
    Database db,
    int oldVersion,
    int newVersion,
  ) async {
    if (oldVersion < 1 && newVersion >= 1) {
      // Schema v1 baseline — stores created lazily.
    }
    if (oldVersion < 2 && newVersion >= 2) {
      // M2: smokeDeleted event type — no row rewrite.
    }
    if (oldVersion < 3 && newVersion >= 3) {
      // M3: trigger annotations + delay sessions as new event types.
    }
    if (oldVersion < 4 && newVersion >= 4) {
      await _migrateToV4(db);
    }
  }

  Future<void> _migrateToV4(Database db) async {
    // Backfill habitType=smoking on all existing events (no wipe).
    final finder = Finder();
    final records = await NefesStores.smokingLogs.find(db, finder: finder);
    await db.transaction((txn) async {
      for (final snap in records) {
        final value = Map<String, Object?>.from(snap.value);
        value['habitType'] ??= HabitType.smoking.storageId;
        await NefesStores.smokingLogs.record(snap.key).put(txn, value);
      }
    });

    // Seed target history from current SharedPreferences target if empty.
    final existingTargets = await NefesStores.dailyTargets.find(db);
    if (existingTargets.isEmpty) {
      final now = DateTime.now();
      final target = _prefs?.getInt('daily_target') ?? 20;
      final period = DailyTargetPeriod(
        id: const Uuid().v4(),
        habitType: HabitType.smoking.storageId,
        target: target,
        effectiveFromLocalYear: now.year,
        effectiveFromLocalMonth: now.month,
        effectiveFromLocalDay: 1,
        createdAtUtc: DateTime.now().toUtc(),
      );
      await NefesStores.dailyTargets.record(period.id).put(db, period.toRecord());
    }
  }

  Future<void> close() async {
    await _database?.close();
    _database = null;
  }
}

/// Sembast store names.
abstract final class NefesStores {
  static final smokingLogs = stringMapStoreFactory.store('smoking_logs');
  static final dailyTargets = stringMapStoreFactory.store('daily_targets');
}
