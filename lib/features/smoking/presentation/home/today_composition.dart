import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/smoking/domain/services/today_gains_builder.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';

/// Compact brand header — leaf + NEFES + date + circular overflow.
class TodayBrandHeader extends StatelessWidget {
  const TodayBrandHeader({
    super.key,
    required this.dateLabel,
    required this.canUndo,
    required this.isBusy,
    required this.onEarlier,
    required this.onUndo,
  });

  final String dateLabel;
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
              Row(
                children: [
                  Icon(
                    Icons.eco,
                    size: 22,
                    color: AppColors.forestSoft,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    AppStrings.appName,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.6,
                      color: AppColors.forest,
                      height: 1.1,
                      fontSize: TodayScale.brandSize,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Padding(
                padding: const EdgeInsets.only(left: 26),
                child: Text(
                  dateLabel,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                    fontSize: TodayScale.dateSize,
                  ),
                ),
              ),
            ],
          ),
        ),
        _HeaderIconButton(
          icon: Icons.notifications_none_rounded,
          tooltip: AppStrings.notifications,
          onTap: () {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(
                const SnackBar(content: Text(AppStrings.noNotifications)),
              );
          },
        ),
        _HeaderIconButton(
          icon: Icons.schedule,
          tooltip: AppStrings.smokedEarlier,
          onTap: isBusy ? null : onEarlier,
        ),
        PopupMenuButton<_UtilityAction>(
          tooltip: AppStrings.more,
          padding: EdgeInsets.zero,
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
          child: SizedBox(
            width: TodayScale.overflowButton,
            height: TodayScale.overflowButton,
            child: const Icon(Icons.more_vert, color: AppColors.textMuted),
          ),
        ),
      ],
    );
  }
}

/// Circular, low-contrast header action used for the bell / clock cluster.
class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.onTap,
    this.tooltip,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final button = Material(
      color: Colors.transparent,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: TodayScale.overflowButton,
          height: TodayScale.overflowButton,
          child: Icon(icon, size: 22, color: AppColors.textMuted),
        ),
      ),
    );
    if (tooltip == null) return button;
    return Tooltip(message: tooltip!, child: button);
  }
}

enum _UtilityAction { earlier, undo }

/// Hero elapsed-time surface (~30% viewport) with support line + achievement chip.
class HeroElapsedCard extends StatelessWidget {
  const HeroElapsedCard({
    super.key,
    required this.elapsedLabel,
    required this.hasLastSmoke,
    this.supportLine,
    this.achievementChip,
  });

  final String elapsedLabel;
  final bool hasLastSmoke;

  /// Optional supportive line from real UI state only (omit when null).
  final String? supportLine;

  /// Secondary achievement pill at the bottom of the hero (omit when null).
  final SuccessMomentVm? achievementChip;

  static const _heroAsset = 'assets/images/hero_landscape.jpg';

