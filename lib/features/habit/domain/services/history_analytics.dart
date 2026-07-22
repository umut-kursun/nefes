import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';

/// One local calendar day's smoking summary.
class DaySummary {
  const DaySummary({
    required this.localDate,
    required this.smokeCount,
    required this.averageInterval,
    required this.firstSmokeAtUtc,
    required this.lastSmokeAtUtc,
    required this.longestInterval,
    required this.delayCount,
    required this.delayTotal,
    required this.triggerCounts,
    required this.smokesAsc,
  });

  final DateTime localDate;
  final int smokeCount;
  final Duration? averageInterval;
  final DateTime? firstSmokeAtUtc;
  final DateTime? lastSmokeAtUtc;
  final Duration? longestInterval;
  final int delayCount;
  final Duration delayTotal;
  final Map<SmokingTrigger, int> triggerCounts;
  final List<SmokingLogEvent> smokesAsc;
}

/// Pure history aggregation for the smoking habit module.
abstract final class HistoryAnalytics {
  static List<DaySummary> buildDaySummaries({
    required List<SmokingLogEvent> allEvents,
    HabitType habitType = HabitType.smoking,
  }) {
    final scoped = allEvents.where((e) => e.habitType == habitType).toList();
    final active = ActiveSmokeResolver.resolve(scoped);
    final triggers = SmokeTriggerResolver.resolveMap(scoped);

    final byDay = <String, List<SmokingLogEvent>>{};
    for (final smoke in active) {
      final key = _dayKey(smoke.localYear, smoke.localMonth, smoke.localDay);
      byDay.putIfAbsent(key, () => []).add(smoke);
    }

    final delayByDay = <String, List<SmokingLogEvent>>{};
    for (final event in scoped.where((e) => e.isDelayEnded)) {
      final key = _dayKey(event.localYear, event.localMonth, event.localDay);
      delayByDay.putIfAbsent(key, () => []).add(event);
    }

    final days = <DaySummary>[];
    final keys = {...byDay.keys, ...delayByDay.keys}.toList()
      ..sort((a, b) => b.compareTo(a)); // newest first

    for (final key in keys) {
      final smokes = List<SmokingLogEvent>.from(byDay[key] ?? const [])
        ..sort((a, b) => a.createdAtUtc.compareTo(b.createdAtUtc));
      final delays = delayByDay[key] ?? const [];

      Duration? avg;
      Duration? longest;
      if (smokes.length >= 2) {
        var totalMs = 0;
        var maxMs = 0;
        for (var i = 1; i < smokes.length; i++) {
          final gap = smokes[i].createdAtUtc
              .difference(smokes[i - 1].createdAtUtc)
              .inMilliseconds;
          totalMs += gap;
          if (gap > maxMs) maxMs = gap;
        }
        avg = Duration(milliseconds: totalMs ~/ (smokes.length - 1));
        longest = Duration(milliseconds: maxMs);
      }

      var delayCount = 0;
      var delayMs = 0;
      for (final d in delays) {
        final outcome = d.payloadJson['outcome'] as String? ?? 'cancelled';
        if (outcome == 'cancelled') continue;
        delayCount += 1;
        final ms = d.payloadJson['durationMs'];
        if (ms is int) delayMs += ms;
      }

      final triggerCounts = <SmokingTrigger, int>{};
      for (final smoke in smokes) {
        final t = triggers[smoke.id];
        if (t == null) continue;
        triggerCounts[t] = (triggerCounts[t] ?? 0) + 1;
      }

      final parts = key.split('-');
      days.add(
        DaySummary(
          localDate: DateTime(
            int.parse(parts[0]),
            int.parse(parts[1]),
            int.parse(parts[2]),
          ),
          smokeCount: smokes.length,
          averageInterval: avg,
          firstSmokeAtUtc: smokes.isEmpty ? null : smokes.first.createdAtUtc,
          lastSmokeAtUtc: smokes.isEmpty ? null : smokes.last.createdAtUtc,
          longestInterval: longest,
          delayCount: delayCount,
          delayTotal: Duration(milliseconds: delayMs),
          triggerCounts: triggerCounts,
          smokesAsc: smokes,
        ),
      );
    }

    return days;
  }

  static DaySummary? summaryForDay({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
    HabitType habitType = HabitType.smoking,
  }) {
    final day = DateTime(localDay.year, localDay.month, localDay.day);
    for (final summary in buildDaySummaries(
      allEvents: allEvents,
      habitType: habitType,
    )) {
      if (summary.localDate == day) return summary;
    }
    return DaySummary(
      localDate: day,
      smokeCount: 0,
      averageInterval: null,
      firstSmokeAtUtc: null,
      lastSmokeAtUtc: null,
      longestInterval: null,
      delayCount: 0,
      delayTotal: Duration.zero,
      triggerCounts: const {},
      smokesAsc: const [],
    );
  }

  static String _dayKey(int y, int m, int d) =>
      '$y-${m.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';
}
