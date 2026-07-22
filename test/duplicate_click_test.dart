import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/features/smoking/data/datasources/smoking_local_data_source.dart';
import 'package:nefes/features/smoking/data/repositories/settings_repository_impl.dart';
import 'package:nefes/features/smoking/data/repositories/smoking_repository_impl.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/domain/usecases/record_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/undo_last_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/watch_home_snapshot.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_view_model.dart';
import 'package:sembast/sembast_memory.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('duplicate click while saving is ignored', () async {
    SharedPreferences.setMockInitialValues({
      'has_completed_onboarding': true,
      'daily_target': 10,
    });
    final prefs = await SharedPreferences.getInstance();
    final dbFactory = newDatabaseFactoryMemory();
    final database = NefesLocalDatabase(dbFactory);
    final repository = SmokingRepositoryImpl(SmokingLocalDataSource(database));
    final eventFactory = EventFactory();
    final settings = SettingsRepositoryImpl(prefs);

    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseFactoryProvider.overrideWithValue(dbFactory),
        smokingRepositoryProvider.overrideWithValue(repository),
        settingsRepositoryProvider.overrideWithValue(settings),
        eventFactoryProvider.overrideWithValue(eventFactory),
        recordSmokeProvider.overrideWithValue(
          RecordSmoke(
            smokingRepository: repository,
            eventFactory: eventFactory,
          ),
        ),
        undoLastSmokeProvider.overrideWithValue(
          UndoLastSmoke(
            smokingRepository: repository,
            eventFactory: eventFactory,
          ),
        ),
        watchHomeSnapshotProvider.overrideWithValue(
          WatchHomeSnapshot(
            smokingRepository: repository,
            settingsRepository: settings,
          ),
        ),
      ],
    );
    // Keep autoDispose provider alive for the duration of the test.
    final keepAlive = container.listen(homeViewModelProvider, (_, _) {});
    addTearDown(() {
      keepAlive.close();
      container.dispose();
    });
    addTearDown(database.close);

    final vm = container.read(homeViewModelProvider.notifier);

    final first = vm.onISmokedPressed();
    final second = vm.onISmokedPressed();
    await Future.wait([first, second]);

    await Future<void>.delayed(const Duration(milliseconds: 50));
    final active = await repository.watchActiveSmokeEvents().first;
    expect(active, hasLength(1));
    expect(container.read(homeViewModelProvider).isSaving, isFalse);
  });
}
