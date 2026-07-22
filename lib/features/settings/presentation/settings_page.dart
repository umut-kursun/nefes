import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/app_card.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/settings/data/backup_file_io.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:uuid/uuid.dart';

const _appVersion = '1.2.0';

/// Settings screen — habit, daily target, backup, and app info.
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
      appBar: AppBar(title: const Text(AppStrings.settingsTitle)),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide =
                constraints.maxWidth >= AppBreakpoints.dashboardWide;
            final maxContentWidth = isWide
                ? AppBreakpoints.desktopMaxContent
                : AppBreakpoints.mobileMaxContent;

            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  children: [
                    _SectionLabel(AppStrings.currentHabitLabel),
                    AppCard(
                      child: Row(
                        children: [
                          Icon(
                            Icons.smoking_rooms_outlined,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Text(
                            AppStrings.currentHabitValue,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _SectionLabel(AppStrings.dailyTarget),
                    AppCard(
                      child: settingsAsync.when(
                        data: (settings) => _TargetSection(
                          settings: settings,
                          busy: _busy,
                          onEdit: () => _editTarget(context, settings),
                        ),
                        loading: () => const SizedBox(
                          height: 48,
                          child: Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                        error: (_, _) => Text(AppStrings.smokeSaveFailed),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _SectionLabel(AppStrings.backupSectionTitle),
                    AppCard(
                      padding: EdgeInsets.zero,
                      child: Column(
                        children: [
                          _ActionTile(
                            icon: Icons.download_outlined,
                            title: AppStrings.exportData,
                            subtitle: AppStrings.exportDataDesc,
                            busy: _busy,
                            onTap: _exportData,
                          ),
                          const Divider(height: 1),
                          _ActionTile(
                            icon: Icons.upload_outlined,
                            title: AppStrings.importData,
                            subtitle: AppStrings.importDataDesc,
                            busy: _busy,
                            onTap: () => _importData(context),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _SectionLabel(AppStrings.comingSoonHabitsTitle),
                    AppCard(
                      padding: EdgeInsets.zero,
                      child: ListTile(
                        leading: const Icon(Icons.add_circle_outline),
                        title: const Text(AppStrings.comingSoonHabits),
                        enabled: false,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _SectionLabel(AppStrings.appInfoTitle),
                    AppCard(
                      padding: EdgeInsets.zero,
                      child: ListTile(
                        title: const Text(AppStrings.appVersionLabel),
                        trailing: const Text(_appVersion),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
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
    await ref
        .read(targetHistoryRepositoryProvider)
        .appendPeriod(
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

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm, left: AppSpacing.xs),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _TargetSection extends StatelessWidget {
  const _TargetSection({
    required this.settings,
    required this.busy,
    required this.onEdit,
  });

  final AppSettings settings;
  final bool busy;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${settings.dailyTarget}',
                style: Theme.of(
                  context,
                ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              if (settings.averagePerDay != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${AppStrings.averagePerDayLabel}: ${settings.averagePerDay}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
        TextButton(
          onPressed: busy ? null : onEdit,
          child: const Text(AppStrings.editTarget),
        ),
      ],
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.busy,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: busy
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.chevron_right),
      onTap: busy ? null : onTap,
    );
  }
}

/// Reused edit-target dialog matching the Home screen's target editor.
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
