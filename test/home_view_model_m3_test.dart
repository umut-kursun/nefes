import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/data/datasources/smoking_local_data_source.dart';
import 'package:nefes/features/smoking/data/repositories/settings_repository_impl.dart';
import 'package:nefes/features/smoking/data/repositories/smoking_repository_impl.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/domain/usecases/attach_smoke_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/cancel_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/complete_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/record_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/start_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/undo_last_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/watch_home_snapshot.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_view_model.dart';
import 'package:sembast/sembast_memory.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late NefesLocalDatabase database;
  late ProviderContainer container;
  late SmokingRepositoryImpl repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'has_completed_onboarding': true,
      'daily_target': 10,
    });
    final prefs = await SharedPreferences.getInstance();
    final dbFactory = newDatabaseFactoryMemory();
    database = NefesLocalDatabase(dbFactory);
    repository = SmokingRepositoryImpl(SmokingLocalDataSource(database));
    final eventFactory = EventFactory();
    final settings = SettingsRepositoryImpl(prefs);

    container = ProviderContainer(
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
        attachSmokeTriggerProvider.overrideWithValue(
          AttachSmokeTrigger(
            smokingRepository: repository,
            eventFactory: eventFactory,
          ),
        ),
        startDelayProvider.overrideWithValue(
          StartDelay(
            smokingRepository: repository,
            eventFactory: eventFactory,
          ),
        ),
        completeDelayProvider.overrideWithValue(
          CompleteDelay(
            smokingRepository: repository,
            eventFactory: eventFactory,
          ),
        ),
        cancelDelayProvider.overrideWithValue(
          CancelDelay(
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

    final keepAlive = container.listen(homeViewModelProvider, (_, _) {});
    addTearDown(() {
      keepAlive.close();
      container.dispose();
    });
    addTearDown(database.close);

    // Allow initial snapshot hydration.
    await Future<void>.delayed(const Duration(milliseconds: 30));
  });

  test('smoke sets pending trigger without requiring selection', () async {
    final vm = container.read(homeViewModelProvider.notifier);
    await vm.onISmokedPressed();

    final state = container.read(homeViewModelProvider);
    expect(state.pendingTriggerSmokeId, isNotNull);
    expect(state.infoMessage, AppStrings.smokedSaved);
    expect(await repository.watchActiveSmokeEvents().first, hasLength(1));

    // Snapshot stream updates todayCount asynchronously.
    for (var i = 0; i < 20; i++) {
      if (container.read(homeViewModelProvider).todayCount == 1) break;
      await Future<void>.delayed(const Duration(milliseconds: 20));
    }
    expect(container.read(homeViewModelProvider).todayCount, 1);

    vm.skipTrigger();
    expect(container.read(homeViewModelProvider).pendingTriggerSmokeId, isNull);
  });

  test('selectTrigger attaches related event', () async {
    final vm = container.read(homeViewModelProvider.notifier);
    await vm.onISmokedPressed();
    final smokeId = container.read(homeViewModelProvider).pendingTriggerSmokeId!;
    await vm.selectTrigger(SmokingTrigger.coffeeTea);

    final all = await repository.getAllEvents();
    final noted = all.where((e) => e.isSmokeTriggerNoted);
    expect(noted, hasLength(1));
    expect(noted.single.parentEventId, smokeId);
    expect(noted.single.payloadJson['trigger'], 'coffee_tea');
    expect(container.read(homeViewModelProvider).pendingTriggerSmokeId, isNull);
  });

  test('delay start, complete, and cancel update home state', () async {
    final vm = container.read(homeViewModelProvider.notifier);

    await vm.onDelayPressed();
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(container.read(homeViewModelProvider).hasActiveDelay, isTrue);

    // Second start must not duplicate.
    await vm.onDelayPressed();
    expect(
      (await repository.getAllEvents()).where((e) => e.isDelayStarted),
      hasLength(1),
    );

    await vm.onUrgePassed();
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(container.read(homeViewModelProvider).hasActiveDelay, isFalse);
    expect(container.read(homeViewModelProvider).todayDelayCount, 1);

    await vm.onDelayPressed();
    await Future<void>.delayed(const Duration(milliseconds: 30));
    await vm.onCancelDelay();
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(container.read(homeViewModelProvider).hasActiveDelay, isFalse);
    // Cancelled attempts are excluded from today's resist insight count.
    expect(container.read(homeViewModelProvider).todayDelayCount, 1);
  });

  test('smoking during delay closes delay with effort celebration', () async {
    final vm = container.read(homeViewModelProvider.notifier);
    await vm.onDelayPressed();
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(container.read(homeViewModelProvider).hasActiveDelay, isTrue);
    await vm.onISmokedPressed();
    await Future<void>.delayed(const Duration(milliseconds: 50));

    final state = container.read(homeViewModelProvider);
    expect(state.hasActiveDelay, isFalse);
    expect(state.todayCount, 1);
    expect(state.infoMessage, AppStrings.smokedSaved);
    expect(state.successMoment, isNotNull);
    expect(state.successMoment!.text.toLowerCase(), isNot(contains('başarısız')));
    expect(state.pendingTriggerSmokeId, isNotNull);
  });
}
