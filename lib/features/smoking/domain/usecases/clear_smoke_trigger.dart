import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Clears trigger context for a smoke (latest annotation wins as cleared).
class ClearSmokeTrigger {
  const ClearSmokeTrigger({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<SmokingLogEvent> call({required String smokeEventId}) async {
    final cleared = eventFactory.createSmokeTriggerCleared(
      parentSmokeId: smokeEventId,
    );
    await smokingRepository.append(cleared);
    return cleared;
  }
}
