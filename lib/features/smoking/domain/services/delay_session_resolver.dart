import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';

/// Resolves the single active delay session from the event stream.
abstract final class DelaySessionResolver {
  static ActiveDelaySession? resolveActive(List<SmokingLogEvent> allEvents) {
    final endedIds = allEvents
        .where((e) => e.isDelayEnded && e.parentEventId != null)
        .map((e) => e.parentEventId!)
        .toSet();

    final open =
        allEvents
            .where((e) => e.isDelayStarted && !endedIds.contains(e.id))
            .toList()
          ..sort((a, b) => a.createdAtUtc.compareTo(b.createdAtUtc));

    if (open.isEmpty) return null;
    final latest = open.last;
    return ActiveDelaySession(
      id: latest.id,
      startedAtUtc: latest.createdAtUtc,
    );
  }

  /// Today's non-cancelled delay completions (for lightweight insights).
  static ({int count, Duration total}) todayDelayStats({
    required List<SmokingLogEvent> allEvents,
    required DateTime nowLocal,
  }) {
    var count = 0;
    var totalMs = 0;
    for (final event in allEvents) {
      if (!event.isDelayEnded) continue;
      if (event.localYear != nowLocal.year ||
          event.localMonth != nowLocal.month ||
          event.localDay != nowLocal.day) {
        continue;
      }
      final outcome = DelayOutcome.fromStorage(
        event.payloadJson['outcome'] as String? ?? 'cancelled',
      );
      if (outcome == DelayOutcome.cancelled) continue;
      count += 1;
      final ms = event.payloadJson['durationMs'];
      if (ms is int) {
        totalMs += ms;
      }
    }
    return (count: count, total: Duration(milliseconds: totalMs));
  }
}

/// Looks up optional trigger annotations for smoke events.
abstract final class SmokeTriggerResolver {
  static Map<String, SmokingTrigger> resolveMap(
    List<SmokingLogEvent> allEvents,
  ) {
    final map = <String, SmokingTrigger>{};
    for (final event in allEvents) {
      if (!event.isSmokeTriggerNoted) continue;
      final parent = event.parentEventId;
      if (parent == null) continue;
      final trigger = SmokingTrigger.tryParse(
        event.payloadJson['trigger'] as String?,
      );
      if (trigger != null) {
        // Latest annotation wins if multiple (should be rare).
        map[parent] = trigger;
      }
    }
    return map;
  }
}
