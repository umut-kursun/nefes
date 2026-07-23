import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
import 'package:nefes/features/smoking/presentation/home/today_composition.dart';
import 'package:nefes/features/smoking/presentation/triggers/smoking_trigger_labels.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_view_model.dart';

/// Home screen — capture-first Today composition (editorial density).
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
        final canUndoAction = next.canUndo &&
            next.infoMessage == AppStrings.smokedSaved &&
            next.errorMessage == null;

        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(message),
              behavior: SnackBarBehavior.floating,
              duration: Duration(milliseconds: canUndoAction ? 4000 : 1600),
              action: canUndoAction
                  ? SnackBarAction(
                      label: AppStrings.undoConfirmAction,
                      onPressed: () {
                        ref
                            .read(homeViewModelProvider.notifier)
                            .undoLastConfirmed();
                      },
                    )
                  : null,
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
            final maxContentWidth =
                constraints.maxWidth >= AppBreakpoints.dashboardWide
                    ? AppBreakpoints.desktopMaxContent
                    : AppBreakpoints.mobileMaxContent;

            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.xs,
                    AppSpacing.lg,
                    AppSpacing.sm,
                  ),
                  child: _TodayComposition(
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

class _TodayComposition extends StatelessWidget {
  const _TodayComposition({
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
        _HeaderBar(
          canUndo: state.canUndo,
          isBusy: state.isBusy,
          onEarlier: onEarlier,
          onUndo: onUndo,
        ),
        const SizedBox(height: AppSpacing.md),
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElapsedTimerSignature(
                  elapsedLabel: state.elapsedLabel,
                  hasLastSmoke: state.hasLastSmoke,
                ),
                const SizedBox(height: AppSpacing.lg),
                CompactDailyLimit(
                  used: state.todayCount,
                  limit: state.dailyTarget,
                  exceeded: state.isTargetExceeded,
                  onEditLimit: onEditTarget,
                ),
                if (state.contextualInsight != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  InsightCaption(message: state.contextualInsight!),
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
                TodayBehaviorActions(
                  isBusy: state.isBusy,
                  isSaving: state.isSaving,
                  showDelayAction: !state.hasActiveDelay,
                  onSmoke: onSmoke,
                  onDelay: onPickDelay,
                ),
                if (state.todayDelayInsight != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    state.todayDelayInsight!,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                _metrics(state),
                const SizedBox(height: AppSpacing.md),
                Text(
                  AppStrings.todayCigarettes.toUpperCase(),
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.textMuted,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                if (state.todayEvents.isEmpty)
                  Text(
                    AppStrings.emptyTodayHistory,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textMuted,
                    ),
                  )
                else
                  _TodayTimeline(events: state.todayEvents),
                // Keep last timeline items clear of bottom nav on mobile.
                const SizedBox(height: AppSpacing.lg),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _metrics(HomeUiState state) {
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

    return CompactTodayMetrics(
      count: state.todayCount,
      averageLabel: average == null
          ? null
          : TimeDisplay.formatIntervalShort(average),
      longestLabel: longest == null
          ? null
          : TimeDisplay.formatIntervalShort(longest),
    );
  }
}

class _HeaderBar extends StatelessWidget {
  const _HeaderBar({
    required this.canUndo,
    required this.isBusy,
    required this.onEarlier,
    required this.onUndo,
  });

  final bool canUndo;
  final bool isBusy;
  final VoidCallback onEarlier;
  final VoidCallback onUndo;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppStrings.appName,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.8,
                  color: AppColors.forest,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                TimeDisplay.formatWeekdayDateHeader(DateTime.now()),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        PopupMenuButton<_UtilityAction>(
          tooltip: AppStrings.smokedEarlier,
          padding: EdgeInsets.zero,
          icon: const Icon(
            Icons.more_horiz,
            color: AppColors.textMuted,
          ),
          onSelected: (action) {
            if (isBusy) return;
            switch (action) {
              case _UtilityAction.earlier:
                onEarlier();
              case _UtilityAction.undo:
                onUndo();
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: _UtilityAction.earlier,
              child: Text(AppStrings.smokedEarlier),
            ),
            if (canUndo)
              PopupMenuItem(
                value: _UtilityAction.undo,
                child: Text(
                  isBusy ? AppStrings.loading : AppStrings.undoLast,
                ),
              ),
          ],
        ),
      ],
    );
  }
}

enum _UtilityAction { earlier, undo }

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
      padding: const EdgeInsets.all(AppSpacing.md),
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
          const SizedBox(height: AppSpacing.xs),
          Text(
            state.delayElapsedLabel,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
              fontWeight: FontWeight.w700,
              color: AppColors.forestMid,
            ),
          ),
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
