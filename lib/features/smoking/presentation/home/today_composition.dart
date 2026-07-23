import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';

/// Typography-driven elapsed timer — the visual signature of Today.
///
/// HH:MM is dominant; `:ss` sits on the same baseline as a quieter companion.
class ElapsedTimerSignature extends StatelessWidget {
  const ElapsedTimerSignature({
    super.key,
    required this.elapsedLabel,
    required this.hasLastSmoke,
  });

  /// Expected format from [TimeDisplay.formatElapsedClock]: `HH:MM:SS`.
  final String elapsedLabel;
  final bool hasLastSmoke;

  @override
  Widget build(BuildContext context) {
    if (!hasLastSmoke) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.sinceLastCigarette.toUpperCase(),
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: AppColors.textMuted,
              letterSpacing: 1.0,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            AppStrings.noCigaretteYet,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: AppColors.textSecondary,
              height: 1.35,
            ),
          ),
        ],
      );
    }

    final parts = elapsedLabel.split(':');
    final hh = parts.isNotEmpty ? parts[0] : '00';
    final mm = parts.length > 1 ? parts[1] : '00';
    final ss = parts.length > 2 ? parts[2] : '00';

    // Fixed block height + tabular figures keep the signature stable each tick.
    const timerBlockHeight = 40.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppStrings.sinceLastCigarette.toUpperCase(),
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: AppColors.textMuted,
            letterSpacing: 1.0,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: timerBlockHeight,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$hh:$mm',
                style: Theme.of(context).textTheme.displayMedium?.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                  fontWeight: FontWeight.w700,
                  letterSpacing: -1.4,
                  height: 1.0,
                  color: AppColors.forest,
                ),
              ),
              Text(
                ':$ss',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                  fontWeight: FontWeight.w500,
                  letterSpacing: -0.2,
                  height: 1.0,
                  color: AppColors.textTertiary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Compact daily limit — single representation, budget framing.
///
/// Width is capped so the bar stays optically tied to its labels on desktop.
class CompactDailyLimit extends StatelessWidget {
  const CompactDailyLimit({
    super.key,
    required this.used,
    required this.limit,
    required this.exceeded,
    this.onEditLimit,
  });

  final int used;
  final int limit;
  final bool exceeded;
  final VoidCallback? onEditLimit;

  @override
  Widget build(BuildContext context) {
    final safeLimit = limit <= 0 ? 1 : limit;
    final ratio = (used / safeLimit).clamp(0.0, 1.0);
    final remaining = (limit - used).clamp(0, 999999);
    final fill = exceeded ? AppColors.exceeded : AppColors.progress;

    return Align(
      alignment: Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: AppBreakpoints.todayDenseBlock,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '$used',
                          style:
                              Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            fontFeatures: const [FontFeature.tabularFigures()],
                            color: AppColors.forest,
                            height: 1.05,
                            letterSpacing: -0.3,
                          ),
                        ),
                        TextSpan(
                          text: ' ${AppStrings.cigarettesUnit}',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onEditLimit,
                    borderRadius: AppRadius.smAll,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(
                        minWidth: 44,
                        minHeight: 44,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              AppStrings.limitShort(limit),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: AppColors.textSecondary,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            if (onEditLimit != null) ...[
                              const SizedBox(width: AppSpacing.xs),
                              const Icon(
                                Icons.edit_outlined,
                                size: 16,
                                color: AppColors.textMuted,
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.pill),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: ratio),
                duration: AppMotion.normal,
                curve: AppMotion.standard,
                builder: (context, value, _) {
                  return SizedBox(
                    height: 3,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        const ColoredBox(color: AppColors.progressTrack),
                        FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: value,
                          child: ColoredBox(color: fill),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              exceeded
                  ? AppStrings.limitExceeded
                  : AppStrings.remainingCount(remaining),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: exceeded ? AppColors.exceeded : AppColors.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Compact three-column typographic metrics — no card.
class CompactTodayMetrics extends StatelessWidget {
  const CompactTodayMetrics({
    super.key,
    required this.count,
    this.averageLabel,
    this.longestLabel,
  });

  final int count;
  final String? averageLabel;
  final String? longestLabel;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _MetricCell(
            value: '$count',
            label: AppStrings.cigarettesUnit,
            emphasize: true,
          ),
        ),
        if (averageLabel != null) ...[
          const _MetricDivider(),
          Expanded(
            child: _MetricCell(
              value: averageLabel!,
              label: AppStrings.snapshotAverage,
            ),
          ),
        ],
        if (longestLabel != null) ...[
          const _MetricDivider(),
          Expanded(
            child: _MetricCell(
              value: longestLabel!,
              label: AppStrings.snapshotLongest,
            ),
          ),
        ],
      ],
    );
  }
}

class _MetricDivider extends StatelessWidget {
  const _MetricDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 30,
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      color: AppColors.divider,
    );
  }
}

class _MetricCell extends StatelessWidget {
  const _MetricCell({
    required this.value,
    required this.label,
    this.emphasize = false,
  });

