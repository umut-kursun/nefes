import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';

/// Typography-driven elapsed timer — the visual signature of Today.
///
/// HH:MM is dominant; seconds are deliberately quieter.
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

    final reduceMotion = MediaQuery.disableAnimationsOf(context);

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
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              '$hh:$mm',
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
                fontWeight: FontWeight.w700,
                letterSpacing: -1.5,
                height: 1.0,
                color: AppColors.forest,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(
              ss,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
                height: 1.0,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        // Subtle "breath" line — time / pause / awareness.
        _BreathLine(animate: !reduceMotion),
      ],
    );
  }
}

class _BreathLine extends StatefulWidget {
  const _BreathLine({required this.animate});

  final bool animate;

  @override
  State<_BreathLine> createState() => _BreathLineState();
}

class _BreathLineState extends State<_BreathLine>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    );
    if (widget.animate) {
      _controller.repeat(reverse: true);
    } else {
      _controller.value = 0.55;
    }
  }

  @override
  void didUpdateWidget(covariant _BreathLine oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animate && !_controller.isAnimating) {
      _controller.repeat(reverse: true);
    } else if (!widget.animate && _controller.isAnimating) {
      _controller.stop();
      _controller.value = 0.55;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = Curves.easeInOut.transform(_controller.value);
        final widthFactor = 0.28 + (t * 0.42);
        final opacity = 0.35 + (t * 0.45);
        return Align(
          alignment: Alignment.centerLeft,
          child: FractionallySizedBox(
            widthFactor: widthFactor,
            child: Container(
              height: 2,
              decoration: BoxDecoration(
                color: AppColors.forestSoft.withValues(alpha: opacity),
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Compact daily limit — single representation, budget framing.
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text.rich(
                TextSpan(
                  style: Theme.of(context).textTheme.titleMedium,
                  children: [
                    TextSpan(
                      text: '$used',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontFeatures: [FontFeature.tabularFigures()],
                        color: AppColors.forest,
                      ),
                    ),
                    TextSpan(
                      text: ' ${AppStrings.cigarettesUnit}',
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            GestureDetector(
              onTap: onEditLimit,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    AppStrings.limitShort(limit),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (onEditLimit != null) ...[
                    const SizedBox(width: 4),
                    const Icon(
                      Icons.edit_outlined,
                      size: 14,
                      color: AppColors.textMuted,
                    ),
                  ],
                ],
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
                height: 4,
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
            color: exceeded ? AppColors.exceeded : AppColors.textMuted,
          ),
        ),
      ],
    );
  }
}

/// Compact typographic metrics — no card.
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

    final parts = <String>[
      AppStrings.smokeCountShort(count),
      if (averageLabel != null) '$averageLabel ${AppStrings.snapshotAverage}',
      if (longestLabel != null) '$longestLabel ${AppStrings.snapshotLongest}',
    ];

    return Text(
      parts.join('  ·  '),
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
        color: AppColors.textSecondary,
        height: 1.3,
      ),
    );
  }
}

/// Subtle editorial insight caption.
class InsightCaption extends StatelessWidget {
  const InsightCaption({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 2,
            decoration: BoxDecoration(
              color: AppColors.mist,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
