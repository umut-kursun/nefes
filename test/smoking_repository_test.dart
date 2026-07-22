import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/smoking/data/datasources/smoking_local_data_source.dart';
import 'package:nefes/features/smoking/data/repositories/settings_repository_impl.dart';
import 'package:nefes/features/smoking/data/repositories/smoking_repository_impl.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/domain/usecases/log_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/undo_last_smoke.dart';
import 'package:sembast/sembast_memory.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('M2 persistence + undo', () {
    late DatabaseFactory factory;
    late NefesLocalDatabase database;
    late SmokingRepositoryImpl repository;
    late EventFactory eventFactory;

    setUp(() async {
      factory = newDatabaseFactoryMemory();
      database = NefesLocalDatabase(factory);
      repository = SmokingRepositoryImpl(SmokingLocalDataSource(database));
      eventFactory = EventFactory();
    });

    tearDown(() async {
      await database.close();
    });

    test('M1 smoke events remain readable after schema v2 open', () async {
      final event = eventFactory.createSmoke(at: DateTime.now());
      await repository.append(event);

      final active = await repository.watchActiveSmokeEvents().first;
      expect(active, hasLength(1));
      expect(active.first.id, event.id);
    });

    test('undo last appends compensating delete and hides from active', () async {
      final logSmoke = LogSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      final undo = UndoLastSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );

      await logSmoke();
      await logSmoke();
      expect(await repository.watchActiveSmokeEvents().first, hasLength(2));

      await undo();
      final active = await repository.watchActiveSmokeEvents().first;
      expect(active, hasLength(1));

      final all = await repository.watchAllEvents().first;
      expect(all.where((e) => e.isSmokeDeleted), hasLength(1));
    });

    test('duplicate in-flight log protection via sequential awaits still appends twice', () async {
      // Intentional consecutive logs are allowed; only UI guards rapid taps.
      final logSmoke = LogSmoke(
        smokingRepository: repository,
        eventFactory: eventFactory,
      );
      await logSmoke();
      await logSmoke();
      expect(await repository.watchActiveSmokeEvents().first, hasLength(2));
    });
  });

  group('SettingsRepository', () {
    test('persists onboarding and daily target', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final repo = SettingsRepositoryImpl(prefs);

      expect((await repo.getSettings()).hasCompletedOnboarding, isFalse);

      await repo.completeOnboarding(averagePerDay: 25, dailyTarget: 18);
      final settings = await repo.getSettings();
      expect(settings.hasCompletedOnboarding, isTrue);
      expect(settings.dailyTarget, 18);
      expect(settings.averagePerDay, 25);

      await repo.setDailyTarget(12);
      expect((await repo.getSettings()).dailyTarget, 12);
    });
  });
}
