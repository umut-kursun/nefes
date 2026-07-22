import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';

/// Compact horizontal metrics strip (Today / Day Detail).
class NefesMetricStrip extends StatelessWidget {
  const NefesMetricStrip({super.key, required this.metrics});

  final List<NefesMetric> metrics;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.lg,
      runSpacing: AppSpacing.sm,
      children: [
        for (final m in metrics)
          _MetricChip(
            label: m.label,
            value: m.value,
            emphasis: m.emphasis,
          ),
      ],
    );
  }
}

class NefesMetric {
  const NefesMetric({
    required this.label,
    required this.value,
    this.emphasis = false,
  });

  final String label;
  final String value;
  final bool emphasis;
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({
    required this.label,
    required this.value,
    required this.emphasis,
  });

  final String label;
  final String value;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: AppColors.textMuted,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: emphasis ? FontWeight.w700 : FontWeight.w600,
            color: emphasis ? AppColors.forest : AppColors.textPrimary,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
