import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Starts a resist/delay session, or returns the existing active one.
class StartDelay {
  const StartDelay({
    required this.smokingRepository,
    required this.eventFactory,
  });

  final SmokingRepository smokingRepository;
  final EventFactory eventFactory;

  Future<ActiveDelaySession> call({DateTime? at}) async {
    final all = await smokingRepository.getAllEvents();
    final existing = DelaySessionResolver.resolveActive(all);
    if (existing != null) return existing;

    final started = eventFactory.createDelayStarted(at: at);
    await smokingRepository.append(started);
    return ActiveDelaySession(
      id: started.id,
      startedAtUtc: started.createdAtUtc,
    );
  }
}
