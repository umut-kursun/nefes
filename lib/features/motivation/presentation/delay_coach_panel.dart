import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_view_model.dart';

/// Delay Coach embedded in the dashboard action area — not a separate card.
class DelayCoachAction extends StatelessWidget {
  const DelayCoachAction({
    super.key,
    required this.state,
    required this.onUrgePassed,
    required this.onCancel,
    required this.onSmoke,
  });

  final HomeUiState state;
  final VoidCallback onUrgePassed;
  final VoidCallback onCancel;
  final VoidCallback onSmoke;

  String? get _sessionMoney {
    final caption = state.coachMoneyCaption;
    if (caption == null) return null;
    // Extract "₺…" from "Bu oturum tahmini · ₺3,50" or similar.
    final match = RegExp(r'₺[\d.,]+').firstMatch(caption);
    return match?.group(0);
  }

  @override
  Widget build(BuildContext context) {
    final sessionMoney = _sessionMoney;
    final nextTarget = state.delayIntendedMinutes;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  flex: 6,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.eco,
                            size: 14,
                            color: AppColors.forestSoft,
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(
                            child: Text(
                              (state.delayTimedOut
                                      ? AppStrings.delayTimeUp
                                      : AppStrings.delayCoachTitle)
                                  .toUpperCase(),
                              style: Theme.of(context)
                                  .textTheme
                                  .labelMedium
                                  ?.copyWith(
                                    color: AppColors.forestSoft,
                                    letterSpacing: 0.6,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 10,
                                  ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Consumer(
                        builder: (context, ref, _) {
                          final label = ref.watch(
                            homeViewModelProvider
                                .select((s) => s.delayElapsedLabel),
                          );
                          return AnimatedSwitcher(
                            duration: AppMotion.fast,
                            switchInCurve: AppMotion.standard,
                            switchOutCurve: AppMotion.standard,
                            child: Text(
                              label,
                              key: ValueKey(label),
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    fontFeatures: const [
                                      FontFeature.tabularFigures(),
                                    ],
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.forestMid,
                                    height: 1.05,
                                  ),
                            ),
                          );
                        },
                      ),
                      if (state.motivationBody != null) ...[
                        const SizedBox(height: AppSpacing.xs),
                        AnimatedSwitcher(
                          duration: AppMotion.normal,
                          switchInCurve: AppMotion.standard,
                          switchOutCurve: AppMotion.standard,
                          child: Text(
                            state.motivationBody!,
                            key: ValueKey(
                              state.motivationMessageId ??
                                  state.motivationBody,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: AppColors.textPrimary,
                                  height: 1.3,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.sm),
                      const SizedBox(
                        height: 28,
                        width: double.infinity,
                        child: CustomPaint(painter: _CoachSparklinePainter()),
                      ),
                      if (nextTarget != null && nextTarget > 0) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          '${AppStrings.coachNextTargetPrefix} $nextTarget dakika',
                          style:
                              Theme.of(context).textTheme.labelMedium?.copyWith(
                                    color: AppColors.textMuted,
                                    fontWeight: FontWeight.w500,
                                    fontSize: 11,
                                  ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  flex: 5,
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted.withValues(alpha: 0.55),
                      borderRadius: AppRadius.mdAll,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: '${AppStrings.thisSession} ',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelMedium
                                    ?.copyWith(
                                      color: AppColors.textMuted,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 11,
                                    ),
                              ),
                              TextSpan(
                                text: sessionMoney ?? AppStrings.gainSavedUnset,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(
                                      color: AppColors.forestSoft,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                    ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        _CoachMiniButton(
                          label: AppStrings.urgePassed,
                          icon: Icons.check_rounded,
                          background: AppColors.badgeMoneyBg,
                          foreground: AppColors.forestSoft,
                          onPressed: state.isBusy ? null : onUrgePassed,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        _CoachMiniButton(
                          label: AppStrings.delayOutcomeSmoke,
                          icon: Icons.smoking_rooms_outlined,
                          background: AppColors.surfaceElevated,
                          foreground: AppColors.achievementChipFg,
                          borderColor: AppColors.achievementChipFg
                              .withValues(alpha: 0.55),
                          onPressed: state.isBusy ? null : onSmoke,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: state.isBusy ? null : onCancel,
              style: TextButton.styleFrom(
                visualDensity: VisualDensity.compact,
                minimumSize: const Size(44, 36),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              ),
              child: const Text(AppStrings.cancelDelay),
            ),
          ),
        ],
      ),
    );
  }
}

class _CoachMiniButton extends StatelessWidget {
  const _CoachMiniButton({
    required this.label,
    required this.icon,
    required this.background,
    required this.foreground,
    required this.onPressed,
    this.borderColor,
  });

  final String label;
  final IconData icon;
  final Color background;
  final Color foreground;
  final Color? borderColor;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.sm,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: borderColor == null
                ? null
                : Border.all(color: borderColor!),
          ),
          child: Row(
            children: [
              Icon(icon, size: 14, color: foreground),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: foreground,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Soft decorative sparkline — visual only, not data-bound.
class _CoachSparklinePainter extends CustomPainter {
  const _CoachSparklinePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.forestSoft.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path()
      ..moveTo(0, size.height * 0.7)
      ..quadraticBezierTo(
        size.width * 0.2,
        size.height * 0.9,
        size.width * 0.35,
        size.height * 0.45,
      )
      ..quadraticBezierTo(
        size.width * 0.55,
        size.height * 0.05,
        size.width * 0.7,
        size.height * 0.35,
      )
      ..quadraticBezierTo(
        size.width * 0.85,
        size.height * 0.55,
        size.width,
        size.height * 0.25,
      );
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
