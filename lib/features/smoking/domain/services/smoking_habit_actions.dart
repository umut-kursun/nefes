import 'package:nefes/core/ports/product_telemetry_port.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/attach_smoke_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/cancel_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/clear_smoke_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/complete_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/correct_smoke_time.dart';
import 'package:nefes/features/smoking/domain/usecases/delete_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/record_smoke.dart';
import 'package:nefes/features/smoking/domain/usecases/start_delay.dart';
import 'package:nefes/features/smoking/domain/usecases/undo_last_smoke.dart';

/// Platform-agnostic application actions for the smoking habit module.
///
/// Flutter Web UI, future Android home-screen widgets, notification actions,
/// and quick settings should all invoke this layer (or the underlying use
/// cases) — never duplicate persistence logic in platform adapters.
class SmokingHabitActions {
  const SmokingHabitActions({
    required this.recordSmoke,
    required this.attachSmokeTrigger,
    required this.clearSmokeTrigger,
    required this.startDelay,
    required this.completeDelay,
    required this.cancelDelay,
    required this.undoLastSmoke,
    required this.deleteSmoke,
    required this.correctSmokeTime,
    required this.telemetry,
  });

  final RecordSmoke recordSmoke;
  final AttachSmokeTrigger attachSmokeTrigger;
  final ClearSmokeTrigger clearSmokeTrigger;
  final StartDelay startDelay;
  final CompleteDelay completeDelay;
  final CancelDelay cancelDelay;
  final UndoLastSmoke undoLastSmoke;
  final DeleteSmoke deleteSmoke;
  final CorrectSmokeTime correctSmokeTime;
  final ProductTelemetryPort telemetry;

  /// Primary capture — always means "now" unless [at] is supplied (retroactive).
  Future<RecordSmokeResult> logCigarette({
    DateTime? at,
    bool retroactive = false,
  }) async {
    final result = await recordSmoke(at: at);
    telemetry.track(
      retroactive
          ? TelemetryEvents.retroactiveLogCreated
          : TelemetryEvents.cigaretteLogged,
      {
        'smokeId': result.smokeId,
        if (retroactive) 'atUtc': result.smokeCreatedAtUtc.toIso8601String(),
      },
    );
    return result;
  }

  Future<void> updateEventContext({
    required String smokeEventId,
    required SmokingTrigger trigger,
  }) async {
    await attachSmokeTrigger(
      smokeEventId: smokeEventId,
      trigger: trigger,
    );
    telemetry.track(TelemetryEvents.triggerAdded, {
      'smokeId': smokeEventId,
      'trigger': trigger.storageId,
    });
  }

  Future<void> removeEventContext({required String smokeEventId}) async {
    await clearSmokeTrigger(smokeEventId: smokeEventId);
    telemetry.track(TelemetryEvents.triggerCleared, {'smokeId': smokeEventId});
  }

  Future<ActiveDelaySession> beginDelay({
    Duration? intendedDuration,
    DateTime? at,
  }) async {
    final session = await startDelay(
      at: at,
      intendedDuration: intendedDuration,
    );
    telemetry.track(TelemetryEvents.delayStarted, {
      'delayId': session.id,
      if (intendedDuration != null)
        'intendedDurationMs': intendedDuration.inMilliseconds,
    });
    return session;
  }

  Future<Duration?> finishDelayUrgePassed({DateTime? at}) async {
    final duration = await completeDelay(at: at);
    telemetry.track(TelemetryEvents.delayCompleted, {
      if (duration != null) 'durationMs': duration.inMilliseconds,
      'outcome': 'completed',
    });
    return duration;
  }

  Future<void> abandonDelay({DateTime? at}) async {
    await cancelDelay(at: at);
    telemetry.track(TelemetryEvents.delayCancelled);
  }

  Future<SmokingLogEvent?> undoLatest() async {
    final tombstone = await undoLastSmoke();
    if (tombstone != null) {
      telemetry.track(TelemetryEvents.undoLatest);
    }
    return tombstone;
  }

  Future<void> deleteEvent({required String smokeEventId}) async {
    await deleteSmoke(smokeEventId: smokeEventId);
    telemetry.track(TelemetryEvents.eventDeleted, {'smokeId': smokeEventId});
  }

  Future<CorrectSmokeTimeResult> editEventTime({
    required String smokeEventId,
    required DateTime newLocalTime,
  }) async {
    final result = await correctSmokeTime(
      smokeEventId: smokeEventId,
      newLocalTime: newLocalTime,
    );
    telemetry.track(TelemetryEvents.eventTimeCorrected, {
      'smokeId': smokeEventId,
      'newSmokeId': result.newSmokeId,
    });
    return result;
  }
}
