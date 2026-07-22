import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';

/// Minimal two-field onboarding for daily target setup.
class TargetOnboardingSheet extends StatefulWidget {
  const TargetOnboardingSheet({
    super.key,
    required this.onCompleted,
  });

  final Future<void> Function({
    required int averagePerDay,
    required int dailyTarget,
  })
  onCompleted;

  @override
  State<TargetOnboardingSheet> createState() => _TargetOnboardingSheetState();
}

class _TargetOnboardingSheetState extends State<TargetOnboardingSheet> {
  final _averageController = TextEditingController(text: '20');
  final _targetController = TextEditingController(text: '15');
  String? _error;
  bool _saving = false;

  @override
  void dispose() {
    _averageController.dispose();
    _targetController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final average = int.tryParse(_averageController.text.trim());
    final target = int.tryParse(_targetController.text.trim());
    if (average == null || average < 0 || target == null || target < 0) {
      setState(() => _error = AppStrings.invalidNumber);
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    await widget.onCompleted(averagePerDay: average, dailyTarget: target);
    if (mounted) {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          top: AppSpacing.lg,
          bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              AppStrings.onboardingTitle,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              AppStrings.onboardingHint,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            TextField(
              controller: _averageController,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: AppStrings.onboardingAverageLabel,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextField(
              controller: _targetController,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: AppStrings.onboardingTargetLabel,
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                _error!,
                style: TextStyle(color: scheme.error),
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: _saving ? null : _submit,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(AppStrings.onboardingContinue),
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> showEditTargetDialog({
  required BuildContext context,
  required int currentTarget,
  required Future<void> Function(int value) onSave,
}) async {
  final controller = TextEditingController(text: '$currentTarget');
  String? error;

  await showDialog<void>(
    context: context,
    builder: (dialogContext) {
      return StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Text(AppStrings.editTarget),
            content: TextField(
              controller: controller,
              autofocus: true,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: AppStrings.dailyTarget,
                errorText: error,
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text(AppStrings.cancel),
              ),
              FilledButton(
                onPressed: () async {
                  final value = int.tryParse(controller.text.trim());
                  if (value == null || value < 0) {
                    setState(() => error = AppStrings.invalidNumber);
                    return;
                  }
                  await onSave(value);
                  if (dialogContext.mounted) {
                    Navigator.of(dialogContext).pop();
                  }
                },
                child: const Text(AppStrings.save),
              ),
            ],
          );
        },
      );
    },
  );

  controller.dispose();
}
