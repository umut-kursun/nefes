import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';

/// Daily consumption vs limit — budget framing, not achievement.
class NefesBudgetProgress extends StatelessWidget {
  const NefesBudgetProgress({
    super.key,
    required this.used,
    required this.limit,
    this.exceeded = false,
    this.showLabels = true,
    this.onEditLimit,
  });

  final int used;
  final int limit;
  final bool exceeded;
  final bool showLabels;
  final VoidCallback? onEditLimit;

  @override
  Widget build(BuildContext context) {
    final safeLimit = limit <= 0 ? 1 : limit;
    final ratio = (used / safeLimit).clamp(0.0, 1.0);
    final remaining = limit - used;
    final trackColor = AppColors.progressTrack;
    final fillColor = exceeded ? AppColors.exceeded : AppColors.progress;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: AppRadius.xsAll,
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: ratio),
            duration: AppMotion.normal,
            curve: AppMotion.standard,
            builder: (context, value, _) {
              return SizedBox(
                height: 8,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ColoredBox(color: trackColor),
                    FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: value,
                      child: ColoredBox(color: fillColor),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        if (showLabels) ...[
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: Text.rich(
                  TextSpan(
                    style: Theme.of(context).textTheme.bodyMedium,
                    children: [
                      TextSpan(
                        text: '$used',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                      TextSpan(
                        text: ' ${AppStrings.usedLabel}',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                      TextSpan(
                        text: '  ·  ',
                        style: TextStyle(color: AppColors.textMuted),
                      ),
                      TextSpan(
                        text: AppStrings.limitShort(limit),
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
              if (onEditLimit != null)
                IconButton(
                  tooltip: AppStrings.editLimit,
                  onPressed: onEditLimit,
                  visualDensity: VisualDensity.compact,
                  iconSize: 18,
                  color: AppColors.textMuted,
                  icon: const Icon(Icons.edit_outlined),
                ),
            ],
          ),
          Text(
            exceeded
                ? AppStrings.limitExceeded
                : AppStrings.remainingCount(remaining < 0 ? 0 : remaining),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: exceeded ? AppColors.exceeded : AppColors.textMuted,
            ),
          ),
        ],
      ],
    );
  }
}
