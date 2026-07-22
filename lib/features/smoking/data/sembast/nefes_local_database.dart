import 'package:sembast/sembast.dart';

/// Opens the versioned NEFES Sembast database.
///
/// Schema migrations run in [onVersionChanged]. Domain code must not import this.
class NefesLocalDatabase {
  NefesLocalDatabase(this._factory);

  static const String dbName = 'nefes.db';

  /// v1: smoking_logs baseline (M1)
  /// v2: smokeDeleted (M2)
  /// v3: smokeTriggerNoted + delayStarted/delayEnded (M3) — same store, no wipe
  static const int schemaVersion = 3;

  final DatabaseFactory _factory;
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
      // Existing smoke rows remain intact with no trigger.
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
}