  @override
  Widget build(BuildContext context) {
    final showSupport =
        hasLastSmoke && supportLine != null && supportLine!.trim().isNotEmpty;
    final showChip = hasLastSmoke &&
        achievementChip != null &&
        achievementChip!.text.trim().isNotEmpty;

    final viewportH = MediaQuery.sizeOf(context).height;
    final height = !hasLastSmoke
        ? TodayScale.heroEmptyHeight
        : (viewportH * TodayScale.heroViewportFraction)
            .clamp(TodayScale.heroMinHeight, TodayScale.heroMaxHeight);

    return ClipRRect(
      borderRadius: AppRadius.xlAll,
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            const ColoredBox(color: Color(0xFFF0F3EF)),
            const IgnorePointer(child: CustomPaint(painter: _HeroMistPainter())),
            IgnorePointer(
              child: Image.asset(
                _heroAsset,
                fit: BoxFit.cover,
                alignment: Alignment.center,
                opacity: const AlwaysStoppedAnimation(0.55),
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
            // Soft veil so timer text stays readable over the landscape.
            IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      const Color(0xFFF7F5F2).withValues(alpha: 0.55),
                      const Color(0xFFF7F5F2).withValues(alpha: 0.22),
                      const Color(0xFFF7F5F2).withValues(alpha: 0.45),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.md,
                AppSpacing.lg,
                AppSpacing.md,
              ),
              child: hasLastSmoke
                  ? _TimerContent(
                      elapsedLabel: elapsedLabel,
                      supportLine: showSupport ? supportLine : null,
                      achievementChip: showChip ? achievementChip : null,
                    )
                  : const _EmptyTimerContent(),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyTimerContent extends StatelessWidget {
  const _EmptyTimerContent();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          AppStrings.sinceLastCigarette.toUpperCase(),
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: AppColors.textMuted,
            letterSpacing: 1.1,
            fontWeight: FontWeight.w600,
            fontSize: TodayScale.heroLabelSize,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          AppStrings.noCigaretteYet,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppColors.textSecondary,
            height: 1.2,
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

class _TimerContent extends StatelessWidget {
  const _TimerContent({
    required this.elapsedLabel,
    this.supportLine,
    this.achievementChip,
  });

  final String elapsedLabel;
  final String? supportLine;
  final SuccessMomentVm? achievementChip;

  @override
  Widget build(BuildContext context) {
    final parts = elapsedLabel.split(':');
    final hh = parts.isNotEmpty ? parts[0] : '00';
    final mm = parts.length > 1 ? parts[1] : '00';
    final ss = parts.length > 2 ? parts[2] : '00';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppStrings.sinceLastCigarette.toUpperCase(),
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: AppColors.textMuted,
            letterSpacing: 1.2,
            fontWeight: FontWeight.w600,
            fontSize: TodayScale.heroLabelSize,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: TodayScale.timerRowHeight,
          width: double.infinity,
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$hh:$mm',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    fontFeatures: const [FontFeature.tabularFigures()],
                    fontWeight: FontWeight.w700,
                    letterSpacing: -2.0,
                    height: 1.0,
                    color: AppColors.forest,
                    fontSize: TodayScale.timerHhMm,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    ':$ss',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.4,
                      height: 1.0,
                      color: AppColors.textSecondary,
                      fontSize: TodayScale.timerSs,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (supportLine != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Icon(
                Icons.eco,
                size: 14,
                color: AppColors.forestSoft.withValues(alpha: 0.95),
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  supportLine!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                    height: 1.25,
                  ),
                ),
              ),
            ],
          ),
        ],
        const Spacer(),
        if (achievementChip != null) _HeroAchievementChip(moment: achievementChip!),
      ],
    );
  }
}

class _HeroAchievementChip extends StatelessWidget {
  const _HeroAchievementChip({required this.moment});

  final SuccessMomentVm moment;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: AppMotion.slow,
      switchInCurve: AppMotion.standard,
      switchOutCurve: AppMotion.standard,
      child: Material(
        key: ValueKey(moment.id),
        color: AppColors.achievementChipBg,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          child: Row(
            children: [
              const Icon(
                Icons.favorite,
                size: 14,
                color: AppColors.achievementChipFg,
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  moment.text,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.achievementChipFg,
                    fontWeight: FontWeight.w600,
                    height: 1.2,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              const Icon(
                Icons.chevron_right,
                size: 16,
                color: AppColors.achievementChipFg,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Low-contrast atmospheric fallback when hero asset is missing.
class _HeroMistPainter extends CustomPainter {
  const _HeroMistPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final hill = Paint()..color = const Color(0xFFD5E0D8).withValues(alpha: 0.55);
    final mist = Paint()..color = const Color(0xFFE8EFEA).withValues(alpha: 0.7);
    final sun = Paint()..color = const Color(0xFFE2E8D8).withValues(alpha: 0.9);

    canvas.drawCircle(Offset(size.width * 0.78, size.height * 0.28), 18, sun);

    final path = Path()
      ..moveTo(0, size.height * 0.72)
      ..quadraticBezierTo(
        size.width * 0.25,
        size.height * 0.52,
        size.width * 0.5,
        size.height * 0.68,
      )
      ..quadraticBezierTo(
        size.width * 0.75,
        size.height * 0.86,
        size.width,
        size.height * 0.62,
      )
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, hill);

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.35, size.height * 0.42),
        width: size.width * 0.55,
        height: 28,
      ),
      mist,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Daily limit status — lighter split card (limit left, insight right).
class DailyStatusSection extends StatelessWidget {
  const DailyStatusSection({
    super.key,
    required this.used,
    required this.limit,
    required this.exceeded,
    this.onEditLimit,
    this.insight,
    this.embedded = false,
  });

  final int used;
  final int limit;
  final bool exceeded;
  final VoidCallback? onEditLimit;
  final String? insight;
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final safeLimit = limit <= 0 ? 1 : limit;
    final ratio = (used / safeLimit).clamp(0.0, 1.0);
    final remaining = (limit - used).clamp(0, 999999);
    final fill = exceeded ? AppColors.exceeded : AppColors.progress;
    final hasInsight = insight != null && insight!.trim().isNotEmpty;

    final left = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onEditLimit,
            borderRadius: AppRadius.smAll,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text(
                AppStrings.dailyLimit.toUpperCase(),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppColors.textMuted,
                  letterSpacing: 0.7,
                  fontWeight: FontWeight.w600,
                  fontSize: 10,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          AppStrings.todayProgress(used, limit),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
            fontFeatures: const [FontFeature.tabularFigures()],
            color: AppColors.textPrimary,
            height: 1.1,
            fontSize: TodayScale.statusCountSize,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: ratio),
            duration: AppMotion.normal,
            curve: AppMotion.standard,
            builder: (context, value, _) {
              return SizedBox(
                height: TodayScale.progressTrackHeight,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    const ColoredBox(color: AppColors.progressTrack),
                    FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: value,
                      child: ColoredBox(color: fill),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          exceeded
              ? AppStrings.limitExceeded
              : AppStrings.remainingCount(remaining),
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: exceeded ? AppColors.exceeded : AppColors.textMuted,
            fontSize: 11,
          ),
        ),
      ],
    );

    final body = hasInsight
        ? IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(flex: 5, child: left),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  flex: 5,
                  child: _DailyInsightBox(message: insight!),
                ),
              ],
            ),
          )
        : left;

    if (embedded) return body;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: AppRadius.cardAll,
        boxShadow: kCardShadow,
      ),
      child: body,
    );
  }
}

