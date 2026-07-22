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
                if (state.hasActiveDelay) ...[
                  const SizedBox(height: AppSpacing.md),
                  _DelayActivePanel(
                    state: state,
                    onUrgePassed: onUrgePassed,
                    onCancel: onCancelDelay,
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                _ActionArea(
                  state: state,
                  onSmoke: onSmoke,
                  onDelay: onDelay,
                  onUndo: onUndo,
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _BrandHeader(),
        const SizedBox(height: AppSpacing.md),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ListView(
                  children: [
                    _TodayHero(state: state, onEditTarget: onEditTarget),
                    if (state.hasActiveDelay) ...[
                      const SizedBox(height: AppSpacing.md),
                      _DelayActivePanel(
                        state: state,
                        onUrgePassed: onUrgePassed,
                        onCancel: onCancelDelay,
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    _ActionArea(
                      state: state,
                      onSmoke: onSmoke,
                      onDelay: onDelay,
                      onUndo: onUndo,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.xl),
              Expanded(
                child: ListView(
                  children: [
                    _TodaySnapshot(state: state),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      AppStrings.todayCigarettes,
                      style: Theme.of(context).textTheme.titleSmall,
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
                  ],
                ),
              ),
            ],
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
          // Keep a compact count/limit string for quick scan + tests.
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
    required this.onDelay,
    required this.onUndo,
  });

  final HomeUiState state;
  final VoidCallback onSmoke;
  final VoidCallback onDelay;
  final VoidCallback onUndo;

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
            onPressed: state.isBusy ? null : onDelay,
          ),
        ],
        if (state.canUndo) ...[
          const SizedBox(height: AppSpacing.xs),
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
    // Newest-first in state — reverse for chronological timeline.
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
          intervalBefore: gap == null
              ? null
              : TimeDisplay.formatIntervalShort(gap),
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
  });

  final HomeUiState state;
  final VoidCallback onUrgePassed;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return NefesSurface(
      tone: NefesSurfaceTone.muted,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.delaying.toUpperCase(),
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: AppColors.textMuted,
              letterSpacing: 0.7,
            ),
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
