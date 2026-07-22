import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Attaches an optional trigger as a related immutable event (does not rewrite smoke).
class AttachSmokeTrigger {
  const AttachSmokeTrigger({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<SmokingLogEvent> call({
    required String smokeEventId,
    required SmokingTrigger trigger,
  }) async {
    final noted = eventFactory.createSmokeTriggerNoted(
      parentSmokeId: smokeEventId,
      trigger: trigger,
    );
    await smokingRepository.append(noted);
    return noted;
  }
}
