import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nefes/core/design_system/nefes_page.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/habit/domain/services/history_analytics.dart';

final _dateKeyFormat = DateFormat('yyyy-MM-dd');

/// History screen — compact day list or tonal calendar.
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
      backgroundColor: AppColors.canvasLight,
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
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.sm,
                    AppSpacing.lg,
                    AppSpacing.md,
                  ),
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
                          error: (_, _) => const Center(
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
          icon: Icon(Icons.view_list_outlined, size: 18),
        ),
        ButtonSegment(
          value: _HistoryTab.calendar,
          label: Text(AppStrings.historyCalendar),
          icon: Icon(Icons.calendar_month_outlined, size: 18),
        ),
      ],
      selected: {selected},
      onSelectionChanged: (values) => onChanged(values.first),
      showSelectedIcon: false,
    );
  }
}

class _DayListView extends StatelessWidget {
  const _DayListView({required this.days});

  final List<DaySummary> days;

  @override
  Widget build(BuildContext context) {
    if (days.isEmpty) {
      return const NefesEmptyState(
        title: AppStrings.emptyHistory,
        hint: AppStrings.emptyHistoryHint,
        icon: Icons.history_toggle_off_outlined,
      );
    }

    return ListView.separated(
      itemCount: days.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) => _DayRow(day: days[index]),
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({required this.day});

  final DaySummary day;

  @override
  Widget build(BuildContext context) {
    final average = day.averageInterval;
    final meta = [
      AppStrings.smokeCountShort(day.smokeCount),
      if (average != null)
        '${AppStrings.averageIntervalLabel} ${TimeDisplay.formatIntervalShort(average)}',
    ].join(' · ');

    return InkWell(
      onTap: () => context.pushNamed(
        'historyDay',
        pathParameters: {'date': _dateKeyFormat.format(day.localDate)},
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    TimeDisplay.formatWeekdayDateHeader(day.localDate),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    meta,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              size: 20,
              color: AppColors.textMuted,
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
    final byDate = <DateTime, DaySummary>{
      for (final d in days) d.localDate: d,
    };

    final firstOfMonth = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final leadingBlanks = firstOfMonth.weekday - 1;
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
                style: Theme.of(context).textTheme.titleMedium,
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
                      color: AppColors.textMuted,
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
                  : (count / maxCount).clamp(0.18, 0.72);

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
    final isToday = _isSameDay(date, DateTime.now());
    final hasData = count > 0;
    final background = !hasData
        ? Colors.transparent
        : Color.alphaBlend(
            AppColors.forestSoft.withValues(alpha: intensity * 0.35),
            AppColors.surfaceMuted,
          );

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.smAll,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: background,
          borderRadius: AppRadius.smAll,
          border: isToday
              ? Border.all(color: AppColors.forest, width: 1.5)
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '${date.day}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                color: hasData ? AppColors.textPrimary : AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 2),
            if (hasData)
              Container(
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: AppColors.forestSoft,
                  shape: BoxShape.circle,
                ),
              )
            else
              const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }

  static bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
