import 'package:nefes/features/motivation/domain/entities/delay_session.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';

/// Pluggable personal-stats source for the motivation engine.
///
/// Future personalized providers can wrap or replace this implementation.
abstract class PersonalStatsProvider {
  DelaySession buildSession({
    required String sessionId,
    required DateTime startedAtUtc,
    required List<SmokingLogEvent> allEvents,
    Duration? intendedDuration,
  });

  int cigaretteCountAt({
    required List<SmokingLogEvent> allEvents,
    required DateTime atUtc,
    required int localYear,
    required int localMonth,
    required int localDay,
  });

  Duration? longestCompletedDelay({
    required List<SmokingLogEvent> allEvents,
    DateTime? onlyLocalDay,
    String? excludingSessionId,
  });

  Duration? averageCompletedDelay({
    required List<SmokingLogEvent> allEvents,
    DateTime? onlyLocalDay,
    String? excludingSessionId,
  });

  int activeSmokeCountOnDay({
    required List<SmokingLogEvent> allEvents,
    required int localYear,
    required int localMonth,
    required int localDay,
    DateTime? atOrBeforeLocal,
  });
}

/// Default stats derived from the existing smoking event stream.
class EventPersonalStatsProvider implements PersonalStatsProvider {
  const EventPersonalStatsProvider();

  @override
  DelaySession buildSession({
    required String sessionId,
    required DateTime startedAtUtc,
    required List<SmokingLogEvent> allEvents,
    Duration? intendedDuration,
  }) {
    final local = startedAtUtc.toLocal();
    final count = cigaretteCountAt(
      allEvents: allEvents,
      atUtc: startedAtUtc,
      localYear: local.year,
      localMonth: local.month,
      localDay: local.day,
    );
    return DelaySession(
      sessionId: sessionId,
      startedAtUtc: startedAtUtc,
      cigaretteCountAtStart: count,
      localYear: local.year,
      localMonth: local.month,
      localDay: local.day,
      intendedDuration: intendedDuration,
    );
  }

  @override
  int cigaretteCountAt({
    required List<SmokingLogEvent> allEvents,
    required DateTime atUtc,
    required int localYear,
    required int localMonth,
    required int localDay,
  }) {
    final deleted = allEvents
        .where((e) => e.isSmokeDeleted && e.parentEventId != null)
        .map((e) => e.parentEventId!)
        .toSet();

    var count = 0;
    for (final event in allEvents) {
      if (!event.isSmoke) continue;
      if (deleted.contains(event.id)) continue;
      if (event.localYear != localYear ||
          event.localMonth != localMonth ||
          event.localDay != localDay) {
        continue;
      }
      if (event.createdAtUtc.isAfter(atUtc)) continue;
      count += 1;
    }
    return count;
  }

  @override
  Duration? longestCompletedDelay({
    required List<SmokingLogEvent> allEvents,
    DateTime? onlyLocalDay,
    String? excludingSessionId,
  }) {
    Duration? best;
    for (final duration in _completedDurations(
      allEvents: allEvents,
      onlyLocalDay: onlyLocalDay,
      excludingSessionId: excludingSessionId,
    )) {
      if (best == null || duration > best) best = duration;
    }
    return best;
  }

  @override
  Duration? averageCompletedDelay({
    required List<SmokingLogEvent> allEvents,
    DateTime? onlyLocalDay,
    String? excludingSessionId,
  }) {
    final durations = _completedDurations(
      allEvents: allEvents,
      onlyLocalDay: onlyLocalDay,
      excludingSessionId: excludingSessionId,
    ).toList();
    if (durations.isEmpty) return null;
    final totalMs =
        durations.fold<int>(0, (sum, d) => sum + d.inMilliseconds);
    return Duration(milliseconds: totalMs ~/ durations.length);
  }

  @override
  int activeSmokeCountOnDay({
    required List<SmokingLogEvent> allEvents,
    required int localYear,
    required int localMonth,
    required int localDay,
    DateTime? atOrBeforeLocal,
  }) {
    final deleted = allEvents
        .where((e) => e.isSmokeDeleted && e.parentEventId != null)
        .map((e) => e.parentEventId!)
        .toSet();

    var count = 0;
    for (final event in allEvents) {
      if (!event.isSmoke) continue;
      if (deleted.contains(event.id)) continue;
      if (event.localYear != localYear ||
          event.localMonth != localMonth ||
          event.localDay != localDay) {
        continue;
      }
      if (atOrBeforeLocal != null) {
        final localCreated = event.createdAtUtc.toLocal();
        final clock = DateTime(
          localYear,
          localMonth,
          localDay,
          localCreated.hour,
          localCreated.minute,
          localCreated.second,
          localCreated.millisecond,
        );
        if (clock.isAfter(atOrBeforeLocal)) continue;
      }
      count += 1;
    }
    return count;
  }

  Iterable<Duration> _completedDurations({
    required List<SmokingLogEvent> allEvents,
    DateTime? onlyLocalDay,
    String? excludingSessionId,
  }) sync* {
    for (final event in allEvents) {
      if (!event.isDelayEnded) continue;
      if (excludingSessionId != null &&
          event.parentEventId == excludingSessionId) {
        continue;
      }
      if (onlyLocalDay != null) {
        if (event.localYear != onlyLocalDay.year ||
            event.localMonth != onlyLocalDay.month ||
            event.localDay != onlyLocalDay.day) {
          continue;
        }
      }
      final outcome = DelayOutcome.fromStorage(
        event.payloadJson['outcome'] as String? ?? 'cancelled',
      );
      if (outcome == DelayOutcome.cancelled) continue;
      final ms = event.payloadJson['durationMs'];
      if (ms is int && ms > 0) {
        yield Duration(milliseconds: ms);
      }
    }
  }
}
