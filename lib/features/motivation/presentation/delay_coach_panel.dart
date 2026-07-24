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

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                (state.delayTimedOut
                        ? AppStrings.delayTimeUp
                        : AppStrings.delayCoachTitle)
                    .toUpperCase(),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppColors.textMuted,
                  letterSpacing: 0.6,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Consumer(
              builder: (context, ref, _) {
                final label = ref.watch(
                  homeViewModelProvider.select((s) => s.delayElapsedLabel),
                );
                return AnimatedSwitcher(
                  duration: AppMotion.fast,
                  switchInCurve: AppMotion.standard,
                  switchOutCurve: AppMotion.standard,
                  transitionBuilder: (child, animation) {
                    return FadeTransition(
                      opacity: animation,
                      child: child,
                    );
                  },
                  child: Text(
                    label,
                    key: ValueKey(label),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                      fontWeight: FontWeight.w700,
                      color: AppColors.forestMid,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
        if (state.motivationBody != null) ...[
          const SizedBox(height: AppSpacing.sm),
          AnimatedSwitcher(
            duration: AppMotion.normal,
            switchInCurve: AppMotion.standard,
            switchOutCurve: AppMotion.standard,
            layoutBuilder: (currentChild, previousChildren) {
              return Stack(
                alignment: Alignment.topLeft,
                children: <Widget>[
                  ...previousChildren,
                  ?currentChild,
                ],
              );
            },
            transitionBuilder: (child, animation) {
              final offset = Tween<Offset>(
                begin: const Offset(0, 0.08),
                end: Offset.zero,
              ).animate(animation);
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(position: offset, child: child),
              );
            },
            child: Text(
              state.motivationBody!,
              key: ValueKey(state.motivationMessageId ?? state.motivationBody),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textPrimary,
                height: 1.35,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
        if (state.coachMoneyCaption != null) ...[
          const SizedBox(height: AppSpacing.xs),
          AnimatedSwitcher(
            duration: AppMotion.fast,
            child: Text(
              state.coachMoneyCaption!,
              key: ValueKey(state.coachMoneyCaption),
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: FilledButton.tonal(
                onPressed: state.isBusy ? null : onUrgePassed,
                child: const Text(AppStrings.urgePassed),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: OutlinedButton(
                onPressed: state.isBusy ? null : onSmoke,
                child: const Text(AppStrings.delayOutcomeSmoke),
              ),
            ),
          ],
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
    );
  }
}
