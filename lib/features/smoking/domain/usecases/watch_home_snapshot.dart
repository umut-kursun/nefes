import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/services/home_snapshot_builder.dart';
import 'package:nefes/features/smoking/repository/settings_repository.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'dart:async';

/// Builds the M2 home snapshot from events + settings.
class WatchHomeSnapshot {
  const WatchHomeSnapshot({
    required this.smokingRepository,
    required this.settingsRepository,
  });

  final SmokingRepository smokingRepository;
  final SettingsRepository settingsRepository;

  Stream<HomeSnapshot> call() {
    late final StreamController<HomeSnapshot> controller;
    StreamSubscription<List<SmokingLogEvent>>? eventsSub;
    StreamSubscription<AppSettings>? settingsSub;

    var latestEvents = <SmokingLogEvent>[];
    var latestSettings = const AppSettings(
      hasCompletedOnboarding: false,
      dailyTarget: 20,
    );
    var eventsReady = false;
    var settingsReady = false;

    void emit() {
      if (controller.isClosed || !eventsReady || !settingsReady) return;
      controller.add(
        HomeSnapshotBuilder.build(
          allEvents: latestEvents,
          settings: latestSettings,
          nowLocal: DateTime.now(),
        ),
      );
    }

    controller = StreamController<HomeSnapshot>(
      onListen: () {
        eventsSub = smokingRepository.watchAllEvents().listen((events) {
          latestEvents = events;
          eventsReady = true;
          emit();
        });
        settingsSub = settingsRepository.watchSettings().listen((settings) {
          latestSettings = settings;
          settingsReady = true;
          emit();
        });
      },
      onCancel: () async {
        await eventsSub?.cancel();
        await settingsSub?.cancel();
      },
    );

    return controller.stream;
  }
}
