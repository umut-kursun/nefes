import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';

class NefesTimelineItem {
  const NefesTimelineItem({
    required this.timeLabel,
    required this.title,
    this.subtitle,
    this.intervalBefore,
    this.isDelay = false,
    this.onTap,
  });

  final String timeLabel;
  final String title;
  final String? subtitle;
  final String? intervalBefore;
  final bool isDelay;
  final VoidCallback? onTap;
}

/// Timeline — horizontal bubbles (Today) or vertical rows (History).
class NefesTimeline extends StatelessWidget {
  const NefesTimeline({
    super.key,
    required this.items,
    this.axis = Axis.vertical,
  });

  final List<NefesTimelineItem> items;
  final Axis axis;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    if (axis == Axis.horizontal) {
      return SizedBox(
        height: 96,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: items.length,
          separatorBuilder: (_, _) => Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
            child: Icon(
              Icons.chevron_right,
              size: 16,
              color: AppColors.textMuted.withValues(alpha: 0.55),
            ),
          ),
          itemBuilder: (context, index) {
            return _TimelineBubble(item: items[index]);
          },
        ),
      );
    }

    return Column(
      children: [
        for (var i = 0; i < items.length; i++)
          _TimelineRow(
            item: items[i],
            isFirst: i == 0,
            isLast: i == items.length - 1,
          ),
      ],
    );
  }
}

class _TimelineBubble extends StatelessWidget {
  const _TimelineBubble({required this.item});

  final NefesTimelineItem item;

  @override
  Widget build(BuildContext context) {
    final iconColor =
        item.isDelay ? AppColors.forestSoft : AppColors.achievementChipFg;
    final iconBg =
        item.isDelay ? AppColors.badgeSessionsBg : AppColors.dangerContainer;
    final icon =
        item.isDelay ? Icons.pause_rounded : Icons.smoking_rooms_outlined;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.onTap,
        borderRadius: AppRadius.mdAll,
        child: SizedBox(
          width: TodayScale.timelineBubble + 24,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                item.timeLabel,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w600,
                      fontSize: TodayScale.timelineTimeSize,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconBg,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 18, color: iconColor),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                item.title,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w500,
                      fontSize: TodayScale.timelineTitleSize,
                      height: 1.15,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.item,
    required this.isFirst,
    required this.isLast,
  });

  final NefesTimelineItem item;
  final bool isFirst;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final markerColor =
        item.isDelay ? AppColors.textMuted : AppColors.forestSoft;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: TodayScale.timelineTimeCol,
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                item.timeLabel,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w600,
                      height: 1.15,
                      fontSize: TodayScale.timelineTimeSize,
                    ),
              ),
            ),
          ),
          SizedBox(
            width: 20,
            child: Column(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  margin: const EdgeInsets.only(top: 10),
                  decoration: BoxDecoration(
                    color: markerColor,
                    shape: BoxShape.circle,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: AppColors.divider,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: item.onTap,
                borderRadius: AppRadius.mdAll,
                child: Padding(
                  padding: EdgeInsets.only(
                    top: isFirst ? 4 : 8,
                    bottom: isLast ? 4 : 12,
                    right: AppSpacing.xs,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: TodayScale.timelineTitleSize + 2,
                            ),
                      ),
                      if (item.subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          item.subtitle!,
                          style:
                              Theme.of(context).textTheme.labelMedium?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                        ),
                      ],
                      if (item.intervalBefore != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          item.intervalBefore!,
                          style:
                              Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: AppColors.textTertiary,
                                  ),
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
    );
  }
}
