import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Soft-deletes any active smoke by id (compensating event).
class DeleteSmoke {
  const DeleteSmoke({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<SmokingLogEvent?> call({required String smokeEventId}) async {
    final all = await smokingRepository.getAllEvents();
    final active = ActiveSmokeResolver.resolve(all);
    final match = active.where((e) => e.id == smokeEventId);
    if (match.isEmpty) return null;

    final tombstone = eventFactory.createSmokeDeleted(
      parentSmokeId: smokeEventId,
      reason: 'user_delete',
    );
    await smokingRepository.append(tombstone);
    return tombstone;
  }
}
