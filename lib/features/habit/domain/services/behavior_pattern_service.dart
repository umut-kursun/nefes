import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/habit/domain/services/history_analytics.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';

/// A single calm, data-backed contextual observation for Today.
class ContextualInsight {
  const ContextualInsight({required this.message, required this.kind});

  final String message;
  final String kind;
}

/// Derives behavioral patterns from existing local events.
///
/// No AI. Only emits insights when enough real data supports them.
abstract final class BehaviorPatternService {
  static const int minDaysForPattern = 5;
  static const int minEventsForHourPattern = 12;
  static const int minEventsForTriggerPattern = 8;

  /// At most one Today insight — or null when nothing meaningful.
  static ContextualInsight? todayInsight({
    required List<SmokingLogEvent> allEvents,
    required DateTime nowLocal,
  }) {
    final active = ActiveSmokeResolver.resolve(allEvents);
    if (active.length < 4) return null;

    final today = DateTime(nowLocal.year, nowLocal.month, nowLocal.day);
    final todaySmokes = active.where((e) => e.localDate == today).toList();

    final hourInsight = _busyHourInsight(
      active: active,
      nowLocal: nowLocal,
      todayCountInHour: todaySmokes.where((e) => e.localHour == nowLocal.hour).length,
    );
    if (hourInsight != null) return hourInsight;

    final intervalInsight = _intervalInsight(
      allEvents: allEvents,
      todaySmokes: todaySmokes,
      nowLocal: nowLocal,
    );
    if (intervalInsight != null) return intervalInsight;

    final vsYesterday = _vsYesterdayInsight(
      active: active,
      today: today,
      todayCount: todaySmokes.length,
      nowLocal: nowLocal,
    );
    if (vsYesterday != null) return vsYesterday;

    return _triggerTodayInsight(
      allEvents: allEvents,
      todaySmokes: todaySmokes,
    );
  }

  static ContextualInsight? _busyHourInsight({
    required List<SmokingLogEvent> active,
    required DateTime nowLocal,
    required int todayCountInHour,
  }) {
    if (active.length < minEventsForHourPattern) return null;

    final hourCounts = <int, int>{};
    for (final e in active) {
      hourCounts[e.localHour] = (hourCounts[e.localHour] ?? 0) + 1;
    }
    var topHour = nowLocal.hour;
    var topCount = 0;
    hourCounts.forEach((h, c) {
      if (c > topCount) {
        topCount = c;
        topHour = h;
      }
    });

    final total = active.length;
    if (topCount < 3 || topCount / total < 0.18) return null;
    if ((topHour - nowLocal.hour).abs() > 1) return null;

    return ContextualInsight(
      kind: 'busy_hour',
      message: AppStrings.insightBusyHour(topHour),
    );
  }

  static ContextualInsight? _intervalInsight({
    required List<SmokingLogEvent> allEvents,
    required List<SmokingLogEvent> todaySmokes,
    required DateTime nowLocal,
  }) {
    if (todaySmokes.length < 2) return null;
    final days = HistoryAnalytics.buildDaySummaries(allEvents: allEvents);
    final recent = days
        .where(
          (d) =>
              d.localDate.isBefore(
                DateTime(nowLocal.year, nowLocal.month, nowLocal.day),
              ) &&
              d.smokeCount >= 2 &&
              d.averageInterval != null,
        )
        .take(7)
        .toList();
    if (recent.length < 3) return null;

    final baselineMs = recent
            .map((d) => d.averageInterval!.inMilliseconds)
            .fold<int>(0, (a, b) => a + b) ~/
        recent.length;

    todaySmokes.sort((a, b) => a.createdAtUtc.compareTo(b.createdAtUtc));
    var sum = 0;
    for (var i = 1; i < todaySmokes.length; i++) {
      sum += todaySmokes[i]
          .createdAtUtc
          .difference(todaySmokes[i - 1].createdAtUtc)
          .inMilliseconds;
    }
    final todayAvgMs = sum ~/ (todaySmokes.length - 1);
    final deltaMin = ((todayAvgMs - baselineMs) / 60000).round();
    if (deltaMin.abs() < 10) return null;

    return ContextualInsight(
      kind: 'interval_delta',
      message: deltaMin > 0
          ? AppStrings.insightIntervalLonger(
              TimeDisplay.formatIntervalShort(Duration(minutes: deltaMin)),
            )
          : AppStrings.insightIntervalShorter(
              TimeDisplay.formatIntervalShort(
                Duration(minutes: deltaMin.abs()),
              ),
            ),
    );
  }

  static ContextualInsight? _vsYesterdayInsight({
    required List<SmokingLogEvent> active,
    required DateTime today,
    required int todayCount,
    required DateTime nowLocal,
  }) {
    final yesterday = today.subtract(const Duration(days: 1));
    final yCount = active.where((e) {
      if (e.localDate != yesterday) return false;
      final yTime = DateTime(
        yesterday.year,
        yesterday.month,
        yesterday.day,
        e.localHour,
        e.localMinute,
      );
      final cutoff = DateTime(
        yesterday.year,
        yesterday.month,
        yesterday.day,
        nowLocal.hour,
        nowLocal.minute,
      );
      return !yTime.isAfter(cutoff);
    }).length;

    if (yCount < 2 && todayCount < 2) return null;
    final delta = todayCount - yCount;
    if (delta == 0) return null;
    if (delta.abs() < 2) return null;

    return ContextualInsight(
      kind: 'vs_yesterday',
      message: delta < 0
          ? AppStrings.insightFewerThanYesterday(delta.abs())
          : AppStrings.insightMoreThanYesterday(delta),
    );
  }

  static ContextualInsight? _triggerTodayInsight({
    required List<SmokingLogEvent> allEvents,
    required List<SmokingLogEvent> todaySmokes,
  }) {
    if (todaySmokes.length < 3) return null;
    final triggers = SmokeTriggerResolver.resolveMap(allEvents);
    final todayCounts = <SmokingTrigger, int>{};
    for (final s in todaySmokes) {
      final t = triggers[s.id];
      if (t == null) continue;
      todayCounts[t] = (todayCounts[t] ?? 0) + 1;
    }
    if (todayCounts.isEmpty) return null;

    SmokingTrigger? top;
    var topN = 0;
    todayCounts.forEach((k, v) {
      if (v > topN) {
        topN = v;
        top = k;
      }
    });
    if (top == null || topN < 2) return null;
    if (topN / todaySmokes.length < 0.5) return null;

    return ContextualInsight(
      kind: 'trigger_today',
      message: AppStrings.insightTriggerToday(_triggerLabel(top!)),
    );
  }

  static String _triggerLabel(SmokingTrigger trigger) => switch (trigger) {
        SmokingTrigger.habit => AppStrings.triggerHabit,
        SmokingTrigger.craving => AppStrings.triggerCraving,
        SmokingTrigger.stress => AppStrings.triggerStress,
        SmokingTrigger.coffeeTea => AppStrings.triggerCoffeeTea,
        SmokingTrigger.afterMeal => AppStrings.triggerAfterMeal,
        SmokingTrigger.social => AppStrings.triggerSocial,
        SmokingTrigger.other => AppStrings.triggerOther,
      };
}
