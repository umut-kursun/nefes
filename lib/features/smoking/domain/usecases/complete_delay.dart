import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Ends the active delay as a successful resist (urge passed).
class CompleteDelay {
  const CompleteDelay({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<Duration?> call({DateTime? at}) async {
    final now = at ?? DateTime.now();
    final all = await smokingRepository.getAllEvents();
    final active = DelaySessionResolver.resolveActive(all);
    if (active == null) return null;

    final endInstant = now.toUtc();
    final duration = endInstant.difference(active.startedAtUtc);
    final ended = eventFactory.createDelayEnded(
      delayStartedId: active.id,
      outcome: DelayOutcome.completed,
      duration: duration.isNegative ? Duration.zero : duration,
      at: now,
    );
    await smokingRepository.append(ended);
    return duration.isNegative ? Duration.zero : duration;
  }
}
