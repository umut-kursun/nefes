import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/habit/domain/services/history_analytics.dart';

enum InsightsPeriod { days7, days30, thisMonth }

class InsightsSnapshot {
  const InsightsSnapshot({
    required this.period,
    required this.totalSmokes,
    required this.dailyAverage,
    required this.lowestDay,
    required this.highestDay,
    required this.averageInterval,
    required this.longestInterval,
    required this.delayAttempts,
    required this.delayTotal,
    required this.topTrigger,
    required this.topTriggerShare,
    required this.dailyCounts,
    required this.triggerCounts,
    required this.previousTotal,
    required this.insights,
  });

  final InsightsPeriod period;
  final int totalSmokes;
  final double dailyAverage;
  final DaySummary? lowestDay;
  final DaySummary? highestDay;
  final Duration? averageInterval;
  final Duration? longestInterval;
  final int delayAttempts;
  final Duration delayTotal;
  final SmokingTrigger? topTrigger;
  final double? topTriggerShare;
  final List<({DateTime day, int count})> dailyCounts;
  final Map<SmokingTrigger, int> triggerCounts;
  final int? previousTotal;
  final List<String> insights;
}

/// Deterministic local insights — no AI, no invention.
abstract final class InsightsEngine {
  static InsightsSnapshot build({
    required List<SmokingLogEvent> allEvents,
    required DateTime nowLocal,
    required InsightsPeriod period,
    HabitType habitType = HabitType.smoking,
  }) {
    final range = _rangeFor(period, nowLocal);
    final prevRange = _previousEquivalent(period, range.$1, range.$2);

    final days = HistoryAnalytics.buildDaySummaries(
      allEvents: allEvents,
      habitType: habitType,
    );

    final inRange = days.where((d) {
      return !d.localDate.isBefore(range.$1) && !d.localDate.isAfter(range.$2);
    }).toList();

    final prevDays = days.where((d) {
      return !d.localDate.isBefore(prevRange.$1) &&
          !d.localDate.isAfter(prevRange.$2);
    }).toList();

    final total = inRange.fold<int>(0, (s, d) => s + d.smokeCount);
    final prevTotal = prevDays.fold<int>(0, (s, d) => s + d.smokeCount);
    final daySpan = range.$2.difference(range.$1).inDays + 1;
    final dailyAvg = daySpan <= 0 ? 0.0 : total / daySpan;

    DaySummary? lowest;
    DaySummary? highest;
    for (final d in inRange.where((e) => e.smokeCount > 0)) {
      if (lowest == null || d.smokeCount < lowest.smokeCount) lowest = d;
      if (highest == null || d.smokeCount > highest.smokeCount) highest = d;
    }

    final scoped = allEvents.where((e) => e.habitType == habitType).toList();
    final activeInRange = ActiveSmokeResolver.resolve(scoped).where((e) {
      final day = e.localDate;
      return !day.isBefore(range.$1) && !day.isAfter(range.$2);
    }).toList()
      ..sort((a, b) => a.createdAtUtc.compareTo(b.createdAtUtc));

    Duration? avgInterval;
    Duration? longest;
    if (activeInRange.length >= 2) {
      var sum = 0;
      var max = 0;
      for (var i = 1; i < activeInRange.length; i++) {
        final gap = activeInRange[i].createdAtUtc
            .difference(activeInRange[i - 1].createdAtUtc)
            .inMilliseconds;
        sum += gap;
        if (gap > max) max = gap;
      }
      avgInterval = Duration(milliseconds: sum ~/ (activeInRange.length - 1));
      longest = Duration(milliseconds: max);
    }

    var delayAttempts = 0;
    var delayMs = 0;
    final triggerCounts = <SmokingTrigger, int>{};
    final triggers = SmokeTriggerResolver.resolveMap(scoped);

    for (final d in inRange) {
      delayAttempts += d.delayCount;
      delayMs += d.delayTotal.inMilliseconds;
      d.triggerCounts.forEach((k, v) {
        triggerCounts[k] = (triggerCounts[k] ?? 0) + v;
      });
    }

    // Also count triggers from map for smokes in range
    for (final smoke in activeInRange) {
      final t = triggers[smoke.id];
      if (t != null) {
        triggerCounts[t] = triggerCounts[t] ?? 0;
        // already counted via day summaries if present
      }
    }

    SmokingTrigger? topTrigger;
    var topCount = 0;
    triggerCounts.forEach((k, v) {
      if (v > topCount) {
        topCount = v;
        topTrigger = k;
      }
    });
    final triggeredTotal = triggerCounts.values.fold<int>(0, (a, b) => a + b);
    final topShare = triggeredTotal == 0 ? null : topCount / triggeredTotal;

    final dailyCounts = <({DateTime day, int count})>[];
    for (var i = 0; i < daySpan; i++) {
      final day = DateTime(range.$1.year, range.$1.month, range.$1.day + i);
      final match = inRange.where((d) => d.localDate == day);
      dailyCounts.add((
        day: day,
        count: match.isEmpty ? 0 : match.first.smokeCount,
      ));
    }

    final insights = _buildInsights(
      period: period,
      total: total,
      dailyAvg: dailyAvg,
      daySpan: daySpan,
      prevTotal: prevDays.isEmpty ? null : prevTotal,
      avgInterval: avgInterval,
      delayAttempts: delayAttempts,
      delayTotal: Duration(milliseconds: delayMs),
      topTrigger: topTrigger,
      topShare: topShare,
      activeInRange: activeInRange,
    );

    return InsightsSnapshot(
      period: period,
      totalSmokes: total,
      dailyAverage: dailyAvg,
      lowestDay: lowest,
      highestDay: highest,
      averageInterval: avgInterval,
      longestInterval: longest,
      delayAttempts: delayAttempts,
      delayTotal: Duration(milliseconds: delayMs),
      topTrigger: topTrigger,
      topTriggerShare: topShare,
      dailyCounts: dailyCounts,
      triggerCounts: triggerCounts,
      previousTotal: prevDays.isEmpty ? null : prevTotal,
      insights: insights,
    );
  }

