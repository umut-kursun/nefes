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

/// Chronological timeline — compact scannable rows for Today overview.
class NefesTimeline extends StatelessWidget {
  const NefesTimeline({super.key, required this.items});

  final List<NefesTimelineItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

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
          const SizedBox(width: AppSpacing.xs),
          SizedBox(
            width: 14,
            child: Column(
              children: [
                if (!isFirst)
                  Container(width: 1.5, height: 8, color: AppColors.divider)
                else
                  const SizedBox(height: 8),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: item.isDelay ? AppColors.surfaceMuted : markerColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: markerColor, width: 1.5),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 1.5, color: AppColors.divider),
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
                borderRadius: AppRadius.smAll,
                hoverColor: AppColors.forest.withValues(alpha: 0.03),
                child: Padding(
                  padding: EdgeInsets.only(
                    top: 6,
                    bottom: isLast ? 6 : 8,
                    right: AppSpacing.xs,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          runSpacing: 2,
                          children: [
                            Text(
                              item.title,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w700,
                                    height: 1.15,
                                    fontSize: TodayScale.timelineTitleSize,
                                  ),
                            ),
                            if (item.subtitle != null)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceSage,
                                  borderRadius: BorderRadius.circular(
                                    AppRadius.pill,
                                  ),
                                ),
                                child: Text(
                                  item.subtitle!,
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelSmall
                                      ?.copyWith(
                                        color: AppColors.textOnSage,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 10,
                                      ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      if (item.intervalBefore != null) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.progressTrack,
                            borderRadius: BorderRadius.circular(AppRadius.pill),
                          ),
                          child: Text(
                            item.intervalBefore!,
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 10,
                                  fontFeatures: const [
                                    FontFeature.tabularFigures(),
                                  ],
                                ),
                          ),
                        ),
                      ],
                      if (item.onTap != null) ...[
                        const SizedBox(width: 2),
                        const Icon(
                          Icons.more_horiz,
                          size: 16,
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
    );
  }
}
