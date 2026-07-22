import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/nefes_metric_strip.dart';
import 'package:nefes/core/design_system/nefes_page.dart';
import 'package:nefes/core/design_system/nefes_surface.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/habit/domain/services/insights_engine.dart';

/// Insights — headline observation, compact KPIs, restrained chart.
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
      backgroundColor: AppColors.canvasLight,
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
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.sm,
                    AppSpacing.lg,
                    AppSpacing.md,
                  ),
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
                              return const NefesEmptyState(
                                title: AppStrings.insightsEmpty,
                                hint: AppStrings.insightsEmptyHint,
                                icon: Icons.insights_outlined,
                              );
                            }
                            return ListView(
                              children: [
                                if (snapshot.insights.isNotEmpty)
                                  _HeadlineInsight(
                                    text: snapshot.insights.first,
                                  ),
                                if (snapshot.insights.isNotEmpty)
                                  const SizedBox(height: AppSpacing.lg),
                                NefesSurface(
                                  tone: NefesSurfaceTone.raised,
                                  padding: const EdgeInsets.all(AppSpacing.lg),
                                  child: NefesMetricStrip(
                                    metrics: [
                                      NefesMetric(
                                        label: AppStrings.totalSmokesLabel,
                                        value: '${snapshot.totalSmokes}',
                                        emphasis: true,
                                      ),
                                      NefesMetric(
                                        label: AppStrings.dailyAverageLabel,
                                        value: _formatAverage(
                                          snapshot.dailyAverage,
                                        ),
                                      ),
                                      NefesMetric(
                                        label: AppStrings.averageIntervalLabel,
                                        value: snapshot.averageInterval == null
                                            ? '—'
                                            : TimeDisplay.formatIntervalShort(
                                                snapshot.averageInterval!,
                                              ),
                                      ),
                                      NefesMetric(
                                        label: AppStrings.delayAttemptsLabel,
                                        value: '${snapshot.delayAttempts}',
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.xl),
                                Text(
                                  AppStrings.dailyChartTitle.toUpperCase(),
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelMedium
                                      ?.copyWith(
                                        color: AppColors.textMuted,
                                        letterSpacing: 0.7,
                                      ),
                                ),
                                const SizedBox(height: AppSpacing.md),
                                SizedBox(
                                  height: 128,
                                  width: double.infinity,
                                  child: _DailyBarChart(
                                    dailyCounts: snapshot.dailyCounts,
                                  ),
                                ),
                                if (snapshot.insights.length > 1) ...[
                                  const SizedBox(height: AppSpacing.xl),
                                  Text(
                                    AppStrings.insightsListTitle.toUpperCase(),
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelMedium
                                        ?.copyWith(
                                          color: AppColors.textMuted,
                                          letterSpacing: 0.7,
                                        ),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  _InsightsList(
                                    insights: snapshot.insights.skip(1).toList(),
                                  ),
                                ],
                              ],
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

  static String _formatAverage(double value) {
    final rounded = (value * 10).round() / 10;
    if (rounded == rounded.roundToDouble()) {
      return rounded.round().toString();
    }
    return rounded.toStringAsFixed(1).replaceAll('.', ',');
  }
}

class _HeadlineInsight extends StatelessWidget {
  const _HeadlineInsight({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return NefesSurface(
      tone: NefesSurfaceTone.muted,
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
          height: 1.35,
          color: AppColors.forest,
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
      showSelectedIcon: false,
    );
  }
}

class _DailyBarChart extends StatelessWidget {
  const _DailyBarChart({required this.dailyCounts});

  final List<({DateTime day, int count})> dailyCounts;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DailyBarsPainter(
        counts: [for (final d in dailyCounts) d.count],
        barColor: AppColors.forestSoft,
        trackColor: AppColors.progressTrack,
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
    const gap = 3.0;
    final totalGap = gap * (barCount - 1);
    final barWidth = ((size.width - totalGap) / barCount).clamp(2.0, 28.0);
    final paintBar = Paint()..color = barColor;
    final paintTrack = Paint()..color = trackColor;
    const radius = Radius.circular(3);

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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < insights.length; i++) ...[
          if (i > 0) const Divider(height: AppSpacing.lg),
          Text(
            insights[i],
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              height: 1.4,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ],
    );
  }
}
