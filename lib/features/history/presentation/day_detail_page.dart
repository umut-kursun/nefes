import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/nefes_metric_strip.dart';
import 'package:nefes/core/design_system/nefes_page.dart';
import 'package:nefes/core/design_system/nefes_surface.dart';
import 'package:nefes/core/design_system/nefes_timeline.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/services/history_analytics.dart';
import 'package:nefes/features/habit/domain/services/target_history_resolver.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/history/presentation/event_correction_sheet.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/presentation/triggers/smoking_trigger_labels.dart';

const _fallbackDailyTarget = 20;

/// Day detail — coherent summary + chronological timeline.
class DayDetailPage extends ConsumerWidget {
  const DayDetailPage({super.key, required this.dateParam});

  final String dateParam;

  DateTime? get _parsedDate {
    final parts = dateParam.split('-');
    if (parts.length != 3) return null;
    final year = int.tryParse(parts[0]);
    final month = int.tryParse(parts[1]);
    final day = int.tryParse(parts[2]);
    if (year == null || month == null || day == null) return null;
    return DateTime(year, month, day);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final date = _parsedDate;
    if (date == null) {
      return Scaffold(
        backgroundColor: AppColors.canvasLight,
        appBar: AppBar(title: const Text(AppStrings.dayDetailTitle)),
        body: const Center(child: Text(AppStrings.emptyHistory)),
      );
    }

    final eventsAsync = ref.watch(allSmokingEventsProvider);
    final settingsAsync = ref.watch(appSettingsStreamProvider);
    final targetsAsync = ref.watch(targetHistoryStreamProvider);

    final weekday = TimeDisplay.formatWeekday(date);
    final dayMonth = TimeDisplay.formatDayMonth(date);

    return Scaffold(
      backgroundColor: AppColors.canvasLight,
      appBar: AppBar(
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              dayMonth,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(
              weekday,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
      body: eventsAsync.when(
        data: (events) => _DayDetailBody(
          date: date,
          events: events,
          dailyTarget: settingsAsync.value?.dailyTarget ?? _fallbackDailyTarget,
          targetPeriods: targetsAsync.value ?? const [],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => const Center(child: Text(AppStrings.smokeSaveFailed)),
      ),
    );
  }
}

class _DayDetailBody extends ConsumerWidget {
  const _DayDetailBody({
    required this.date,
    required this.events,
    required this.dailyTarget,
    required this.targetPeriods,
  });

  final DateTime date;
  final List<SmokingLogEvent> events;
  final int dailyTarget;
  final List<DailyTargetPeriod> targetPeriods;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = HistoryAnalytics.summaryForDay(
      allEvents: events,
      localDay: date,
    )!;
    final target = TargetHistoryResolver.targetForLocalDay(
      periods: targetPeriods,
      localDay: date,
      fallbackTarget: dailyTarget,
    );
    final triggers = SmokeTriggerResolver.resolveMap(events);
    final delayEvents =
        events.where((e) {
          return e.isDelayEnded &&
              e.localYear == date.year &&
              e.localMonth == date.month &&
              e.localDay == date.day;
        }).toList()
          ..sort((a, b) => a.createdAtUtc.compareTo(b.createdAtUtc));

    return NefesPageBody(
      scrollable: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _DaySummarySurface(summary: summary, target: target),
          const SizedBox(height: AppSpacing.xl),
          Text(
            AppStrings.timelineTitle.toUpperCase(),
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: AppColors.textMuted,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          if (summary.smokesAsc.isEmpty && delayEvents.isEmpty)
            Text(
              AppStrings.noSmokesThisDay,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textMuted,
              ),
            )
          else
            NefesTimeline(
              items: _buildTimelineItems(
                context: context,
                ref: ref,
                summary: summary,
                triggers: triggers,
                delayEvents: delayEvents,
              ),
            ),
        ],
      ),
    );
  }

