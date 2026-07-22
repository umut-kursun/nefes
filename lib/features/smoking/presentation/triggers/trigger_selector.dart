import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/presentation/triggers/smoking_trigger_labels.dart';

/// Optional post-smoke trigger picker (sheet on mobile, dialog on wide).
Future<void> showSmokeTriggerSelector({
  required BuildContext context,
  required bool isWide,
  required Future<void> Function(SmokingTrigger trigger) onSelected,
  required VoidCallback onSkipped,
}) async {
  if (isWide) {
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text(AppStrings.triggerQuestion),
          content: SizedBox(
            width: 360,
            child: _TriggerOptions(
              onSelected: (trigger) async {
                Navigator.of(dialogContext).pop();
                await onSelected(trigger);
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                onSkipped();
              },
              child: const Text(AppStrings.triggerSkip),
            ),
          ],
        );
      },
    ).then((_) {
      // If dismissed by barrier without choosing, treat as skip.
      // Caller clears pending when onSkipped / onSelected fires.
    });
    return;
  }

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) {
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
                AppStrings.triggerQuestion,
                style: Theme.of(sheetContext).textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.md),
              _TriggerOptions(
                onSelected: (trigger) async {
                  Navigator.of(sheetContext).pop();
                  await onSelected(trigger);
                },
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: () {
                  Navigator.of(sheetContext).pop();
                  onSkipped();
                },
                child: const Text(AppStrings.triggerSkip),
              ),
            ],
          ),
        ),
      );
    },
  );
}

class _TriggerOptions extends StatelessWidget {
  const _TriggerOptions({required this.onSelected});

  final Future<void> Function(SmokingTrigger trigger) onSelected;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final trigger in SmokingTriggerLabels.ordered)
          ActionChip(
            label: Text(SmokingTriggerLabels.label(trigger)),
            onPressed: () => onSelected(trigger),
          ),
      ],
    );
  }
}
