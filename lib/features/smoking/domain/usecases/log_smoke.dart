import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Use case: one-touch smoke log (simple path without delay coordination).
/// Prefer [RecordSmoke] from the Home flow.
class LogSmoke {
  const LogSmoke({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<SmokingLogEvent> call({DateTime? at}) async {
    final event = eventFactory.createSmoke(at: at);
    await smokingRepository.append(event);
    return event;
  }
}
