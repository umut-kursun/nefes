import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_view_model.dart';

/// Active Delay Coach surface — message + rotating progress cards.
///
/// Intentionally simple; visual polish can come later.
class DelayCoachPanel extends StatelessWidget {
  const DelayCoachPanel({
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
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
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
                    letterSpacing: 0.7,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (state.delayIntendedMinutes != null)
                Text(
                  AppStrings.delayIntended(state.delayIntendedMinutes!),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Consumer(
            builder: (context, ref, _) {
              final label = ref.watch(
                homeViewModelProvider.select((s) => s.delayElapsedLabel),
              );
              return Text(
                label,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                  fontWeight: FontWeight.w700,
                  color: AppColors.forestMid,
                ),
              );
            },
          ),
          if (state.motivationBody != null) ...[
            const SizedBox(height: AppSpacing.sm),
            AnimatedSwitcher(
              duration: AppMotion.normal,
              switchInCurve: AppMotion.standard,
              switchOutCurve: AppMotion.standard,
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
          if (state.coachCards.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (final card in state.coachCards) _ProgressChip(card: card),
              ],
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
              child: const Text(AppStrings.cancelDelay),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressChip extends StatelessWidget {
  const _ProgressChip({required this.card});

  final CoachCardVm card;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceSage,
        borderRadius: AppRadius.smAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            card.title,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            card.value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: AppColors.textOnSage,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
