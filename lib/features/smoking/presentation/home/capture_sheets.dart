import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';

Future<Duration?> showDelayDurationPicker(BuildContext context) {
  return showModalBottomSheet<Duration?>(
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
                AppStrings.pickDelayTitle,
                style: Theme.of(ctx).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpacing.md),
              for (final minutes in [5, 10, 15, 30])
                ListTile(
                  title: Text('$minutes dakika'),
                  onTap: () =>
                      Navigator.of(ctx).pop(Duration(minutes: minutes)),
                ),
              ListTile(
                title: const Text(AppStrings.delayNoDuration),
                onTap: () => Navigator.of(ctx).pop(Duration.zero),
              ),
            ],
          ),
        ),
      );
    },
  );
}

Future<int?> showEarlierMinutesPicker(BuildContext context) {
  return showModalBottomSheet<int>(
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
                AppStrings.pickEarlierTitle,
                style: Theme.of(ctx).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpacing.sm),
              for (final entry in [
                (5, AppStrings.minutesAgo5),
                (10, AppStrings.minutesAgo10),
                (15, AppStrings.minutesAgo15),
                (30, AppStrings.minutesAgo30),
              ])
                ListTile(
                  title: Text(entry.$2),
                  onTap: () => Navigator.of(ctx).pop(entry.$1),
                ),
              ListTile(
                title: const Text(AppStrings.customTime),
                onTap: () => Navigator.of(ctx).pop(-1),
              ),
            ],
          ),
        ),
      );
    },
  );
}
