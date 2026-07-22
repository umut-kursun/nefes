import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/app_card.dart';
import 'package:nefes/core/design_system/app_primary_button.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/presentation/home/target_dialogs.dart';
import 'package:nefes/features/smoking/presentation/triggers/smoking_trigger_labels.dart';
import 'package:nefes/features/smoking/presentation/triggers/trigger_selector.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_view_model.dart';

/// Home screen — M3 capture, triggers, and delay/resist.
class HomeView extends ConsumerStatefulWidget {
  const HomeView({super.key});

  @override
  ConsumerState<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends ConsumerState<HomeView> {
  var _onboardingShown = false;
  var _triggerPromptOpen = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(homeViewModelProvider);
    final scheme = Theme.of(context).colorScheme;

    ref.listen(homeViewModelProvider, (previous, next) {
      final message = next.errorMessage ?? next.infoMessage;
      if (message != null &&
          (previous?.errorMessage != next.errorMessage ||
              previous?.infoMessage != next.infoMessage)) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(message),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(milliseconds: 1600),
            ),
          );
        ref.read(homeViewModelProvider.notifier).clearMessages();
      }

      final becameReady = next.isHydrated && !(previous?.isHydrated ?? false);
      if (becameReady && !next.hasCompletedOnboarding && !_onboardingShown) {
        _onboardingShown = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          _showOnboarding();
        });
      }

      final needsTrigger =
          next.pendingTriggerSmokeId != null &&
          next.pendingTriggerSmokeId != previous?.pendingTriggerSmokeId &&
          !_triggerPromptOpen;
      if (needsTrigger) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted || _triggerPromptOpen) return;
          _openTriggerSelector();
        });
      }
    });

    if (state.isHydrated &&
        !state.hasCompletedOnboarding &&
        !_onboardingShown) {
      _onboardingShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showOnboarding();
      });
    }

    return Scaffold(
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
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.sm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        AppStrings.appName,
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        AppStrings.appSubtitle,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        TimeDisplay.formatWeekdayDateHeader(DateTime.now()),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: state.dailyTarget <= 0
                              ? 0
                              : (state.todayCount / state.dailyTarget).clamp(
                                  0.0,
                                  1.0,
                                ),
                          minHeight: 6,
                          backgroundColor: scheme.surfaceContainerHighest,
                          color: state.isTargetExceeded
                              ? scheme.error
                              : scheme.primary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Expanded(
                        child: isWide
                            ? _DesktopDashboard(
                                state: state,
                                onSmoke: _onSmoke,
                                onDelay: _onDelay,
                                onUrgePassed: _onUrgePassed,
                                onCancelDelay: _onCancelDelay,
                                onUndo: () => _confirmUndo(context),
                                onEditTarget: () => _editTarget(context, state),
                              )
                            : _MobileDashboard(
                                state: state,
                                onSmoke: _onSmoke,
                                onDelay: _onDelay,
                                onUrgePassed: _onUrgePassed,
                                onCancelDelay: _onCancelDelay,
                                onUndo: () => _confirmUndo(context),
                                onEditTarget: () => _editTarget(context, state),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  void _onSmoke() {
    ref.read(homeViewModelProvider.notifier).onISmokedPressed();
  }

  void _onDelay() {
    ref.read(homeViewModelProvider.notifier).onDelayPressed();
  }

  void _onUrgePassed() {
    ref.read(homeViewModelProvider.notifier).onUrgePassed();
  }

  void _onCancelDelay() {
    ref.read(homeViewModelProvider.notifier).onCancelDelay();
  }

  Future<void> _openTriggerSelector() async {
    if (_triggerPromptOpen) return;
    _triggerPromptOpen = true;
    final isWide =
        MediaQuery.sizeOf(context).width >= AppBreakpoints.dashboardWide;
    var handled = false;

    await showSmokeTriggerSelector(
      context: context,
      isWide: isWide,
      onSelected: (trigger) async {
        handled = true;
        await ref.read(homeViewModelProvider.notifier).selectTrigger(trigger);
      },
      onSkipped: () {
        handled = true;
        ref.read(homeViewModelProvider.notifier).skipTrigger();
      },
    );

    if (!handled && mounted) {
      ref.read(homeViewModelProvider.notifier).skipTrigger();
    }
    _triggerPromptOpen = false;
  }

  Future<void> _editTarget(BuildContext context, HomeUiState state) {
    return showEditTargetDialog(
      context: context,
      currentTarget: state.dailyTarget,
      onSave: (value) =>
          ref.read(homeViewModelProvider.notifier).updateDailyTarget(value),
    );
  }

  Future<void> _showOnboarding() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      builder: (context) {
        return TargetOnboardingSheet(
          onCompleted: ({required averagePerDay, required dailyTarget}) async {
            await ref
                .read(homeViewModelProvider.notifier)
                .completeOnboarding(
                  averagePerDay: averagePerDay,
                  dailyTarget: dailyTarget,
                );
            if (context.mounted) {
              Navigator.of(context).pop();
            }
          },
        );
      },
    );
  }

  Future<void> _confirmUndo(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text(AppStrings.undoConfirmTitle),
          content: const Text(AppStrings.undoConfirmBody),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text(AppStrings.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text(AppStrings.undoConfirmAction),
            ),
          ],
        );
      },
    );

    if (confirmed == true && mounted) {
      await ref.read(homeViewModelProvider.notifier).undoLastConfirmed();
    }
  }
}

