import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/nefes_surface.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/trigger_personalizer.dart';
import 'package:nefes/features/smoking/presentation/triggers/smoking_trigger_labels.dart';

/// Non-blocking optional context after a cigarette is already saved.
class OptionalContextBar extends StatelessWidget {
  const OptionalContextBar({
    super.key,
    required this.quickTriggers,
    required this.onSelected,
    required this.onMore,
  });

  final List<SmokingTrigger> quickTriggers;
  final ValueChanged<SmokingTrigger> onSelected;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    return NefesSurface(
      tone: NefesSurfaceTone.muted,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.smokedSaved,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: AppColors.forest,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            AppStrings.whyOptional,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final t in quickTriggers)
                ActionChip(
                  label: Text(SmokingTriggerLabels.label(t)),
                  onPressed: () => onSelected(t),
                  visualDensity: VisualDensity.compact,
                ),
              ActionChip(
                avatar: const Icon(Icons.add, size: 16),
                label: const Text(AppStrings.moreTriggers),
                onPressed: onMore,
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

Future<SmokingTrigger?> showMoreTriggersSheet({
  required BuildContext context,
  required List<SmokingTrigger> quickTriggers,
}) {
  final remaining = TriggerPersonalizer.remainingTriggers(quickTriggers);
  return showModalBottomSheet<SmokingTrigger>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            AppSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                AppStrings.whyOptional,
                style: Theme.of(ctx).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final t in [...quickTriggers, ...remaining])
                    ActionChip(
                      label: Text(SmokingTriggerLabels.label(t)),
                      onPressed: () => Navigator.of(ctx).pop(t),
                    ),
                ],
              ),
            ],
          ),
        ),
      );
    },
  );
}
