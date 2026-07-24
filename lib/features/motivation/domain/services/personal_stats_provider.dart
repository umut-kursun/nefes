import 'package:nefes/features/motivation/domain/entities/delay_session.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';

/// Pluggable personal-stats source for the Delay Coach.
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

  int completedDelayCountOnDay({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
    String? excludingSessionId,
  });

  /// Delays ended with urge passed (not smoked / cancelled) — for savings.
  int urgePassedCountOnDay({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
    String? excludingSessionId,
  });

  int delayStreakDaysEndingOn({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
  });

  Duration? averageInterSmokeInterval({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
    int lookbackDays,
  });

  bool usuallySmokesAround({
    required List<SmokingLogEvent> allEvents,
    required DateTime localNow,
    int lookbackDays,
    int windowMinutes,
  });

  int estimatedCigarettesAvoided({
    required Duration elapsed,
    Duration? averageInterSmokeInterval,
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
    final day = DateTime(local.year, local.month, local.day);
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
      completedDelaysToday: completedDelayCountOnDay(
        allEvents: allEvents,
        localDay: day,
        excludingSessionId: sessionId,
      ),
      delayStreakDays: delayStreakDaysEndingOn(
        allEvents: allEvents,
        localDay: day,
      ),
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
    final deleted = _deletedIds(allEvents);
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
    final deleted = _deletedIds(allEvents);
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

  @override
  int completedDelayCountOnDay({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
    String? excludingSessionId,
  }) {
    var count = 0;
    for (final _ in _completedDurations(
      allEvents: allEvents,
      onlyLocalDay: localDay,
      excludingSessionId: excludingSessionId,
    )) {
      count += 1;
    }
    return count;
  }

  @override
  int urgePassedCountOnDay({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
    String? excludingSessionId,
  }) {
    var count = 0;
    for (final _ in _completedDurations(
      allEvents: allEvents,
      onlyLocalDay: localDay,
      excludingSessionId: excludingSessionId,
      urgePassedOnly: true,
    )) {
      count += 1;
    }
    return count;
  }

  @override
  int delayStreakDaysEndingOn({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
  }) {
    var streak = 0;
    var cursor = DateTime(localDay.year, localDay.month, localDay.day);
    while (true) {
      final has = completedDelayCountOnDay(
            allEvents: allEvents,
            localDay: cursor,
          ) >
          0;
      if (!has) break;
      streak += 1;
      cursor = cursor.subtract(const Duration(days: 1));
      if (streak > 365) break;
    }
    return streak;
  }

  @override
  Duration? averageInterSmokeInterval({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
    int lookbackDays = 7,
  }) {
    final deleted = _deletedIds(allEvents);
    final start = localDay.subtract(Duration(days: lookbackDays - 1));
    final smokes = allEvents
        .where((e) => e.isSmoke && !deleted.contains(e.id))
        .where((e) {
          final day = DateTime(e.localYear, e.localMonth, e.localDay);
          return !day.isBefore(start) && !day.isAfter(localDay);
        })
        .toList()
      ..sort((a, b) => a.createdAtUtc.compareTo(b.createdAtUtc));

    if (smokes.length < 2) return null;
    var totalMs = 0;
    var gaps = 0;
    for (var i = 1; i < smokes.length; i++) {
      final gap = smokes[i].createdAtUtc.difference(smokes[i - 1].createdAtUtc);
      if (gap.inMinutes < 2 || gap.inHours > 18) continue;
      totalMs += gap.inMilliseconds;
      gaps += 1;
    }
    if (gaps == 0) return null;
    return Duration(milliseconds: totalMs ~/ gaps);
  }

  @override
  bool usuallySmokesAround({
    required List<SmokingLogEvent> allEvents,
    required DateTime localNow,
    int lookbackDays = 14,
    int windowMinutes = 45,
  }) {
    final deleted = _deletedIds(allEvents);
    final start = localNow.subtract(Duration(days: lookbackDays));
    final targetMinutes = localNow.hour * 60 + localNow.minute;
    var hits = 0;
    for (final event in allEvents) {
      if (!event.isSmoke || deleted.contains(event.id)) continue;
      final local = event.createdAtUtc.toLocal();
      if (local.isBefore(start)) continue;
      final minutes = local.hour * 60 + local.minute;
      final delta = (minutes - targetMinutes).abs();
      final wrapped = delta > 720 ? 1440 - delta : delta;
      if (wrapped <= windowMinutes) hits += 1;
    }
    return hits >= 3;
  }

  @override
  int estimatedCigarettesAvoided({
    required Duration elapsed,
    Duration? averageInterSmokeInterval,
  }) {
    final interval = averageInterSmokeInterval;
    if (interval == null || interval.inMinutes < 5) {
      return elapsed.inMinutes >= 1 ? 1 : 0;
    }
    final estimate = elapsed.inMilliseconds / interval.inMilliseconds;
    final rounded = estimate.floor();
    if (elapsed.inMinutes >= 1) {
      return rounded < 1 ? 1 : rounded;
    }
    return 0;
  }

  Set<String> _deletedIds(List<SmokingLogEvent> allEvents) {
    return allEvents
        .where((e) => e.isSmokeDeleted && e.parentEventId != null)
        .map((e) => e.parentEventId!)
        .toSet();
  }

  Iterable<Duration> _completedDurations({
    required List<SmokingLogEvent> allEvents,
    DateTime? onlyLocalDay,
    String? excludingSessionId,
    bool urgePassedOnly = false,
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
      if (urgePassedOnly && outcome != DelayOutcome.completed) continue;
      final ms = event.payloadJson['durationMs'];
      if (ms is int && ms > 0) {
        yield Duration(milliseconds: ms);
      }
    }
  }
}
