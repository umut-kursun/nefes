import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:nefes/core/design_system/nefes_timeline.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/history/presentation/event_correction_sheet.dart';
import 'package:nefes/features/motivation/presentation/delay_coach_panel.dart';
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
    // Rebuild on structural changes only — 1Hz clocks live in leaf Consumers.
    ref.watch(homeViewModelProvider.select((s) => s.structureKey));
    final state = ref.read(homeViewModelProvider);

    ref.listen(homeViewModelProvider, (previous, next) {
      final message = next.errorMessage ?? next.infoMessage;
      if (message != null &&
          (previous?.errorMessage != next.errorMessage ||
              previous?.infoMessage != next.infoMessage)) {
        // Brief auto-dismiss confirmation. Undo lives in the ⋯ menu — a snackbar
        // action / close icon can stick open on Flutter Web and force a tap.
        ScaffoldMessenger.of(context)
          ..clearSnackBars()
          ..showSnackBar(
            SnackBar(
              content: Text(message),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(milliseconds: 1000),
            ),
          );
        // Belt-and-suspenders: Web sometimes ignores SnackBar.duration.
        Future<void>.delayed(const Duration(milliseconds: 1000), () {
          if (!mounted) return;
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
        });
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
                    onEditEvent: (event) => _editTodayEvent(context, event),
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

  Future<void> _editTodayEvent(BuildContext context, HomeEventItem event) {
    return showEventCorrectionSheet(
      context: context,
      ref: ref,
      smokeEventId: event.id,
      currentLocal: event.createdAtUtc.toLocal(),
      currentTrigger: event.trigger,
    );
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
    required this.onEditEvent,
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
  final ValueChanged<HomeEventItem> onEditEvent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TodayBrandHeader(
          dateLabel: TimeDisplay.formatWeekdayDateHeader(DateTime.now()),
          canUndo: state.canUndo,
          isBusy: state.isBusy,
          onEarlier: onEarlier,
          onUndo: onUndo,
        ),
        const SizedBox(height: AppSpacing.sm),
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _LiveHeroElapsed(),
                const SizedBox(height: AppSpacing.md),
                TodayGainDashboard(
                  tiles: state.gainTiles,
                ),
                const SizedBox(height: AppSpacing.md),
                DailyStatusSection(
                  used: state.todayCount,
                  limit: state.dailyTarget,
                  exceeded: state.isTargetExceeded,
                  onEditLimit: onEditTarget,
                  insight: state.contextualInsight,
                ),
                const SizedBox(height: AppSpacing.md),
                TodayDashboardPanel(
                  isBusy: state.isBusy,
                  isSaving: state.isSaving,
                  showDelayAction: !state.hasActiveDelay,
                  onSmoke: onSmoke,
                  onDelay: onPickDelay,
                  coachSlot: state.hasActiveDelay
                      ? DelayCoachAction(
                          state: state,
                          onUrgePassed: onUrgePassed,
                          onCancel: onCancelDelay,
                          onSmoke: onDelaySmoke,
                        )
                      : null,
                ),
                if (state.pendingTriggerSmokeId != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  OptionalContextBar(
                    quickTriggers: state.quickTriggers,
                    onSelected: onSelectTrigger,
                    onMore: onMoreTriggers,
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                RepaintBoundary(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TodayTimelineHeader(
                        onViewAll: () => context.goNamed('history'),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      if (state.todayEvents.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(
                            bottom: AppSpacing.sm,
                          ),
                          child: Text(
                            AppStrings.emptyTodayHistory,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: AppColors.textMuted,
                                ),
                          ),
                        )
                      else
                        _TodayTimeline(
                          events: state.todayEvents,
                          onEditEvent: onEditEvent,
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Hero clock leaf — rebuilds on 1Hz ticks without rebuilding the dashboard.
class _LiveHeroElapsed extends ConsumerWidget {
  const _LiveHeroElapsed();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tick = ref.watch(
      homeViewModelProvider.select(
        (s) => (
          elapsed: s.elapsedLabel,
          hasLast: s.hasLastSmoke,
          delayMinutes: s.todayDelayMinutes,
          delayInsight: s.todayDelayInsight,
          moment: s.successMoment,
        ),
      ),
    );

    final support = !tick.hasLast
        ? null
        : (tick.delayMinutes > 0
            ? AppStrings.heroMinutesGained(tick.delayMinutes)
            : (tick.delayInsight ?? AppStrings.heroSupportLine));

    return RepaintBoundary(
      child: HeroElapsedCard(
        elapsedLabel: tick.elapsed,
        hasLastSmoke: tick.hasLast,
        supportLine: support,
        achievementChip: tick.moment,
      ),
    );
  }
}

class _TodayTimeline extends StatelessWidget {
  const _TodayTimeline({
    required this.events,
    required this.onEditEvent,
  });

  final List<HomeEventItem> events;
  final ValueChanged<HomeEventItem> onEditEvent;

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
          title: AppStrings.iSmoked,
          subtitle: item.trigger == null
              ? null
              : SmokingTriggerLabels.label(item.trigger!),
          intervalBefore:
              gap == null ? null : TimeDisplay.formatIntervalShort(gap),
          onTap: () => onEditEvent(item),
        ),
      );
    }
    return NefesTimeline(items: items, axis: Axis.vertical);
  }
}