  final String value;
  final String label;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            maxLines: 1,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
              color: emphasize ? AppColors.forest : AppColors.textPrimary,
              height: 1.1,
            ),
          ),
        ),
        const SizedBox(height: 3),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: AppColors.textMuted,
            letterSpacing: 0.15,
            height: 1.2,
          ),
        ),
      ],
    );
  }
}

/// Quiet observational caption — not an alert.
class InsightCaption extends StatelessWidget {
  const InsightCaption({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(
              Icons.insights_outlined,
              size: 14,
              color: AppColors.insightAccent,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Container(
            width: 2,
            decoration: BoxDecoration(
              color: AppColors.insightAccent,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Primary + secondary behavioral actions as one intentional system.
///
/// Always stacked vertically with explicit heights so buttons cannot collapse
/// under unbounded cross-axis constraints (e.g. Row + stretch in a scroll view).
class TodayBehaviorActions extends StatelessWidget {
  const TodayBehaviorActions({
    super.key,
    required this.isBusy,
    required this.isSaving,
    required this.showDelayAction,
    required this.onSmoke,
    required this.onDelay,
  });

  final bool isBusy;
  final bool isSaving;
  final bool showDelayAction;
  final VoidCallback onSmoke;
  final VoidCallback onDelay;

  @override
  Widget build(BuildContext context) {
    final wide =
        MediaQuery.sizeOf(context).width >= AppBreakpoints.dashboardWide;

    return Align(
      alignment: Alignment.centerLeft,
      child: SizedBox(
        // Mobile: expand to content column. Desktop: dense action width.
        width: wide ? AppBreakpoints.todayDenseBlock : double.infinity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            _PrimaryLogButton(
              isBusy: isBusy,
              isSaving: isSaving,
              onPressed: onSmoke,
            ),
            if (showDelayAction) ...[
              const SizedBox(height: AppSpacing.sm),
              _SecondaryDelayButton(isBusy: isBusy, onPressed: onDelay),
            ],
          ],
        ),
      ),
    );
  }
}

class _PrimaryLogButton extends StatelessWidget {
  const _PrimaryLogButton({
    required this.isBusy,
    required this.isSaving,
    required this.onPressed,
  });

  final bool isBusy;
  final bool isSaving;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    // Explicit on-forest color — theme titleMedium is dark and would vanish
    // on the forest fill until hover overlays lighten the surface.
    final labelStyle = Theme.of(context).textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
      height: 1.1,
      color: AppColors.textOnForest,
    );

    return SizedBox(
      height: 52,
      child: FilledButton(
        onPressed: isBusy ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.forest,
          foregroundColor: AppColors.textOnForest,
          disabledBackgroundColor: AppColors.forest.withValues(alpha: 0.4),
          disabledForegroundColor:
              AppColors.textOnForest.withValues(alpha: 0.7),
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          textStyle: labelStyle,
        ).copyWith(
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return AppColors.textOnForest.withValues(alpha: 0.14);
            }
            if (states.contains(WidgetState.hovered)) {
              return AppColors.textOnForest.withValues(alpha: 0.08);
            }
            if (states.contains(WidgetState.focused)) {
              return AppColors.textOnForest.withValues(alpha: 0.1);
            }
            return null;
          }),
        ),
        child: AnimatedSwitcher(
          duration: AppMotion.fast,
          child: isSaving
              ? const SizedBox(
                  key: ValueKey('saving'),
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.textOnForest,
                  ),
                )
              : Row(
                  key: const ValueKey('label'),
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.add,
                      size: 22,
                      color: AppColors.textOnForest,
                    ),
                    const SizedBox(width: 10),
                    Text(AppStrings.iSmoked, style: labelStyle),
                  ],
                ),
        ),
      ),
    );
  }
}

class _SecondaryDelayButton extends StatelessWidget {
  const _SecondaryDelayButton({
    required this.isBusy,
    required this.onPressed,
  });

  final bool isBusy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final titleColor = isBusy ? AppColors.textMuted : AppColors.textOnSage;
    final iconColor = isBusy ? AppColors.textMuted : AppColors.forestMid;
    final chevronColor = isBusy ? AppColors.textMuted : AppColors.forestSoft;

    return Material(
      color: AppColors.surfaceSecondaryAction,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.mdAll,
        side: BorderSide(
          color: AppColors.outlineSoft.withValues(alpha: 0.55),
        ),
      ),
      child: InkWell(
        onTap: isBusy ? null : onPressed,
        borderRadius: AppRadius.mdAll,
        overlayColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.pressed)) {
            return AppColors.forest.withValues(alpha: 0.1);
          }
          if (states.contains(WidgetState.hovered)) {
            return AppColors.forest.withValues(alpha: 0.06);
          }
          if (states.contains(WidgetState.focused)) {
            return AppColors.forest.withValues(alpha: 0.08);
          }
          return null;
        }),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(
                  Icons.pause_circle_outline,
                  size: 22,
                  color: iconColor,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        AppStrings.delayNow,
                        style:
                            Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: titleColor,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        AppStrings.delayHint,
                        style:
                            Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppColors.textSecondary,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: chevronColor,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
