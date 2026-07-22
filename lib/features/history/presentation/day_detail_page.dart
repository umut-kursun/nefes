import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/app_card.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/services/history_analytics.dart';
import 'package:nefes/features/habit/domain/services/target_history_resolver.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';
import 'package:nefes/features/smoking/presentation/triggers/smoking_trigger_labels.dart';

const _fallbackDailyTarget = 20;

/// Day detail — full stats, resolved target-at-the-time, and a timeline.
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
        appBar: AppBar(title: const Text(AppStrings.dayDetailTitle)),
        body: Center(child: Text(AppStrings.emptyHistory)),
      );
    }

    final eventsAsync = ref.watch(allSmokingEventsProvider);
    final settingsAsync = ref.watch(appSettingsStreamProvider);
    final targetsAsync = ref.watch(targetHistoryStreamProvider);

    return Scaffold(
      appBar: AppBar(title: Text(TimeDisplay.formatWeekdayDateHeader(date))),
      body: SafeArea(
        child: eventsAsync.when(
          data: (events) => _DayDetailBody(
            date: date,
            events: events,
            dailyTarget:
                settingsAsync.value?.dailyTarget ?? _fallbackDailyTarget,
            targetPeriods: targetsAsync.value ?? const [],
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => Center(child: Text(AppStrings.smokeSaveFailed)),
        ),
      ),
    );
  }
}

class _DayDetailBody extends StatelessWidget {
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
  Widget build(BuildContext context) {
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= AppBreakpoints.dashboardWide;
        final maxContentWidth = isWide
            ? AppBreakpoints.desktopMaxContent
            : AppBreakpoints.mobileMaxContent;

        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxContentWidth),
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                _StatsGrid(summary: summary, target: target, isWide: isWide),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  AppStrings.timelineTitle,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                if (summary.smokesAsc.isEmpty)
                  AppCard(child: Text(AppStrings.noSmokesThisDay))
                else
                  ...[
                    for (var i = 0; i < summary.smokesAsc.length; i++) ...[
                      if (i > 0) const SizedBox(height: AppSpacing.sm),
                      _TimelineTile(
                        sequenceNumber: i + 1,
                        event: summary.smokesAsc[i],
                        previous: i == 0 ? null : summary.smokesAsc[i - 1],
                        trigger: triggers[summary.smokesAsc[i].id],
                      ),
                    ],
                  ],
                if (delayEvents.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    AppStrings.delayNotesTitle,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  for (var i = 0; i < delayEvents.length; i++) ...[
                    if (i > 0) const SizedBox(height: AppSpacing.sm),
                    _DelayNoteTile(event: delayEvents[i]),
                  ],
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({
    required this.summary,
    required this.target,
    required this.isWide,
  });

  final DaySummary summary;
  final int target;
  final bool isWide;

  @override
  Widget build(BuildContext context) {
    final tiles = <_StatTile>[
      _StatTile(
        label: AppStrings.smokeCountLabel,
        value: '${summary.smokeCount}',
      ),
      _StatTile(label: AppStrings.targetForDayLabel, value: '$target'),
      _StatTile(
        label: AppStrings.averageIntervalLabel,
        value: summary.averageInterval == null
            ? '—'
            : TimeDisplay.formatIntervalShort(summary.averageInterval!),
      ),
      _StatTile(
        label: AppStrings.longestIntervalLabel,
        value: summary.longestInterval == null
            ? '—'
            : TimeDisplay.formatIntervalShort(summary.longestInterval!),
      ),
      _StatTile(
        label: AppStrings.delayCountLabel,
        value: '${summary.delayCount}',
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isWide ? 3 : 2,
        mainAxisSpacing: AppSpacing.sm,
        crossAxisSpacing: AppSpacing.sm,
        childAspectRatio: 1.6,
      ),
      itemCount: tiles.length,
      itemBuilder: (context, index) => tiles[index],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({
    required this.sequenceNumber,
    required this.event,
    required this.previous,
    required this.trigger,
  });

  final int sequenceNumber;
  final SmokingLogEvent event;
  final SmokingLogEvent? previous;
  final SmokingTrigger? trigger;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final interval = previous == null
        ? null
        : event.createdAtUtc.difference(previous!.createdAtUtc);

    return AppCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                AppStrings.sequenceLabel(sequenceNumber),
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: AppSpacing.md),
              Text(
                TimeDisplay.formatLocalHm(event.createdAtUtc),
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
          if (interval != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              AppStrings.afterPrevious(
                TimeDisplay.formatIntervalShort(interval),
              ),
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
          if (trigger != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              SmokingTriggerLabels.label(trigger!),
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: scheme.primary),
            ),
          ],
        ],
      ),
    );
  }
}

class _DelayNoteTile extends StatelessWidget {
  const _DelayNoteTile({required this.event});

  final SmokingLogEvent event;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final outcome = DelayOutcome.fromStorage(
      event.payloadJson['outcome'] as String? ?? 'cancelled',
    );
    final durationMs = event.payloadJson['durationMs'];
    final duration = Duration(
      milliseconds: durationMs is int ? durationMs : 0,
    );

    return AppCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          Icon(
            outcome == DelayOutcome.completed
                ? Icons.self_improvement_outlined
                : outcome == DelayOutcome.smoked
                ? Icons.smoking_rooms_outlined
                : Icons.close_outlined,
            color: scheme.onSurfaceVariant,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _outcomeLabel(outcome),
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
                Text(
                  '${TimeDisplay.formatLocalHm(event.createdAtUtc)} · '
                  '${TimeDisplay.formatIntervalShort(duration)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _outcomeLabel(DelayOutcome outcome) => switch (outcome) {
    DelayOutcome.smoked => AppStrings.delayOutcomeSmoked,
    DelayOutcome.completed => AppStrings.delayOutcomeCompleted,
    DelayOutcome.cancelled => AppStrings.delayOutcomeCancelled,
  };
}
