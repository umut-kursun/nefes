import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/app_card.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/habit/domain/services/insights_engine.dart';

/// Insights screen — period chips, KPI cards, a bar chart, and observations.
class InsightsPage extends ConsumerStatefulWidget {
  const InsightsPage({super.key});

  @override
  ConsumerState<InsightsPage> createState() => _InsightsPageState();
}

class _InsightsPageState extends ConsumerState<InsightsPage> {
  var _period = InsightsPeriod.days7;

  @override
  Widget build(BuildContext context) {
    final eventsAsync = ref.watch(allSmokingEventsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.insightsTitle)),
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
                      _PeriodChips(
                        selected: _period,
                        onChanged: (period) =>
                            setState(() => _period = period),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Expanded(
                        child: eventsAsync.when(
                          data: (events) {
                            final snapshot = InsightsEngine.build(
                              allEvents: events,
                              nowLocal: DateTime.now(),
                              period: _period,
                            );
                            if (snapshot.totalSmokes == 0) {
                              return const _EmptyInsights();
                            }
                            return ListView(
                              children: [
                                _KpiGrid(snapshot: snapshot, isWide: isWide),
                                const SizedBox(height: AppSpacing.lg),
                                Text(
                                  AppStrings.dailyChartTitle,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                AppCard(
                                  child: _DailyBarChart(
                                    dailyCounts: snapshot.dailyCounts,
                                  ),
                                ),
                                if (snapshot.insights.isNotEmpty) ...[
                                  const SizedBox(height: AppSpacing.lg),
                                  Text(
                                    AppStrings.insightsListTitle,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  _InsightsList(insights: snapshot.insights),
                                ],
                              ],
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

class _PeriodChips extends StatelessWidget {
  const _PeriodChips({required this.selected, required this.onChanged});

  final InsightsPeriod selected;
  final ValueChanged<InsightsPeriod> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<InsightsPeriod>(
      segments: const [
        ButtonSegment(
          value: InsightsPeriod.days7,
          label: Text(AppStrings.period7Days),
        ),
        ButtonSegment(
          value: InsightsPeriod.days30,
          label: Text(AppStrings.period30Days),
        ),
        ButtonSegment(
          value: InsightsPeriod.thisMonth,
          label: Text(AppStrings.periodThisMonth),
        ),
      ],
      selected: {selected},
      onSelectionChanged: (values) => onChanged(values.first),
    );
  }
}

class _EmptyInsights extends StatelessWidget {
  const _EmptyInsights();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.insights_outlined,
            size: 40,
            color: scheme.onSurfaceVariant,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            AppStrings.insightsEmpty,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            AppStrings.insightsEmptyHint,
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

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.snapshot, required this.isWide});

  final InsightsSnapshot snapshot;
  final bool isWide;

  @override
  Widget build(BuildContext context) {
    final tiles = <_KpiTile>[
      _KpiTile(
        label: AppStrings.totalSmokesLabel,
        value: '${snapshot.totalSmokes}',
      ),
      _KpiTile(
        label: AppStrings.dailyAverageLabel,
        value: _formatAverage(snapshot.dailyAverage),
      ),
      _KpiTile(
        label: AppStrings.averageIntervalLabel,
        value: snapshot.averageInterval == null
            ? '—'
            : TimeDisplay.formatIntervalShort(snapshot.averageInterval!),
      ),
      _KpiTile(
        label: AppStrings.delayAttemptsLabel,
        value: '${snapshot.delayAttempts}',
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isWide ? 4 : 2,
        mainAxisSpacing: AppSpacing.sm,
        crossAxisSpacing: AppSpacing.sm,
        childAspectRatio: 1.5,
      ),
      itemCount: tiles.length,
      itemBuilder: (context, index) => tiles[index],
    );
  }

  static String _formatAverage(double value) {
    final rounded = (value * 10).round() / 10;
    if (rounded == rounded.roundToDouble()) {
      return rounded.round().toString();
    }
    return rounded.toStringAsFixed(1).replaceAll('.', ',');
  }
}

class _KpiTile extends StatelessWidget {
  const _KpiTile({required this.label, required this.value});

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

class _DailyBarChart extends StatelessWidget {
  const _DailyBarChart({required this.dailyCounts});

  final List<({DateTime day, int count})> dailyCounts;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 140,
      width: double.infinity,
      child: CustomPaint(
        painter: _DailyBarsPainter(
          counts: [for (final d in dailyCounts) d.count],
          barColor: scheme.primary,
          trackColor: scheme.surfaceContainerHighest,
        ),
      ),
    );
  }
}

class _DailyBarsPainter extends CustomPainter {
  _DailyBarsPainter({
    required this.counts,
    required this.barColor,
    required this.trackColor,
  });

  final List<int> counts;
  final Color barColor;
  final Color trackColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (counts.isEmpty) return;

    final maxCount = counts.fold<int>(1, (m, c) => c > m ? c : m);
    final barCount = counts.length;
    const gap = 4.0;
    final totalGap = gap * (barCount - 1);
    final barWidth = ((size.width - totalGap) / barCount).clamp(2.0, 40.0);
    final paintBar = Paint()..color = barColor;
    final paintTrack = Paint()..color = trackColor;
    const radius = Radius.circular(6);

    for (var i = 0; i < barCount; i++) {
      final x = i * (barWidth + gap);
      final trackRect = Rect.fromLTWH(x, 0, barWidth, size.height);
      canvas.drawRRect(
        RRect.fromRectAndRadius(trackRect, radius),
        paintTrack,
      );

      final ratio = (counts[i] / maxCount).clamp(0.0, 1.0);
      if (ratio <= 0) continue;
      final barHeight = size.height * ratio;
      final barRect = Rect.fromLTWH(
        x,
        size.height - barHeight,
        barWidth,
        barHeight,
      );
      canvas.drawRRect(RRect.fromRectAndRadius(barRect, radius), paintBar);
    }
  }

  @override
  bool shouldRepaint(covariant _DailyBarsPainter oldDelegate) {
    return oldDelegate.counts != counts ||
        oldDelegate.barColor != barColor ||
        oldDelegate.trackColor != trackColor;
  }
}

class _InsightsList extends StatelessWidget {
  const _InsightsList({required this.insights});

  final List<String> insights;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < insights.length; i++) ...[
            if (i > 0) const SizedBox(height: AppSpacing.sm),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.circle,
                  size: 6,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    insights[i],
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
