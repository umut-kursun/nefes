import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/design_system/nefes_buttons.dart';
import 'package:nefes/core/design_system/nefes_metric_strip.dart';
import 'package:nefes/core/design_system/nefes_progress.dart';
import 'package:nefes/core/design_system/nefes_surface.dart';
import 'package:nefes/core/design_system/nefes_timeline.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';
import 'package:nefes/features/smoking/presentation/home/capture_sheets.dart';
import 'package:nefes/features/smoking/presentation/home/optional_context_bar.dart';
import 'package:nefes/features/smoking/presentation/home/target_dialogs.dart';
import 'package:nefes/features/smoking/presentation/triggers/smoking_trigger_labels.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_view_model.dart';

/// Home screen — capture-first logging with optional enrichment.
class HomeView extends ConsumerStatefulWidget {
  const HomeView({super.key});

  @override
  ConsumerState<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends ConsumerState<HomeView> {
  var _onboardingShown = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(homeViewModelProvider);

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
      backgroundColor: AppColors.canvasLight,
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
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.sm,
                    AppSpacing.lg,
                    AppSpacing.md,
                  ),
                  child: _MobileDashboard(
                    state: state,
                    onSmoke: () => ref
                        .read(homeViewModelProvider.notifier)
                        .onISmokedPressed(),
                    onPickDelay: () => _pickDelay(context),
                    onUrgePassed: () => ref
                        .read(homeViewModelProvider.notifier)
                        .onUrgePassed(),
                    onCancelDelay: () => ref
                        .read(homeViewModelProvider.notifier)
                        .onCancelDelay(),
                    onDelaySmoke: () => ref
                        .read(homeViewModelProvider.notifier)
                        .onDelayEndedWithSmoke(),
                    onUndo: () => _confirmUndo(context),
                    onEditTarget: () => _editTarget(context, state),
                    onEarlier: () => _pickEarlier(context),
                    onSelectTrigger: (t) => ref
                        .read(homeViewModelProvider.notifier)
                        .selectTrigger(t),
                    onMoreTriggers: () => _moreTriggers(context, state),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _pickDelay(BuildContext context) async {
    final duration = await showDelayDurationPicker(context);
    if (!mounted || duration == null) return;
    // Duration.zero sentinel = start without planned duration.
    await ref.read(homeViewModelProvider.notifier).startDelayWithDuration(
          duration == Duration.zero ? null : duration,
        );
  }

  Future<void> _pickEarlier(BuildContext context) async {
    final minutes = await showEarlierMinutesPicker(context);
    if (!context.mounted || minutes == null) return;
    if (minutes == -1) {
      final now = DateTime.now();
      final picked = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(now),
      );
      if (!context.mounted || picked == null) return;
      var local = DateTime(
        now.year,
        now.month,
        now.day,
        picked.hour,
        picked.minute,
      );
      if (local.isAfter(now)) {
        local = local.subtract(const Duration(days: 1));
      }
      await ref.read(homeViewModelProvider.notifier).logAtCustomLocal(local);
      return;
    }
    await ref
        .read(homeViewModelProvider.notifier)
        .logEarlier(minutesAgo: minutes);
  }

