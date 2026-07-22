import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/ports/ai_coach_port.dart';
import 'package:nefes/core/ports/export_port.dart';
import 'package:nefes/core/ports/haptic_port.dart';
import 'package:nefes/core/ports/sync_port.dart';
import 'package:nefes/features/habit/data/repositories/target_history_repository_impl.dart';
import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/services/backup_service.dart';
import 'package:nefes/features/habit/repository/target_history_repository.dart';
import 'package:nefes/features/smoking/data/datasources/smoking_local_data_source.dart';
import 'package:nefes/features/smoking/data/repositories/settings_repository_impl.dart';
import 'package:nefes/features/smoking/data/repositories/smoking_repository_impl.dart';
import 'package:nefes/features/smoking/data/sembast/nefes_local_database.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/domain/usecases/attach_smoke_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/cancel_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/complete_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/log_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/record_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/start_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/undo_last_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/watch_home_snapshot.dart';
import 'package:nefes/features/smoking/repository/settings_repository.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';
import 'package:sembast_web/sembast_web.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('sharedPreferencesProvider must be overridden');
});

final databaseFactoryProvider = Provider<DatabaseFactory>((ref) {
  return databaseFactoryWeb;
});

final nefesLocalDatabaseProvider = Provider<NefesLocalDatabase>((ref) {
  return NefesLocalDatabase(
    ref.watch(databaseFactoryProvider),
    prefs: ref.watch(sharedPreferencesProvider),
  );
});

final smokingLocalDataSourceProvider = Provider<SmokingLocalDataSource>((ref) {
  return SmokingLocalDataSource(ref.watch(nefesLocalDatabaseProvider));
});

final smokingRepositoryProvider = Provider<SmokingRepository>((ref) {
  return SmokingRepositoryImpl(ref.watch(smokingLocalDataSourceProvider));
});

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepositoryImpl(ref.watch(sharedPreferencesProvider));
});

final targetHistoryRepositoryProvider =
    Provider<TargetHistoryRepository>((ref) {
  return TargetHistoryRepositoryImpl(ref.watch(nefesLocalDatabaseProvider));
});

final backupServiceProvider = Provider<BackupService>((ref) {
  return BackupService(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    settingsRepository: ref.watch(settingsRepositoryProvider),
    targetHistoryRepository: ref.watch(targetHistoryRepositoryProvider),
  );
});

final eventFactoryProvider = Provider<EventFactory>((ref) {
  return EventFactory();
});

final logSmokeProvider = Provider<LogSmoke>((ref) {
  return LogSmoke(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    eventFactory: ref.watch(eventFactoryProvider),
  );
});

final recordSmokeProvider = Provider<RecordSmoke>((ref) {
  return RecordSmoke(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    eventFactory: ref.watch(eventFactoryProvider),
  );
});

final attachSmokeTriggerProvider = Provider<AttachSmokeTrigger>((ref) {
  return AttachSmokeTrigger(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    eventFactory: ref.watch(eventFactoryProvider),
  );
});

final startDelayProvider = Provider<StartDelay>((ref) {
  return StartDelay(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    eventFactory: ref.watch(eventFactoryProvider),
  );
});

final completeDelayProvider = Provider<CompleteDelay>((ref) {
  return CompleteDelay(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    eventFactory: ref.watch(eventFactoryProvider),
  );
});

final cancelDelayProvider = Provider<CancelDelay>((ref) {
  return CancelDelay(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    eventFactory: ref.watch(eventFactoryProvider),
  );
});

final undoLastSmokeProvider = Provider<UndoLastSmoke>((ref) {
  return UndoLastSmoke(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    eventFactory: ref.watch(eventFactoryProvider),
  );
});

final watchHomeSnapshotProvider = Provider<WatchHomeSnapshot>((ref) {
  return WatchHomeSnapshot(
    smokingRepository: ref.watch(smokingRepositoryProvider),
    settingsRepository: ref.watch(settingsRepositoryProvider),
  );
});

final hapticPortProvider = Provider<HapticPort>((ref) {
  return const NoopHapticPort();
});

final syncPortProvider = Provider<SyncPort>((ref) {
  return const NoopSyncPort();
});

final exportPortProvider = Provider<ExportPort>((ref) {
  return const NoopExportPort();
});

final aiCoachPortProvider = Provider<AiCoachPort>((ref) {
  return const NoopAiCoachPort();
});

/// Live stream of all habit events — used by History and Insights screens.
final allSmokingEventsProvider = StreamProvider<List<SmokingLogEvent>>((ref) {
  return ref.watch(smokingRepositoryProvider).watchAllEvents();
});

/// Live stream of app settings — used outside the Home flow (Settings, day detail).
final appSettingsStreamProvider = StreamProvider<AppSettings>((ref) {
  return ref.watch(settingsRepositoryProvider).watchSettings();
});

/// Live stream of the daily-target history — used to resolve past targets.
final targetHistoryStreamProvider = StreamProvider<List<DailyTargetPeriod>>((
  ref,
) {
  return ref.watch(targetHistoryRepositoryProvider).watchAll();
});
