import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';

/// Compact brand header — NEFES + date + circular overflow.
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
              const SizedBox(height: 2),
              Text(
                dateLabel,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: TodayScale.dateSize,
                ),
              ),
            ],
          ),
        ),
        Material(
          color: AppColors.surfaceElevated,
          shape: const CircleBorder(),
          elevation: 0.5,
          shadowColor: AppColors.forest.withValues(alpha: 0.08),
          child: PopupMenuButton<_UtilityAction>(
            tooltip: AppStrings.smokedEarlier,
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
              child: const Icon(Icons.more_horiz, color: AppColors.textMuted),
            ),
          ),
        ),
      ],
    );
  }
}

enum _UtilityAction { earlier, undo }

/// Hero elapsed-time surface with optional landscape asset + painter fallback.
class HeroElapsedCard extends StatelessWidget {
  const HeroElapsedCard({
    super.key,
    required this.elapsedLabel,
    required this.hasLastSmoke,
    this.supportLine,
  });

  final String elapsedLabel;
  final bool hasLastSmoke;

  /// Optional supportive line from real UI state only (omit when null).
  final String? supportLine;

  static const _heroAsset = 'assets/images/hero_landscape.webp';

  @override
  Widget build(BuildContext context) {
    final showSupport =
        hasLastSmoke && supportLine != null && supportLine!.trim().isNotEmpty;

    final height = !hasLastSmoke
        ? TodayScale.heroEmptyHeight
        : (showSupport
            ? TodayScale.heroHeightWithSupport
            : TodayScale.heroHeight);

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
                opacity: const AlwaysStoppedAnimation(0.28),
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.sm,
                AppSpacing.md,
                AppSpacing.sm,
              ),
              child: hasLastSmoke
                  ? _TimerContent(
                      elapsedLabel: elapsedLabel,
                      supportLine: showSupport ? supportLine : null,
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
  });

  final String elapsedLabel;
  final String? supportLine;

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
            letterSpacing: 1.1,
            fontWeight: FontWeight.w600,
            fontSize: TodayScale.heroLabelSize,
          ),
        ),
        const Spacer(flex: 1),
        SizedBox(
          height: TodayScale.timerRowHeight,
          width: double.infinity,
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  '$hh:$mm',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    fontFeatures: const [FontFeature.tabularFigures()],
                    fontWeight: FontWeight.w700,
                    letterSpacing: -1.6,
                    height: 1.0,
                    color: AppColors.textPrimary,
                    fontSize: TodayScale.timerHhMm,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  ss,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontFeatures: const [FontFeature.tabularFigures()],
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.4,
                    height: 1.0,
                    color: AppColors.textSecondary,
                    fontSize: TodayScale.timerSs,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (supportLine != null) ...[
          const SizedBox(height: 2),
          Row(
            children: [
              Icon(
                Icons.eco_outlined,
                size: 12,
                color: AppColors.forestSoft.withValues(alpha: 0.9),
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  supportLine!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
        ] else
          const Spacer(flex: 1),
      ],
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

/// Daily limit status — budget framing under the hero.
class DailyStatusSection extends StatelessWidget {
  const DailyStatusSection({
    super.key,
    required this.used,
    required this.limit,
    required this.exceeded,
    this.onEditLimit,
    this.embedded = false,
  });

  final int used;
  final int limit;
  final bool exceeded;
  final VoidCallback? onEditLimit;
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final safeLimit = limit <= 0 ? 1 : limit;
    final ratio = (used / safeLimit).clamp(0.0, 1.0);
    final remaining = (limit - used).clamp(0, 999999);
    final fill = exceeded ? AppColors.exceeded : AppColors.progress;

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '$used',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                        color: AppColors.forest,
                        height: 1.05,
                        fontSize: TodayScale.statusCountSize,
                      ),
                    ),
                    TextSpan(
                      text: ' ${AppStrings.cigarettesUnit}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onEditLimit,
                borderRadius: AppRadius.smAll,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    minWidth: 40,
                    minHeight: 36,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          AppStrings.limitShort(limit),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (onEditLimit != null) ...[
                          const SizedBox(width: AppSpacing.xs),
                          const Icon(
                            Icons.edit_outlined,
                            size: 15,
                            color: AppColors.textMuted,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
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
          ),
        ),
      ],
    );

    if (embedded) return body;

    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: body,
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

/// Grouped daily status + insight + twin actions (or inline Delay Coach).
class TodayDashboardPanel extends StatelessWidget {
  const TodayDashboardPanel({
    super.key,
    required this.used,
    required this.limit,
    required this.exceeded,
    required this.onEditLimit,
    required this.isBusy,
    required this.isSaving,
    required this.showDelayAction,
    required this.onSmoke,
    required this.onDelay,
    this.insight,
    this.coachSlot,
  });

  final int used;
  final int limit;
  final bool exceeded;
  final VoidCallback onEditLimit;
  final String? insight;
  final bool isBusy;
  final bool isSaving;
  final bool showDelayAction;
  final VoidCallback onSmoke;
  final VoidCallback onDelay;

  /// When set, replaces twin actions with the active Delay Coach experience.
  final Widget? coachSlot;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm + 2,
        AppSpacing.md,
        AppSpacing.sm + 2,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DailyStatusSection(
            used: used,
            limit: limit,
            exceeded: exceeded,
            onEditLimit: onEditLimit,
            embedded: true,
          ),
          if (insight != null && insight!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            InsightChipCard(message: insight!),
          ],
          const SizedBox(height: AppSpacing.sm + 2),
          AnimatedSize(
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
          ),
        ],
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
      borderRadius: AppRadius.lgAll,
      child: InkWell(
        onTap: isBusy ? null : onPressed,
        borderRadius: AppRadius.lgAll,
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
      color: AppColors.surfaceSage,
      borderRadius: AppRadius.lgAll,
      child: InkWell(
        onTap: isBusy ? null : onPressed,
        borderRadius: AppRadius.lgAll,
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
            AppSpacing.sm + 2,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
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
                  const Spacer(),
                  Icon(
                    Icons.chevron_right,
                    size: 18,
                    color: isBusy ? AppColors.textMuted : AppColors.forestSoft,
                  ),
                ],
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

/// Compact 2×2 “what did I gain today?” — emotional center of Today.
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          AppStrings.todayGainsTitle,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: AppColors.textMuted,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.4,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Row(
          children: [
            Expanded(child: _GainTile(tile: safe[0])),
            const SizedBox(width: AppSpacing.sm),
            Expanded(child: _GainTile(tile: safe[1])),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(child: _GainTile(tile: safe[2])),
            const SizedBox(width: AppSpacing.sm),
            Expanded(child: _GainTile(tile: safe[3])),
          ],
        ),
      ],
    );
  }
}

class _GainTile extends StatelessWidget {
  const _GainTile({required this.tile});

  final TodayGainTileVm tile;

  IconData get _icon {
    switch (tile.id) {
      case 'money':
        return Icons.payments_outlined;
      case 'delay_time':
      case 'active_delay':
        return Icons.timer_outlined;
      case 'sessions':
        return Icons.pause_circle_outline;
      case 'first_delay':
        return Icons.favorite_outline;
      case 'clean_start':
        return Icons.wb_sunny_outlined;
      case 'remaining':
        return Icons.flag_outlined;
      default:
        return Icons.spa_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: TodayScale.gainTileMinHeight),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(_icon, size: 14, color: AppColors.forestSoft),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  tile.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.textSecondary,
                    fontSize: TodayScale.gainLabelSize,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            tile.value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: AppColors.forestMid,
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
              fontSize: TodayScale.gainValueSize,
              height: 1.1,
            ),
          ),
        ],
      ),
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
