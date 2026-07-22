import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Undoes the latest active smoke via a compensating delete event.
class UndoLastSmoke {
  const UndoLastSmoke({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<SmokingLogEvent?> call() async {
    final all = await smokingRepository.getAllEvents();
    final active = ActiveSmokeResolver.resolve(all);
    if (active.isEmpty) return null;

    final latest = active.last;
    final tombstone = eventFactory.createSmokeDeleted(parentSmokeId: latest.id);
    await smokingRepository.append(tombstone);
    return tombstone;
  }
}