class _DailyInsightBox extends StatelessWidget {
  const _DailyInsightBox({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted.withValues(alpha: 0.55),
        borderRadius: AppRadius.mdAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.trending_up_rounded,
                size: 16,
                color: AppColors.forestSoft,
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  message,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.textOnSage,
                    height: 1.3,
                    fontWeight: FontWeight.w500,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Soft-sage insight row — omitted when [message] is null/empty by parent.
class InsightChipCard extends StatelessWidget {
  const InsightChipCard({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceSage,
      borderRadius: AppRadius.mdAll,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm + 2,
        ),
        child: Row(
          children: [
            const Icon(
              Icons.show_chart_rounded,
              size: 16,
              color: AppColors.insightAccent,
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                message,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.textOnSage,
                  height: 1.25,
                  fontWeight: FontWeight.w500,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.xs),
            const Icon(
              Icons.chevron_right,
              size: 16,
              color: AppColors.forestSoft,
            ),
          ],
        ),
      ),
    );
  }
}

/// Action area — twin equal-weight cards, or Delay Coach in the same slot.
class TodayDashboardPanel extends StatelessWidget {
  const TodayDashboardPanel({
    super.key,
    required this.isBusy,
    required this.isSaving,
    required this.showDelayAction,
    required this.onSmoke,
    required this.onDelay,
    this.coachSlot,
  });

  final bool isBusy;
  final bool isSaving;
  final bool showDelayAction;
  final VoidCallback onSmoke;
  final VoidCallback onDelay;

  /// When set, replaces twin actions with the active Delay Coach experience.
  final Widget? coachSlot;

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: AppMotion.normal,
      curve: AppMotion.standard,
      alignment: Alignment.topCenter,
      child: AnimatedSwitcher(
        duration: AppMotion.normal,
        switchInCurve: AppMotion.standard,
        switchOutCurve: AppMotion.standard,
        child: coachSlot != null
            ? KeyedSubtree(
                key: const ValueKey('coach'),
                child: coachSlot!,
              )
            : KeyedSubtree(
                key: const ValueKey('actions'),
                child: TwinActionZone(
                  isBusy: isBusy,
                  isSaving: isSaving,
                  showDelayAction: showDelayAction,
                  onSmoke: onSmoke,
                  onDelay: onDelay,
                ),
              ),
      ),
    );
  }
}

/// Paired primary/secondary action cards matching the approved mockup.
class TwinActionZone extends StatelessWidget {
  const TwinActionZone({
    super.key,
    required this.isBusy,
    required this.isSaving,
    required this.showDelayAction,
    required this.onSmoke,
    required this.onDelay,
  });

  final bool isBusy;
  final bool isSaving;
  final bool showDelayAction;
  final VoidCallback onSmoke;
  final VoidCallback onDelay;

