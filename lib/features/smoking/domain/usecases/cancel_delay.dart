import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Cancels an accidental delay — not counted as successful resistance.
class CancelDelay {
  const CancelDelay({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<void> call({DateTime? at}) async {
    final now = at ?? DateTime.now();
    final all = await smokingRepository.getAllEvents();
    final active = DelaySessionResolver.resolveActive(all);
    if (active == null) return;

    final duration = now.toUtc().difference(active.startedAtUtc);
    final ended = eventFactory.createDelayEnded(
      delayStartedId: active.id,
      outcome: DelayOutcome.cancelled,
      duration: duration.isNegative ? Duration.zero : duration,
      at: now,
    );
    await smokingRepository.append(ended);
  }
}