class _MobileDashboard extends StatelessWidget {
  const _MobileDashboard({
    required this.state,
    required this.onSmoke,
    required this.onDelay,
    required this.onUrgePassed,
    required this.onCancelDelay,
    required this.onUndo,
    required this.onEditTarget,
  });

  final HomeUiState state;
  final VoidCallback onSmoke;
  final VoidCallback onDelay;
  final VoidCallback onUrgePassed;
  final VoidCallback onCancelDelay;
  final VoidCallback onUndo;
  final VoidCallback onEditTarget;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _TimerCard(state: state),
                const SizedBox(height: AppSpacing.md),
                _TargetCard(state: state, onEdit: onEditTarget),
                if (state.hasActiveDelay) ...[
                  const SizedBox(height: AppSpacing.md),
                  _DelayActiveCard(
                    state: state,
                    onUrgePassed: onUrgePassed,
                    onCancel: onCancelDelay,
                  ),
                ],
                if (state.todayDelayInsight != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    state.todayDelayInsight!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                Text(
                  AppStrings.todayCigarettes,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                if (state.todayEvents.isEmpty)
                  Text(
                    AppStrings.emptyTodayHistory,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  )
                else
                  ...[
                    for (var i = 0; i < state.todayEvents.length; i++) ...[
                      if (i > 0) const SizedBox(height: AppSpacing.sm),
                      _HistoryTile(item: state.todayEvents[i]),
                    ],
                  ],
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppPrimaryButton(
          label: AppStrings.iSmoked,
          isLoading: state.isSaving,
          onPressed: state.isBusy ? null : onSmoke,
        ),
        const SizedBox(height: AppSpacing.sm),
        if (!state.hasActiveDelay)
          OutlinedButton(
            onPressed: state.isBusy ? null : onDelay,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            child: const Text(AppStrings.delayNow),
          ),
        if (state.canUndo) ...[
          const SizedBox(height: AppSpacing.sm),
          TextButton(
            onPressed: state.isBusy ? null : onUndo,
            child: Text(
              state.isUndoing ? AppStrings.loading : AppStrings.undoLast,
            ),
          ),
        ],
      ],
    );
  }
}

class _DesktopDashboard extends StatelessWidget {
  const _DesktopDashboard({
    required this.state,
    required this.onSmoke,
    required this.onDelay,
    required this.onUrgePassed,
    required this.onCancelDelay,
    required this.onUndo,
    required this.onEditTarget,
  });

