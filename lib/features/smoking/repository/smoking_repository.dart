import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';

/// Abstract smoking repository — UI/domain never see Sembast.
abstract class SmokingRepository {
  /// Appends an immutable event. Never overwrites historical rows.
  Future<void> append(SmokingLogEvent event);

  /// Appends multiple events atomically (same transaction).
  Future<void> appendAll(List<SmokingLogEvent> events);

  /// One-shot read of all events (prefer over `watchAllEvents().first`).
  Future<List<SmokingLogEvent>> getAllEvents();

  /// Full replace used only by validated backup import.
  Future<void> replaceAllEvents(List<SmokingLogEvent> events);

  /// Watches all events (smoke + related), oldest → newest ready.
  Stream<List<SmokingLogEvent>> watchAllEvents();

  /// Active smoke events only (deletes applied).
  Stream<List<SmokingLogEvent>> watchActiveSmokeEvents();

  Future<List<SmokingLogEvent>> getSmokeEventsBetweenUtc({
    required DateTime fromUtc,
    required DateTime toUtc,
  });
}