  Future<void> _moreTriggers(BuildContext context, HomeUiState state) async {
    final trigger = await showMoreTriggersSheet(
      context: context,
      quickTriggers: state.quickTriggers,
    );
    if (trigger != null && mounted) {
      await ref.read(homeViewModelProvider.notifier).selectTrigger(trigger);
    }
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
            await ref.read(homeViewModelProvider.notifier).completeOnboarding(
                  averagePerDay: averagePerDay,
                  dailyTarget: dailyTarget,
                );
            if (context.mounted) Navigator.of(context).pop();
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
    required this.onPickDelay,
    required this.onUrgePassed,
    required this.onCancelDelay,
    required this.onDelaySmoke,
    required this.onUndo,
    required this.onEditTarget,
    required this.onEarlier,
    required this.onSelectTrigger,
    required this.onMoreTriggers,
  });

  final HomeUiState state;
  final VoidCallback onSmoke;
  final VoidCallback onPickDelay;
  final VoidCallback onUrgePassed;
  final VoidCallback onCancelDelay;
  final VoidCallback onDelaySmoke;
  final VoidCallback onUndo;
  final VoidCallback onEditTarget;
  final VoidCallback onEarlier;
  final ValueChanged<SmokingTrigger> onSelectTrigger;
  final VoidCallback onMoreTriggers;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _BrandHeader(),
        const SizedBox(height: AppSpacing.md),
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _TodayHero(state: state, onEditTarget: onEditTarget),
                if (state.contextualInsight != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    state.contextualInsight!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                if (state.hasActiveDelay) ...[
                  const SizedBox(height: AppSpacing.md),
                  _DelayActivePanel(
                    state: state,
                    onUrgePassed: onUrgePassed,
                    onCancel: onCancelDelay,
                    onSmoke: onDelaySmoke,
                  ),
                ],
                if (state.pendingTriggerSmokeId != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  OptionalContextBar(
                    quickTriggers: state.quickTriggers,
                    onSelected: onSelectTrigger,
                    onMore: onMoreTriggers,
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                _ActionArea(
                  state: state,
                  onSmoke: onSmoke,
                  onPickDelay: onPickDelay,
                  onUndo: onUndo,
                  onEarlier: onEarlier,
                ),
                if (state.todayDelayInsight != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    state.todayDelayInsight!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                _TodaySnapshot(state: state),
                if (state.todayEvents.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    AppStrings.todayCigarettes,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  _TodayTimeline(events: state.todayEvents),
                ] else ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    AppStrings.emptyTodayHistory,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppStrings.appName,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            color: AppColors.forest,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          TimeDisplay.formatWeekdayDateHeader(DateTime.now()),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _TodayHero extends StatelessWidget {
  const _TodayHero({required this.state, required this.onEditTarget});

  final HomeUiState state;
  final VoidCallback onEditTarget;

  @override
  Widget build(BuildContext context) {
    return NefesSurface(
      tone: NefesSurfaceTone.raised,
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.sinceLastCigarette.toUpperCase(),
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: AppColors.textMuted,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          AnimatedSwitcher(
            duration: AppMotion.fast,
            child: state.hasLastSmoke
                ? Text(
                    state.elapsedLabel,
                    key: ValueKey(state.elapsedLabel),
                    style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: AppColors.forest,
                    ),
                  )
                : Text(
                    AppStrings.noCigaretteYet,
                    key: const ValueKey('empty-timer'),
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
          ),
          const SizedBox(height: AppSpacing.lg),
          NefesBudgetProgress(
            used: state.todayCount,
            limit: state.dailyTarget,
            exceeded: state.isTargetExceeded,
            onEditLimit: onEditTarget,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            AppStrings.todayProgress(state.todayCount, state.dailyTarget),
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: AppColors.textMuted,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionArea extends StatelessWidget {
  const _ActionArea({
    required this.state,
    required this.onSmoke,
    required this.onPickDelay,
    required this.onUndo,
    required this.onEarlier,
  });

  final HomeUiState state;
  final VoidCallback onSmoke;
  final VoidCallback onPickDelay;
  final VoidCallback onUndo;
  final VoidCallback onEarlier;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        NefesPrimaryButton(
          label: AppStrings.iSmoked,
          isLoading: state.isSaving,
          onPressed: state.isBusy ? null : onSmoke,
        ),
        if (!state.hasActiveDelay) ...[
          const SizedBox(height: AppSpacing.sm),
          NefesSecondaryAction(
            label: AppStrings.delayNow,
            subtitle: AppStrings.delayHint,
            onPressed: state.isBusy ? null : onPickDelay,
          ),
        ],
        Align(
          alignment: Alignment.center,
          child: TextButton(
            onPressed: state.isBusy ? null : onEarlier,
            child: Text(
              AppStrings.smokedEarlier,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textMuted,
              ),
            ),
          ),
        ),
        if (state.canUndo)
          Align(
            alignment: Alignment.center,
            child: TextButton(
              onPressed: state.isBusy ? null : onUndo,
              child: Text(
                state.isUndoing ? AppStrings.loading : AppStrings.undoLast,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _TodaySnapshot extends StatelessWidget {
  const _TodaySnapshot({required this.state});

  final HomeUiState state;

  @override
  Widget build(BuildContext context) {
    if (state.todayEvents.isEmpty) return const SizedBox.shrink();

    final intervals = state.todayEvents
        .map((e) => e.intervalSincePrevious)
        .whereType<Duration>()
        .toList();

    Duration? average;
    Duration? longest;
    if (intervals.isNotEmpty) {
      final totalMs = intervals.fold<int>(0, (s, d) => s + d.inMilliseconds);
      average = Duration(milliseconds: totalMs ~/ intervals.length);
      longest = intervals.reduce((a, b) => a > b ? a : b);
    }

    return NefesSurface(
      tone: NefesSurfaceTone.muted,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.today.toUpperCase(),
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: AppColors.textMuted,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          NefesMetricStrip(
            metrics: [
              NefesMetric(
                label: AppStrings.cigarettesUnit,
                value: '${state.todayCount}',
                emphasis: true,
              ),
              if (average != null)
                NefesMetric(
                  label: AppStrings.snapshotAverage,
                  value: TimeDisplay.formatIntervalShort(average),
                ),
              if (longest != null)
                NefesMetric(
                  label: AppStrings.snapshotLongest,
                  value: TimeDisplay.formatIntervalShort(longest),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TodayTimeline extends StatelessWidget {
  const _TodayTimeline({required this.events});

  final List<HomeEventItem> events;

  @override
  Widget build(BuildContext context) {
    final chronological = events.reversed.toList();
    final items = <NefesTimelineItem>[];
    for (var i = 0; i < chronological.length; i++) {
      final item = chronological[i];
      final prev = i == 0 ? null : chronological[i - 1];
      final gap = prev == null
          ? null
          : item.createdAtUtc.difference(prev.createdAtUtc);
      items.add(
        NefesTimelineItem(
          timeLabel: TimeDisplay.formatLocalHm(item.createdAtUtc),
          title: AppStrings.smokeEventTitle,
          subtitle: item.trigger == null
              ? null
              : SmokingTriggerLabels.label(item.trigger!),
          intervalBefore:
              gap == null ? null : TimeDisplay.formatIntervalShort(gap),
        ),
      );
    }
    return NefesTimeline(items: items);
  }
}

class _DelayActivePanel extends StatelessWidget {
  const _DelayActivePanel({
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
    return NefesSurface(
      tone: NefesSurfaceTone.muted,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  (state.delayTimedOut
                          ? AppStrings.delayTimeUp
                          : AppStrings.delaying)
                      .toUpperCase(),
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.textMuted,
                    letterSpacing: 0.7,
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
          const SizedBox(height: AppSpacing.sm),
          Text(
            state.delayElapsedLabel,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
              fontWeight: FontWeight.w700,
              color: AppColors.forestMid,
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
