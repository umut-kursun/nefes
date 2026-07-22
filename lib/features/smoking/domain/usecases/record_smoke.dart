import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Records a smoke; closes an active delay as "smoked" when present.
class RecordSmoke {
  const RecordSmoke({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<RecordSmokeResult> call({DateTime? at}) async {
    final now = at ?? DateTime.now();
    final all = await smokingRepository.getAllEvents();
    final activeDelay = DelaySessionResolver.resolveActive(all);
    final smoke = eventFactory.createSmoke(at: now);

    if (activeDelay == null) {
      await smokingRepository.append(smoke);
      return RecordSmokeResult(
        smokeId: smoke.id,
        smokeCreatedAtUtc: smoke.createdAtUtc,
      );
    }

    final duration = smoke.createdAtUtc.difference(activeDelay.startedAtUtc);
    final ended = eventFactory.createDelayEnded(
      delayStartedId: activeDelay.id,
      outcome: DelayOutcome.smoked,
      duration: duration,
      relatedSmokeId: smoke.id,
      at: now,
    );

    await smokingRepository.appendAll([smoke, ended]);
    return RecordSmokeResult(
      smokeId: smoke.id,
      smokeCreatedAtUtc: smoke.createdAtUtc,
      closedDelayDuration: duration.isNegative ? Duration.zero : duration,
    );
  }
}
