import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/nefes_page.dart';
import 'package:nefes/core/design_system/nefes_surface.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/settings/data/backup_file_io.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:uuid/uuid.dart';

const _appVersion = '1.3.0';

/// Settings — grouped list rows, not a wall of cards.
class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  var _busy = false;

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(appSettingsStreamProvider);

    return Scaffold(
      backgroundColor: AppColors.canvasLight,
      appBar: AppBar(title: const Text(AppStrings.settingsTitle)),
      body: NefesPageBody(
        scrollable: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const NefesSectionLabel(AppStrings.habitSectionTitle),
            NefesSurface(
              tone: NefesSurfaceTone.raised,
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  const _SettingsRow(
                    icon: Icons.smoking_rooms_outlined,
                    title: AppStrings.currentHabitValue,
                    subtitle: AppStrings.currentHabitLabel,
                  ),
                  const Divider(height: 1, indent: 52),
                  settingsAsync.when(
                    data: (settings) => _SettingsRow(
                      icon: Icons.flag_outlined,
                      title: AppStrings.dailyLimit,
                      trailing: Text(
                        '${settings.dailyTarget}',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                      onTap: _busy
                          ? null
                          : () => _editTarget(context, settings),
                    ),
                    loading: () => const Padding(
                      padding: EdgeInsets.all(AppSpacing.lg),
                      child: LinearProgressIndicator(minHeight: 2),
                    ),
                    error: (_, _) => const _SettingsRow(
                      icon: Icons.error_outline,
                      title: AppStrings.smokeSaveFailed,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            const NefesSectionLabel(AppStrings.dataSectionTitle),
            NefesSurface(
              tone: NefesSurfaceTone.raised,
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  _SettingsRow(
                    icon: Icons.download_outlined,
                    title: AppStrings.exportData,
                    subtitle: AppStrings.exportDataDesc,
                    busy: _busy,
                    onTap: _busy ? null : _exportData,
                  ),
                  const Divider(height: 1, indent: 52),
                  _SettingsRow(
                    icon: Icons.upload_outlined,
                    title: AppStrings.importData,
                    subtitle: AppStrings.importDataDesc,
                    busy: _busy,
                    onTap: _busy ? null : () => _importData(context),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            const NefesSectionLabel(AppStrings.comingSoonHabitsTitle),
            const NefesSurface(
              tone: NefesSurfaceTone.raised,
              padding: EdgeInsets.zero,
              child: _SettingsRow(
                icon: Icons.add_circle_outline,
                title: AppStrings.comingSoonHabits,
                enabled: false,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            const NefesSectionLabel(AppStrings.appInfoTitle),
            NefesSurface(
              tone: NefesSurfaceTone.raised,
              padding: EdgeInsets.zero,
              child: _SettingsRow(
                icon: Icons.info_outline,
                title: AppStrings.appAbout,
                trailing: Text(
                  _appVersion,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textMuted,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _editTarget(BuildContext context, AppSettings settings) {
    return showEditTargetDialog(
      context: context,
      currentTarget: settings.dailyTarget,
      onSave: (value) async {
        await ref.read(settingsRepositoryProvider).setDailyTarget(value);
        await _appendTargetPeriod(value);
      },
    );
  }

  Future<void> _appendTargetPeriod(int target) async {
    final now = DateTime.now();
    await ref.read(targetHistoryRepositoryProvider).appendPeriod(
          DailyTargetPeriod(
            id: const Uuid().v4(),
            habitType: HabitType.smoking.storageId,
            target: target,
            effectiveFromLocalYear: now.year,
            effectiveFromLocalMonth: now.month,
            effectiveFromLocalDay: now.day,
            createdAtUtc: now.toUtc(),
          ),
        );
  }

  Future<void> _exportData() async {
    setState(() => _busy = true);
    try {
      final json = await ref.read(backupServiceProvider).exportJson();
      final stamp = DateTime.now().toIso8601String().replaceAll(':', '-');
      await downloadJsonFile(
        filename: 'nefes-backup-$stamp.json',
        jsonContent: json,
      );
      _showSnack(AppStrings.exportSuccess);
    } catch (_) {
      _showSnack(AppStrings.exportFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _importData(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text(AppStrings.importConfirmTitle),
          content: const Text(AppStrings.importConfirmBody),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text(AppStrings.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text(AppStrings.importConfirmAction),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    await pickJsonFile((content) async {
      if (mounted) setState(() => _busy = true);
      try {
        await ref.read(backupServiceProvider).importReplace(content);
        _showSnack(AppStrings.importSuccess);
      } catch (_) {
        _showSnack(AppStrings.importFailed);
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    });
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(milliseconds: 1800),
        ),
      );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.busy = false,
    this.enabled = true,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool busy;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      enabled: enabled && !busy && onTap != null,
      onTap: enabled && !busy ? onTap : null,
      leading: Icon(
        icon,
        color: enabled ? AppColors.forestMid : AppColors.textMuted,
      ),
      title: Text(
        title,
        style: TextStyle(
          color: enabled ? AppColors.textPrimary : AppColors.textMuted,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: subtitle == null
          ? null
          : Text(
              subtitle!,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
      trailing: busy
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : trailing ??
              (onTap == null
                  ? null
                  : const Icon(
                      Icons.chevron_right,
                      color: AppColors.textMuted,
                      size: 20,
                    )),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.xs,
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
            title: const Text(AppStrings.editDailyTargetTitle),
            content: TextField(
              controller: controller,
              autofocus: true,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: AppStrings.dailyLimit,
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