  @override
  Widget build(BuildContext context) {
    final wide =
        MediaQuery.sizeOf(context).width >= AppBreakpoints.twinActionsMin;

    final primary = _PrimaryActionCard(
      isBusy: isBusy,
      isSaving: isSaving,
      onPressed: onSmoke,
    );
    final secondary = showDelayAction
        ? _SecondaryActionCard(isBusy: isBusy, onPressed: onDelay)
        : null;

    if (!showDelayAction) return primary;

    if (wide) {
      return IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: primary),
            const SizedBox(width: AppSpacing.sm),
            Expanded(child: secondary!),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        primary,
        const SizedBox(height: AppSpacing.sm),
        secondary!,
      ],
    );
  }
}

class _PrimaryActionCard extends StatelessWidget {
  const _PrimaryActionCard({
    required this.isBusy,
    required this.isSaving,
    required this.onPressed,
  });

  final bool isBusy;
  final bool isSaving;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.forest,
      borderRadius: AppRadius.cardAll,
      child: InkWell(
        onTap: isBusy ? null : onPressed,
        borderRadius: AppRadius.cardAll,
        overlayColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.pressed)) {
            return AppColors.textOnForest.withValues(alpha: 0.12);
          }
          if (states.contains(WidgetState.hovered)) {
            return AppColors.textOnForest.withValues(alpha: 0.06);
          }
          return null;
        }),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.sm + 2,
          ),
          child: isSaving
              ? const SizedBox(
                  height: TodayScale.actionMinBody,
                  child: Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: AppColors.textOnForest,
                      ),
                    ),
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: TodayScale.actionIconBox,
                      height: TodayScale.actionIconBox,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.textOnForest.withValues(alpha: 0.14),
                      ),
                      child: const Icon(
                        Icons.add,
                        size: TodayScale.actionIconGlyph,
                        color: AppColors.textOnForest,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      AppStrings.iSmoked,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.textOnForest,
                        fontWeight: FontWeight.w700,
                        height: 1.15,
                        letterSpacing: -0.2,
                        fontSize: TodayScale.actionTitleSize,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      AppStrings.logNowSubtitle,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppColors.textOnForest.withValues(alpha: 0.78),
                        fontSize: TodayScale.actionSubtitleSize,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _SecondaryActionCard extends StatelessWidget {
  const _SecondaryActionCard({
    required this.isBusy,
    required this.onPressed,
  });

  final bool isBusy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final titleColor = isBusy ? AppColors.textMuted : AppColors.textOnSage;
    final iconColor = isBusy ? AppColors.textMuted : AppColors.forestMid;

    return Material(
      color: AppColors.actionBeige,
      borderRadius: AppRadius.cardAll,
      child: InkWell(
        onTap: isBusy ? null : onPressed,
        borderRadius: AppRadius.cardAll,
        overlayColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.pressed)) {
            return AppColors.forest.withValues(alpha: 0.08);
          }
          if (states.contains(WidgetState.hovered)) {
            return AppColors.forest.withValues(alpha: 0.04);
          }
          return null;
        }),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.md,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: TodayScale.actionIconBox,
                height: TodayScale.actionIconBox,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.forest.withValues(alpha: 0.08),
                ),
                child: Icon(
                  Icons.pause_rounded,
                  size: TodayScale.actionIconGlyph,
                  color: iconColor,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                AppStrings.delayNow,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: titleColor,
                  fontWeight: FontWeight.w700,
                  height: 1.15,
                  letterSpacing: -0.2,
                  fontSize: TodayScale.actionTitleSize,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                AppStrings.delayHint,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: TodayScale.actionSubtitleSize,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Single grouped “Bugünkü kazanımların” card — primary metric + 3 secondaries.
class TodayGainDashboard extends StatelessWidget {
  const TodayGainDashboard({
    super.key,
    required this.tiles,
  });

  final List<TodayGainTileVm> tiles;

  @override
  Widget build(BuildContext context) {
    final safe = tiles.length >= 4
        ? tiles.take(4).toList()
        : [
            ...tiles,
            for (var i = tiles.length; i < 4; i++)
              const TodayGainTileVm(id: 'pad', label: '—', value: '—'),
          ];

    final primary = safe[0];
    final secondary = safe.sublist(1, 4);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(
              Icons.trending_up_rounded,
              size: 16,
              color: AppColors.forest,
            ),
            const SizedBox(width: AppSpacing.xs),
            Text(
              AppStrings.todayGainsTitle.toUpperCase(),
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: AppColors.textMuted,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
                fontSize: 11,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Container(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: AppRadius.cardAll,
            boxShadow: kCardShadow,
          ),
          child: Column(
            children: [
              _GainPrimaryRow(tile: primary),
              const SizedBox(height: AppSpacing.md),
              Divider(
                height: 1,
                thickness: 1,
                color: AppColors.divider.withValues(alpha: 0.85),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  for (var i = 0; i < secondary.length; i++) ...[
                    if (i > 0)
                      Container(
                        width: 1,
                        height: 44,
                        margin: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xs,
                        ),
                        color: AppColors.divider,
                      ),
                    Expanded(child: _GainSecondaryMetric(tile: secondary[i])),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GainPrimaryRow extends StatelessWidget {
  const _GainPrimaryRow({required this.tile});

  final TodayGainTileVm tile;

  IconData get _icon {
    switch (tile.id) {
      case 'money':
        return Icons.account_balance_wallet_outlined;
      case 'remaining':
        return Icons.flag_outlined;
      default:
        return Icons.spa_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: TodayScale.gainPrimaryIcon,
          height: TodayScale.gainPrimaryIcon,
          decoration: const BoxDecoration(
            color: AppColors.badgeMoneyBg,
            shape: BoxShape.circle,
          ),
          child: Icon(
            _icon,
            size: 28,
            color: AppColors.badgeMoneyFg,
          ),
        ),
        const SizedBox(width: AppSpacing.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _AnimatedGainValue(
                tile: tile,
                fontSize: TodayScale.gainPrimaryValue,
                emphasize: true,
              ),
              const SizedBox(height: 2),
              Text(
                tile.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppColors.textMuted,
                  fontSize: TodayScale.gainLabelSize,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GainSecondaryMetric extends StatelessWidget {
  const _GainSecondaryMetric({required this.tile});

  final TodayGainTileVm tile;

  IconData get _icon {
    switch (tile.id) {
      case 'delay_time':
      case 'active_delay':
        return Icons.schedule_outlined;
      case 'sessions':
        return Icons.timer_outlined;
      case 'first_delay':
        return Icons.favorite;
      case 'clean_start':
        return Icons.wb_sunny_outlined;
      case 'remaining':
        return Icons.flag_outlined;
      default:
        return Icons.spa_outlined;
    }
  }

  (Color, Color) get _badgeColors {
    switch (tile.id) {
      case 'delay_time':
      case 'active_delay':
        return (AppColors.badgeTimeBg, AppColors.badgeTimeFg);
      case 'sessions':
        return (AppColors.badgeSessionsBg, AppColors.badgeSessionsFg);
      case 'first_delay':
        return (AppColors.badgeHeartBg, AppColors.achievementChipFg);
      default:
        return (AppColors.badgeDefaultBg, AppColors.badgeDefaultFg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (badgeBg, badgeFg) = _badgeColors;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Column(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: badgeBg,
              shape: BoxShape.circle,
            ),
            child: Icon(_icon, size: 14, color: badgeFg),
          ),
          const SizedBox(height: AppSpacing.xs),
          _AnimatedGainValue(
            tile: tile,
            fontSize: TodayScale.gainSecondaryValue,
          ),
          const SizedBox(height: 2),
          Text(
            tile.label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.textMuted,
              fontSize: 10,
              fontWeight: FontWeight.w500,
              height: 1.15,
            ),
          ),
        ],
      ),
    );
  }
}

class _AnimatedGainValue extends StatefulWidget {
  const _AnimatedGainValue({
    required this.tile,
    this.fontSize = TodayScale.gainSecondaryValue,
    this.emphasize = false,
  });

  final TodayGainTileVm tile;
  final double fontSize;
  final bool emphasize;

  @override
  State<_AnimatedGainValue> createState() => _AnimatedGainValueState();
}

class _AnimatedGainValueState extends State<_AnimatedGainValue> {
  double _from = 0;
  double _to = 0;

  @override
  void initState() {
    super.initState();
    _to = widget.tile.numericValue ?? 0;
    _from = 0;
  }

  @override
  void didUpdateWidget(covariant _AnimatedGainValue oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = widget.tile.numericValue;
    final prev = oldWidget.tile.numericValue;
    if (next != prev) {
      _from = prev ?? _to;
      _to = next ?? _to;
    }
  }

  String _format(double value) {
    final tile = widget.tile;
    switch (tile.format) {
      case GainValueFormat.money:
        return MoneyCalculator.formatTry(value);
      case GainValueFormat.minutes:
        final mins = value.round();
        return tile.showPlus
            ? AppStrings.gainMinutesPlus(mins)
            : AppStrings.gainMinutes(mins);
      case GainValueFormat.count:
        return '${value.round()}';
      case GainValueFormat.plain:
        return tile.value;
    }
  }

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.titleMedium?.copyWith(
      color: widget.emphasize ? AppColors.forest : AppColors.textPrimary,
      fontWeight: FontWeight.w700,
      fontFeatures: const [FontFeature.tabularFigures()],
      fontSize: widget.fontSize,
      height: 1.05,
      letterSpacing: widget.emphasize ? -0.6 : -0.3,
    );

    if (widget.tile.numericValue == null) {
      return AnimatedSwitcher(
        duration: AppMotion.normal,
        switchInCurve: AppMotion.standard,
        switchOutCurve: AppMotion.standard,
        transitionBuilder: (child, animation) {
          return FadeTransition(opacity: animation, child: child);
        },
        child: Text(
          widget.tile.value,
          key: ValueKey(widget.tile.value),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: style,
        ),
      );
    }

    return TweenAnimationBuilder<double>(
      key: ValueKey('${widget.tile.id}-$_to'),
      tween: Tween(begin: _from, end: _to),
      duration: const Duration(milliseconds: 720),
      curve: AppMotion.standard,
      builder: (context, value, _) {
        return Text(
          _format(value),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: style,
        );
      },
    );
  }
}

/// Elevated three-column metrics surface.
class MetricSummaryCard extends StatelessWidget {
  const MetricSummaryCard({
    super.key,
    required this.count,
    this.averageLabel,
    this.longestLabel,
  });

  final int count;
  final String? averageLabel;
  final String? longestLabel;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        children: [
          Expanded(
            child: _MetricColumn(
              value: '$count',
              unit: AppStrings.cigarettesUnit,
              label: AppStrings.metricTodayLabel,
              emphasize: true,
            ),
          ),
          if (averageLabel != null) ...[
            const _VDivider(),
            Expanded(
              child: _MetricColumn(
                value: averageLabel!,
                label: AppStrings.snapshotAverage,
              ),
            ),
          ],
          if (longestLabel != null) ...[
            const _VDivider(),
            Expanded(
              child: _MetricColumn(
                value: longestLabel!,
                label: AppStrings.snapshotLongest,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _VDivider extends StatelessWidget {
  const _VDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: TodayScale.metricDividerHeight,
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      color: AppColors.divider,
    );
  }
}

class _MetricColumn extends StatelessWidget {
  const _MetricColumn({
    required this.value,
    required this.label,
    this.unit,
    this.emphasize = false,
  });

  final String value;
  final String label;
  final String? unit;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontFeatures: const [FontFeature.tabularFigures()],
                    color: emphasize ? AppColors.forest : AppColors.textPrimary,
                    height: 1.1,
                    fontSize: TodayScale.metricValueSize,
                  ),
                ),
                if (unit != null)
                  TextSpan(
                    text: ' $unit',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w600,
                      fontSize: TodayScale.metricUnitSize,
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: AppColors.textMuted,
            fontSize: TodayScale.metricLabelSize,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Section header for today's timeline.
class TodayTimelineHeader extends StatelessWidget {
  const TodayTimelineHeader({super.key, this.onViewAll});

  final VoidCallback? onViewAll;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            AppStrings.todayCigarettes.toUpperCase(),
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: AppColors.textMuted,
              letterSpacing: 0.7,
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ),
        if (onViewAll != null)
          TextButton(
            onPressed: onViewAll,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.forestSoft,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              visualDensity: VisualDensity.compact,
              textStyle: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(AppStrings.viewAll),
                SizedBox(width: 1),
                Icon(Icons.chevron_right, size: 15),
              ],
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Legacy aliases kept so older call sites / tests still resolve during migrate.
// ---------------------------------------------------------------------------

@Deprecated('Use HeroElapsedCard')
typedef ElapsedTimerSignature = HeroElapsedCard;

@Deprecated('Use DailyStatusSection')
typedef CompactDailyLimit = DailyStatusSection;

@Deprecated('Use InsightChipCard')
typedef InsightCaption = InsightChipCard;

@Deprecated('Use TwinActionZone')
typedef TodayBehaviorActions = TwinActionZone;

@Deprecated('Use MetricSummaryCard')
typedef CompactTodayMetrics = MetricSummaryCard;