  static (DateTime, DateTime) _rangeFor(
    InsightsPeriod period,
    DateTime nowLocal,
  ) {
    final today = DateTime(nowLocal.year, nowLocal.month, nowLocal.day);
    switch (period) {
      case InsightsPeriod.days7:
        return (today.subtract(const Duration(days: 6)), today);
      case InsightsPeriod.days30:
        return (today.subtract(const Duration(days: 29)), today);
      case InsightsPeriod.thisMonth:
        return (DateTime(today.year, today.month, 1), today);
    }
  }

  static (DateTime, DateTime) _previousEquivalent(
    InsightsPeriod period,
    DateTime from,
    DateTime to,
  ) {
    final span = to.difference(from);
    final prevTo = from.subtract(const Duration(days: 1));
    final prevFrom = prevTo.subtract(span);
    return (prevFrom, prevTo);
  }

  static List<String> _buildInsights({
    required InsightsPeriod period,
    required int total,
    required double dailyAvg,
    required int daySpan,
    required int? prevTotal,
    required Duration? avgInterval,
    required int delayAttempts,
    required Duration delayTotal,
    required SmokingTrigger? topTrigger,
    required double? topShare,
    required List<SmokingLogEvent> activeInRange,
  }) {
    final out = <String>[];
    if (total == 0) return out;

    final periodLabel = switch (period) {
      InsightsPeriod.days7 => 'Son 7 günde',
      InsightsPeriod.days30 => 'Son 30 günde',
      InsightsPeriod.thisMonth => 'Bu ay',
    };

    out.add(
      '$periodLabel günlük ortalaman ${_fmtAvg(dailyAvg)} sigara.',
    );

    if (prevTotal != null && prevTotal > 0) {
      final delta = total - prevTotal;
      if (delta != 0) {
        final abs = delta.abs();
        out.add(
          delta < 0
              ? 'Önceki eşdeğer döneme göre toplam $abs sigara azaldı.'
              : 'Önceki eşdeğer döneme göre toplam $abs sigara arttı.',
        );
      }
    }

    if (delayAttempts > 0) {
      out.add(
        '$periodLabel $delayAttempts kez sigarayı erteledin ve toplam ${_fmtDuration(delayTotal)} kazandın.',
      );
    }

    if (topTrigger != null && topShare != null && topShare >= 0.15) {
      final pct = (topShare * 100).round();
      out.add(
        '${_triggerTr(topTrigger)} kayıtların tetiklenen sigaraların %$pct\'ini oluşturuyor.',
      );
    }

    final hourBuckets = <int, int>{};
    for (final e in activeInRange) {
      hourBuckets[e.localHour] = (hourBuckets[e.localHour] ?? 0) + 1;
    }
    if (hourBuckets.isNotEmpty) {
      var bestHour = 0;
      var bestCount = 0;
      hourBuckets.forEach((h, c) {
        if (c > bestCount) {
          bestHour = h;
          bestCount = c;
        }
      });
      if (bestCount >= 2) {
        final end = (bestHour + 2).clamp(0, 23);
        out.add(
          'En sık ${bestHour.toString().padLeft(2, '0')}:00–${end.toString().padLeft(2, '0')}:00 arasında sigara içiyorsun.',
        );
      }
    }

    if (avgInterval != null && avgInterval.inMinutes >= 1) {
      out.add(
        'Ortalama sigara aralığın ${_fmtDuration(avgInterval)}.',
      );
    }

    return out.take(5).toList();
  }

  static String _fmtAvg(double v) {
    final rounded = (v * 10).round() / 10;
    if (rounded == rounded.roundToDouble()) {
      return rounded.round().toString();
    }
    return rounded.toStringAsFixed(1).replaceAll('.', ',');
  }

  static String _fmtDuration(Duration d) {
    final totalMin = d.inMinutes;
    if (totalMin < 60) return '$totalMin dakika';
    final h = totalMin ~/ 60;
    final m = totalMin % 60;
    if (m == 0) return '$h saat';
    return '$h saat $m dakika';
  }

  static String _triggerTr(SmokingTrigger t) => switch (t) {
        SmokingTrigger.habit => 'Alışkanlık',
        SmokingTrigger.craving => 'Gerçek istek',
        SmokingTrigger.stress => 'Stres',
        SmokingTrigger.coffeeTea => 'Kahve / çay',
        SmokingTrigger.afterMeal => 'Yemek sonrası',
        SmokingTrigger.social => 'Sosyal',
        SmokingTrigger.other => 'Diğer',
      };
}
