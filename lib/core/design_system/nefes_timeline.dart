import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';

class NefesTimelineItem {
  const NefesTimelineItem({
    required this.timeLabel,
    required this.title,
    this.subtitle,
    this.intervalBefore,
    this.isDelay = false,
  });

  final String timeLabel;
  final String title;
  final String? subtitle;
  final String? intervalBefore;
  final bool isDelay;
}

/// Chronological timeline — markers + vertical spine, not a card stack.
class NefesTimeline extends StatelessWidget {
  const NefesTimeline({super.key, required this.items});

  final List<NefesTimelineItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0 && items[i].intervalBefore != null)
            _IntervalGutter(label: items[i].intervalBefore!),
          _TimelineRow(
            item: items[i],
            isFirst: i == 0,
            isLast: i == items.length - 1,
          ),
        ],
      ],
    );
  }
}

class _IntervalGutter extends StatelessWidget {
  const _IntervalGutter({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 52),
      child: Row(
        children: [
          Container(
            width: 1,
            height: 22,
            color: AppColors.divider,
          ),
          const SizedBox(width: AppSpacing.md),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.textMuted,
            ),
          ),
        ],
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
    final markerColor = item.isDelay ? AppColors.textMuted : AppColors.forestSoft;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 44,
            child: Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                item.timeLabel,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          SizedBox(
            width: 16,
            child: Column(
              children: [
                if (!isFirst)
                  Container(width: 1, height: 4, color: AppColors.divider)
                else
                  const SizedBox(height: 4),
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: item.isDelay ? AppColors.surfaceMuted : markerColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: markerColor, width: 2),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 1, color: AppColors.divider),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                bottom: isLast ? 0 : AppSpacing.sm,
                top: 0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (item.subtitle != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        item.subtitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
