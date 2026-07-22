import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nefes/core/design_system/app_card.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/habit/domain/services/history_analytics.dart';

final _dateKeyFormat = DateFormat('yyyy-MM-dd');

/// History screen — day list or calendar month grid.
class HistoryPage extends ConsumerStatefulWidget {
  const HistoryPage({super.key});

  @override
  ConsumerState<HistoryPage> createState() => _HistoryPageState();
}

enum _HistoryTab { list, calendar }

class _HistoryPageState extends ConsumerState<HistoryPage> {
  var _tab = _HistoryTab.list;
  var _visibleMonth = DateTime(DateTime.now().year, DateTime.now().month);

  @override
  Widget build(BuildContext context) {
    final eventsAsync = ref.watch(allSmokingEventsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.historyTitle)),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide =
                constraints.maxWidth >= AppBreakpoints.dashboardWide;
            final maxContentWidth = isWide
                ? AppBreakpoints.desktopMaxContent
                : AppBreakpoints.mobileMaxContent;

            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _ViewToggle(
                        selected: _tab,
                        onChanged: (tab) => setState(() => _tab = tab),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Expanded(
                        child: eventsAsync.when(
                          data: (events) {
                            final days = HistoryAnalytics.buildDaySummaries(
                              allEvents: events,
                            );
                            return _tab == _HistoryTab.list
                                ? _DayListView(days: days)
                                : _CalendarView(
                                    days: days,
                                    month: _visibleMonth,
                                    onMonthChanged: (month) =>
                                        setState(() => _visibleMonth = month),
                                  );
                          },
                          loading: () => const Center(
                            child: CircularProgressIndicator(),
                          ),
                          error: (_, _) => Center(
                            child: Text(AppStrings.smokeSaveFailed),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ViewToggle extends StatelessWidget {
  const _ViewToggle({required this.selected, required this.onChanged});

  final _HistoryTab selected;
  final ValueChanged<_HistoryTab> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<_HistoryTab>(
      segments: const [
        ButtonSegment(
          value: _HistoryTab.list,
          label: Text(AppStrings.historyList),
          icon: Icon(Icons.view_list_outlined),
        ),
        ButtonSegment(
          value: _HistoryTab.calendar,
          label: Text(AppStrings.historyCalendar),
          icon: Icon(Icons.calendar_month_outlined),
        ),
      ],
      selected: {selected},
      onSelectionChanged: (values) => onChanged(values.first),
    );
  }
}

class _DayListView extends StatelessWidget {
  const _DayListView({required this.days});

  final List<DaySummary> days;

  @override
  Widget build(BuildContext context) {
    if (days.isEmpty) {
      return const _EmptyHistory();
    }

    return ListView.separated(
      itemCount: days.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) => _DayTile(day: days[index]),
    );
  }
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.history_toggle_off_outlined,
            size: 40,
            color: scheme.onSurfaceVariant,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            AppStrings.emptyHistory,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            AppStrings.emptyHistoryHint,
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _DayTile extends StatelessWidget {
  const _DayTile({required this.day});

  final DaySummary day;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final average = day.averageInterval;

    return AppCard(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.pushNamed(
          'historyDay',
          pathParameters: {'date': _dateKeyFormat.format(day.localDate)},
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    TimeDisplay.formatWeekdayDateHeader(day.localDate),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    average == null
                        ? '${AppStrings.smokeCountLabel}: ${day.smokeCount}'
                        : '${day.smokeCount} · ${AppStrings.averageIntervalLabel}: '
                              '${TimeDisplay.formatIntervalShort(average)}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: scheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}

class _CalendarView extends StatelessWidget {
  const _CalendarView({
    required this.days,
    required this.month,
    required this.onMonthChanged,
  });

  final List<DaySummary> days;
  final DateTime month;
  final ValueChanged<DateTime> onMonthChanged;

  static const _weekdayLabels = [
    'Pzt',
    'Sal',
    'Çar',
    'Per',
    'Cum',
    'Cmt',
    'Paz',
  ];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final byDate = <DateTime, DaySummary>{
      for (final d in days) d.localDate: d,
    };

    final firstOfMonth = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final leadingBlanks = firstOfMonth.weekday - 1; // Monday-first grid.
    final maxCount = days.fold<int>(
      1,
      (m, d) => d.smokeCount > m ? d.smokeCount : m,
    );

    final cells = <DateTime?>[
      for (var i = 0; i < leadingBlanks; i++) null,
      for (var day = 1; day <= daysInMonth; day++)
        DateTime(month.year, month.month, day),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            IconButton(
              tooltip: AppStrings.previousMonth,
              icon: const Icon(Icons.chevron_left),
              onPressed: () =>
                  onMonthChanged(DateTime(month.year, month.month - 1)),
            ),
            Expanded(
              child: Text(
                TimeDisplay.formatMonthYear(month),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            IconButton(
              tooltip: AppStrings.nextMonth,
              icon: const Icon(Icons.chevron_right),
              onPressed: () =>
                  onMonthChanged(DateTime(month.year, month.month + 1)),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            for (final label in _weekdayLabels)
              Expanded(
                child: Center(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        Expanded(
          child: GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: AppSpacing.xs,
              crossAxisSpacing: AppSpacing.xs,
            ),
            itemCount: cells.length,
            itemBuilder: (context, index) {
              final date = cells[index];
              if (date == null) return const SizedBox.shrink();
              final summary = byDate[date];
              final count = summary?.smokeCount ?? 0;
              final intensity = count == 0
                  ? 0.0
                  : (count / maxCount).clamp(0.15, 1.0);

              return _CalendarDayCell(
                date: date,
                count: count,
                intensity: intensity,
                onTap: () => context.pushNamed(
                  'historyDay',
                  pathParameters: {'date': _dateKeyFormat.format(date)},
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CalendarDayCell extends StatelessWidget {
  const _CalendarDayCell({
    required this.date,
    required this.count,
    required this.intensity,
    required this.onTap,
  });

  final DateTime date;
  final int count;
  final double intensity;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isToday = _isSameDay(date, DateTime.now());
    final background = count == 0
        ? scheme.surfaceContainerLowest
        : Color.alphaBlend(
            scheme.primary.withValues(alpha: intensity * 0.55),
            scheme.surfaceContainerLowest,
          );

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isToday
                ? scheme.primary
                : scheme.outlineVariant.withValues(alpha: 0.5),
            width: isToday ? 1.5 : 1,
          ),
        ),
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${date.day}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                color: count > 0 ? scheme.onSurface : scheme.onSurfaceVariant,
              ),
            ),
            if (count > 0)
              Text(
                '$count',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: scheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
          ],
        ),
      ),
    );
  }

  static bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
