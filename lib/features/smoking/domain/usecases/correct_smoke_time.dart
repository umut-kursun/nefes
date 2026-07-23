import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/domain/usecases/attach_smoke_trigger.dart';
import 'package:nefes/features/smoking/domain/usecases/delete_smoke.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

class CorrectSmokeTimeResult {
  const CorrectSmokeTimeResult({
    required this.previousSmokeId,
    required this.newSmokeId,
    required this.newCreatedAtUtc,
  });

  final String previousSmokeId;
  final String newSmokeId;
  final DateTime newCreatedAtUtc;
}

/// Corrects the timestamp of an existing smoke via delete + recreate.
///
/// Preserves optional trigger context when present. Rejects future times.
/// Does not interact with an active delay session.
class CorrectSmokeTime {
  const CorrectSmokeTime({
    required this.smokingRepository,
    required this.eventFactory,
    required this.deleteSmoke,
    required this.attachSmokeTrigger,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;
  final DeleteSmoke deleteSmoke;
  final AttachSmokeTrigger attachSmokeTrigger;

  Future<CorrectSmokeTimeResult> call({
    required String smokeEventId,
    required DateTime newLocalTime,
  }) async {
    final now = DateTime.now();
    if (newLocalTime.isAfter(now.add(const Duration(minutes: 1)))) {
      throw ArgumentError('Future timestamps are not allowed.');
    }

    final all = await smokingRepository.getAllEvents();
    final active = ActiveSmokeResolver.resolve(all);
    final existing = active.where((e) => e.id == smokeEventId);
    if (existing.isEmpty) {
      throw StateError('Smoke event not found or already deleted.');
    }

    final triggers = SmokeTriggerResolver.resolveMap(all);
    final previousTrigger = triggers[smokeEventId];

    await deleteSmoke(smokeEventId: smokeEventId);
    final smoke = eventFactory.createSmoke(at: newLocalTime);
    await smokingRepository.append(smoke);

    if (previousTrigger != null) {
      await attachSmokeTrigger(
        smokeEventId: smoke.id,
        trigger: previousTrigger,
      );
    }

    return CorrectSmokeTimeResult(
      previousSmokeId: smokeEventId,
      newSmokeId: smoke.id,
      newCreatedAtUtc: smoke.createdAtUtc,
    );
  }
}
