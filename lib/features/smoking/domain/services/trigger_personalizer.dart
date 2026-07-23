import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';

/// Deterministic local ranking of trigger chips from user history.
abstract final class TriggerPersonalizer {
  /// Default quick order when history is insufficient.
  static const defaultQuickOrder = <SmokingTrigger>[
    SmokingTrigger.coffeeTea,
    SmokingTrigger.afterMeal,
    SmokingTrigger.stress,
    SmokingTrigger.social,
  ];

  /// Returns quick-pick triggers: frequent first, then remaining defaults.
  static List<SmokingTrigger> rankedQuickPicks({
    required List<SmokingLogEvent> allEvents,
    int quickPickCount = 4,
    int minAnnotations = 3,
  }) {
    final map = SmokeTriggerResolver.resolveMap(allEvents);
    if (map.length < minAnnotations) {
      return defaultQuickOrder.take(quickPickCount).toList();
    }

    final counts = <SmokingTrigger, int>{};
    for (final t in map.values) {
      counts[t] = (counts[t] ?? 0) + 1;
    }

    final ranked = counts.entries.toList()
      ..sort((a, b) {
        final byCount = b.value.compareTo(a.value);
        if (byCount != 0) return byCount;
        return a.key.index.compareTo(b.key.index);
      });

    final result = <SmokingTrigger>[
      for (final e in ranked) e.key,
    ];
    for (final t in defaultQuickOrder) {
      if (!result.contains(t)) result.add(t);
    }
    for (final t in SmokingTrigger.values) {
      if (!result.contains(t)) result.add(t);
    }
    return result.take(quickPickCount).toList();
  }

  static List<SmokingTrigger> remainingTriggers(
    List<SmokingTrigger> quickPicks,
  ) {
    return [
      for (final t in SmokingTrigger.values)
        if (!quickPicks.contains(t)) t,
    ];
  }
}
