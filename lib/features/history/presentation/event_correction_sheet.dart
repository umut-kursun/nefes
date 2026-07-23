import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/domain/services/trigger_personalizer.dart';
import 'package:nefes/features/smoking/presentation/home/optional_context_bar.dart';
import 'package:nefes/features/smoking/presentation/triggers/smoking_trigger_labels.dart';

/// Subtle event correction sheet for Day Detail — not a full editor.
Future<void> showEventCorrectionSheet({
  required BuildContext context,
  required WidgetRef ref,
  required String smokeEventId,
  required DateTime currentLocal,
  SmokingTrigger? currentTrigger,
}) async {
  await showModalBottomSheet<void>(
    context: context,
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
                AppStrings.editEvent,
                style: Theme.of(sheetContext).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpacing.sm),
              ListTile(
                leading: const Icon(Icons.schedule_outlined),
                title: const Text(AppStrings.editEventTime),
                subtitle: Text(
                  '${currentLocal.hour.toString().padLeft(2, '0')}:'
                  '${currentLocal.minute.toString().padLeft(2, '0')}',
                ),
                onTap: () async {
                  Navigator.of(sheetContext).pop();
                  await Future<void>.delayed(Duration.zero);
                  if (!context.mounted) return;
                  await _editTime(context, ref, smokeEventId, currentLocal);
                },
              ),
              ListTile(
                leading: const Icon(Icons.label_outline),
                title: Text(
                  currentTrigger == null
                      ? AppStrings.editEventTrigger
                      : '${AppStrings.editEventTrigger} · ${SmokingTriggerLabels.label(currentTrigger)}',
                ),
                onTap: () async {
                  Navigator.of(sheetContext).pop();
                  await Future<void>.delayed(Duration.zero);
                  if (!context.mounted) return;
                  await _editTrigger(context, ref, smokeEventId);
                },
              ),
              if (currentTrigger != null)
                ListTile(
                  leading: const Icon(Icons.label_off_outlined),
                  title: const Text(AppStrings.clearTrigger),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await Future<void>.delayed(Duration.zero);
                    if (!context.mounted) return;
                    await ref.read(smokingHabitActionsProvider).removeEventContext(
                          smokeEventId: smokeEventId,
                        );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text(AppStrings.eventUpdated)),
                      );
                    }
                  },
                ),
              ListTile(
                leading: Icon(Icons.delete_outline, color: AppColors.exceeded),
                title: Text(
                  AppStrings.deleteEvent,
                  style: TextStyle(color: AppColors.exceeded),
                ),
                onTap: () async {
                  Navigator.of(sheetContext).pop();
                  await Future<void>.delayed(Duration.zero);
                  if (!context.mounted) return;
                  await _confirmDelete(context, ref, smokeEventId);
                },
              ),
            ],
          ),
        ),
      );
    },
  );
}

Future<void> _editTime(
  BuildContext context,
  WidgetRef ref,
  String smokeEventId,
  DateTime currentLocal,
) async {
  final picked = await showTimePicker(
    context: context,
    initialTime: TimeOfDay.fromDateTime(currentLocal),
  );
  if (picked == null || !context.mounted) return;

  var local = DateTime(
    currentLocal.year,
    currentLocal.month,
    currentLocal.day,
    picked.hour,
    picked.minute,
  );
  final now = DateTime.now();
  if (local.isAfter(now.add(const Duration(minutes: 1)))) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text(AppStrings.invalidPastTime)),
    );
    return;
  }

  try {
    await ref.read(smokingHabitActionsProvider).editEventTime(
          smokeEventId: smokeEventId,
          newLocalTime: local,
        );
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(AppStrings.eventUpdated)),
      );
    }
  } catch (_) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(AppStrings.smokeSaveFailed)),
      );
    }
  }
}

Future<void> _editTrigger(
  BuildContext context,
  WidgetRef ref,
  String smokeEventId,
) async {
  final trigger = await showMoreTriggersSheet(
    context: context,
    quickTriggers: TriggerPersonalizer.defaultQuickOrder,
  );
  if (trigger == null || !context.mounted) return;
  await ref.read(smokingHabitActionsProvider).updateEventContext(
        smokeEventId: smokeEventId,
        trigger: trigger,
      );
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text(AppStrings.eventUpdated)),
    );
  }
}

Future<void> _confirmDelete(
  BuildContext context,
  WidgetRef ref,
  String smokeEventId,
) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text(AppStrings.deleteEventConfirmTitle),
      content: const Text(AppStrings.deleteEventConfirmBody),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: const Text(AppStrings.cancel),
        ),
        FilledButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          child: const Text(AppStrings.deleteEventConfirmAction),
        ),
      ],
    ),
  );
  if (ok != true || !context.mounted) return;
  await ref.read(smokingHabitActionsProvider).deleteEvent(
        smokeEventId: smokeEventId,
      );
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text(AppStrings.eventDeleted)),
    );
  }
}
