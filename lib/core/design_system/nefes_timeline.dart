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

/// Chronological timeline — markers + vertical spine, not a card stack.
///
/// Hierarchy: TIME → EVENT → TRIGGER/CONTEXT → INTERVAL.
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
      padding: const EdgeInsets.only(left: 52, top: 2, bottom: 2),
      child: Row(
        children: [
          Container(
            width: 1,
            height: 18,
            color: AppColors.divider,
          ),
          const SizedBox(width: AppSpacing.md),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.textTertiary,
              letterSpacing: 0.1,
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
    final markerColor =
        item.isDelay ? AppColors.textMuted : AppColors.forestSoft;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 44,
            child: Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Text(
                item.timeLabel,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                  height: 1.2,
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
                  Container(width: 1, height: 3, color: AppColors.divider)
                else
                  const SizedBox(height: 3),
                Container(
                  width: 9,
                  height: 9,
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
            child: InkWell(
              onTap: item.onTap,
              borderRadius: AppRadius.smAll,
              child: Padding(
                padding: EdgeInsets.only(
                  bottom: isLast ? 0 : AppSpacing.xs,
                  top: 0,
                  right: AppSpacing.sm,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        height: 1.25,
                      ),
                    ),
                    if (item.subtitle != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          item.subtitle!,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textTertiary,
                            height: 1.3,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