  static List<NefesTimelineItem> _buildTimelineItems({
    required BuildContext context,
    required WidgetRef ref,
    required DaySummary summary,
    required Map<String, SmokingTrigger> triggers,
    required List<SmokingLogEvent> delayEvents,
  }) {
    final entries =
        <({DateTime at, String? smokeId, NefesTimelineItem item, bool smoke})>[];

    for (var i = 0; i < summary.smokesAsc.length; i++) {
      final smoke = summary.smokesAsc[i];
      final trigger = triggers[smoke.id];
      entries.add((
        at: smoke.createdAtUtc,
        smokeId: smoke.id,
        smoke: true,
        item: NefesTimelineItem(
          timeLabel: TimeDisplay.formatLocalHm(smoke.createdAtUtc),
          title: AppStrings.smokeEventTitle,
          subtitle: trigger == null
              ? null
              : SmokingTriggerLabels.label(trigger),
          intervalBefore: null,
        ),
      ));
    }

    for (final d in delayEvents) {
      entries.add((
        at: d.createdAtUtc,
        smokeId: null,
        smoke: false,
        item: NefesTimelineItem(
          timeLabel: TimeDisplay.formatLocalHm(d.createdAtUtc),
          title: _delayTitle(d),
          subtitle: _delaySubtitle(d),
          isDelay: true,
        ),
      ));
    }

    entries.sort((a, b) => a.at.compareTo(b.at));

    DateTime? lastSmokeAt;
    final items = <NefesTimelineItem>[];
    for (final e in entries) {
      String? interval;
      if (e.smoke && lastSmokeAt != null) {
        interval = TimeDisplay.formatIntervalShort(e.at.difference(lastSmokeAt));
      }
      if (e.smoke) lastSmokeAt = e.at;
      final smokeId = e.smokeId;
      final trigger = smokeId == null ? null : triggers[smokeId];
      items.add(
        NefesTimelineItem(
          timeLabel: e.item.timeLabel,
          title: e.item.title,
          subtitle: e.item.subtitle,
          intervalBefore: interval,
          isDelay: e.item.isDelay,
          onTap: smokeId == null
              ? null
              : () => showEventCorrectionSheet(
                    context: context,
                    ref: ref,
                    smokeEventId: smokeId,
                    currentLocal: e.at.toLocal(),
                    currentTrigger: trigger,
                  ),
        ),
      );
    }
    return items;
  }

  static String _delayTitle(SmokingLogEvent event) {
    final outcome = DelayOutcome.fromStorage(
      event.payloadJson['outcome'] as String? ?? 'cancelled',
    );
    return switch (outcome) {
      DelayOutcome.smoked => AppStrings.delayOutcomeSmoked,
      DelayOutcome.completed => AppStrings.delayOutcomeCompleted,
      DelayOutcome.cancelled => AppStrings.delayOutcomeCancelled,
    };
  }

  static String _delaySubtitle(SmokingLogEvent event) {
    final durationMs = event.payloadJson['durationMs'];
    final duration = Duration(
      milliseconds: durationMs is int ? durationMs : 0,
    );
    return TimeDisplay.formatIntervalShort(duration);
  }
}

class _DaySummarySurface extends StatelessWidget {
  const _DaySummarySurface({required this.summary, required this.target});

  final DaySummary summary;
  final int target;

  @override
  Widget build(BuildContext context) {
    final hasDelays = summary.delayCount > 0;

    return NefesSurface(
      tone: NefesSurfaceTone.raised,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${summary.smokeCount}',
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.forest,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  AppStrings.smokeCountLabel.toLowerCase(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          NefesMetricStrip(
            metrics: [
              NefesMetric(
                label: AppStrings.targetForDayLabel,
                value: '$target',
              ),
              NefesMetric(
                label: AppStrings.averageIntervalLabel,
                value: summary.averageInterval == null
                    ? '—'
                    : TimeDisplay.formatIntervalShort(summary.averageInterval!),
                emphasis: summary.averageInterval != null,
              ),
              NefesMetric(
                label: AppStrings.longestIntervalLabel,
                value: summary.longestInterval == null
                    ? '—'
                    : TimeDisplay.formatIntervalShort(summary.longestInterval!),
              ),
              if (hasDelays)
                NefesMetric(
                  label: AppStrings.delayCountLabel,
                  value: '${summary.delayCount}',
                ),
            ],
          ),
        ],
      ),
    );
  }
}