  final HomeUiState state;
  final VoidCallback onSmoke;
  final VoidCallback onDelay;
  final VoidCallback onUrgePassed;
  final VoidCallback onCancelDelay;
  final VoidCallback onUndo;
  final VoidCallback onEditTarget;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: ListView(
                  children: [
                    _TimerCard(state: state),
                    if (state.hasActiveDelay) ...[
                      const SizedBox(height: AppSpacing.md),
                      _DelayActiveCard(
                        state: state,
                        onUrgePassed: onUrgePassed,
                        onCancel: onCancelDelay,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppPrimaryButton(
                label: AppStrings.iSmoked,
                isLoading: state.isSaving,
                onPressed: state.isBusy ? null : onSmoke,
              ),
              const SizedBox(height: AppSpacing.sm),
              if (!state.hasActiveDelay)
                OutlinedButton(
                  onPressed: state.isBusy ? null : onDelay,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  child: const Text(AppStrings.delayNow),
                ),
            ],
          ),
        ),
        const SizedBox(width: AppSpacing.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _TargetCard(state: state, onEdit: onEditTarget),
              if (state.todayDelayInsight != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  state.todayDelayInsight!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              _HistorySectionHeader(
                canUndo: state.canUndo,
                isBusy: state.isBusy,
                isUndoing: state.isUndoing,
                onUndo: onUndo,
              ),
              const SizedBox(height: AppSpacing.sm),
              Expanded(child: _HistoryList(state: state)),
            ],
          ),
        ),
      ],
    );
  }
}

class _DelayActiveCard extends StatelessWidget {
  const _DelayActiveCard({
    required this.state,
    required this.onUrgePassed,
    required this.onCancel,
  });

  final HomeUiState state;
  final VoidCallback onUrgePassed;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.delaying,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            state.delayElapsedLabel,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: FilledButton.tonal(
                  onPressed: state.isBusy ? null : onUrgePassed,
                  child: const Text(AppStrings.urgePassed),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              TextButton(
                onPressed: state.isBusy ? null : onCancel,
                child: const Text(AppStrings.cancelDelay),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HistorySectionHeader extends StatelessWidget {
  const _HistorySectionHeader({
    required this.canUndo,
    required this.isBusy,
    required this.isUndoing,
    required this.onUndo,
  });

  final bool canUndo;
  final bool isBusy;
  final bool isUndoing;
  final VoidCallback onUndo;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            AppStrings.todayCigarettes,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
        if (canUndo)
          TextButton(
            onPressed: isBusy ? null : onUndo,
            child: Text(isUndoing ? AppStrings.loading : AppStrings.undoLast),
          ),
      ],
    );
  }
}

class _HistoryList extends StatelessWidget {
  const _HistoryList({required this.state});

  final HomeUiState state;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (state.todayEvents.isEmpty) {
      return Text(
        AppStrings.emptyTodayHistory,
        style: Theme.of(
          context,
        ).textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
      );
    }

    return ListView.separated(
      itemCount: state.todayEvents.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        return _HistoryTile(item: state.todayEvents[index]);
      },
    );
  }
}

class _TimerCard extends StatelessWidget {
  const _TimerCard({required this.state});

  final HomeUiState state;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.sinceLastCigarette,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (state.hasLastSmoke)
            Text(
              state.elapsedLabel,
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            )
          else
            Text(
              AppStrings.noCigaretteYet,
              style: Theme.of(
                context,
              ).textTheme.bodyLarge?.copyWith(color: scheme.onSurfaceVariant),
            ),
        ],
      ),
    );
  }
}

class _TargetCard extends StatelessWidget {
  const _TargetCard({required this.state, required this.onEdit});

  final HomeUiState state;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return AppCard(
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    AppStrings.today,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
                Icon(
                  Icons.edit_outlined,
                  size: 18,
                  color: scheme.onSurfaceVariant,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              AppStrings.todayProgress(state.todayCount, state.dailyTarget),
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              state.isTargetExceeded
                  ? AppStrings.targetExceeded
                  : AppStrings.remainingCount(
                      state.remaining < 0 ? 0 : state.remaining,
                    ),
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.item});

  final HomeEventItem item;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final interval = item.intervalSincePrevious;
    final trigger = item.trigger;

    return AppCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                AppStrings.sequenceLabel(item.sequenceNumber),
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: AppSpacing.md),
              Text(
                TimeDisplay.formatLocalHm(item.createdAtUtc),
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
          if (interval != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              AppStrings.afterPrevious(
                TimeDisplay.formatIntervalShort(interval),
              ),
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
          if (trigger != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              SmokingTriggerLabels.label(trigger),
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: scheme.primary),
            ),
          ],
        ],
      ),
    );
  }
}
