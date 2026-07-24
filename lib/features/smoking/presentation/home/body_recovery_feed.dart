import 'dart:async';

import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/viewmodel/home/home_ui_state.dart';

/// Slowly scrolling recovery timeline feed for the Today screen.
class BodyRecoveryFeed extends StatefulWidget {
  const BodyRecoveryFeed({
    super.key,
    required this.items,
    this.nextHint,
  });

  final List<RecoveryItemVm> items;
  final String? nextHint;

  @override
  State<BodyRecoveryFeed> createState() => _BodyRecoveryFeedState();
}

class _BodyRecoveryFeedState extends State<BodyRecoveryFeed> {
  final _controller = ScrollController();
  Timer? _scrollTimer;
  String? _highlightId;
  Timer? _highlightTimer;
  int _lastCount = 0;

  static const _viewportHeight = 132.0;
  static const _rowExtent = 44.0;

  @override
  void initState() {
    super.initState();
    _lastCount = widget.items.length;
    if (widget.items.isNotEmpty) {
      _highlightId = widget.items.last.id;
      _scheduleHighlightClear();
    }
    _startAutoScroll();
  }

  @override
  void didUpdateWidget(covariant BodyRecoveryFeed oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.items.length > _lastCount && widget.items.isNotEmpty) {
      _highlightId = widget.items.last.id;
      _scheduleHighlightClear();
      // Jump near the newest unlock so the user sees it.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_controller.hasClients) return;
        final target = (_lastCount * _rowExtent).clamp(
          0.0,
          _controller.position.maxScrollExtent,
        );
        _controller.animateTo(
          target,
          duration: AppMotion.normal,
          curve: AppMotion.standard,
        );
      });
    }
    _lastCount = widget.items.length;
  }

  void _scheduleHighlightClear() {
    _highlightTimer?.cancel();
    _highlightTimer = Timer(const Duration(seconds: 4), () {
      if (!mounted) return;
      setState(() => _highlightId = null);
    });
  }

  void _startAutoScroll() {
    _scrollTimer?.cancel();
    _scrollTimer = Timer.periodic(const Duration(milliseconds: 80), (_) {
      if (!mounted || !_controller.hasClients) return;
      if (widget.items.length < 3) return;
      final max = _controller.position.maxScrollExtent;
      if (max <= 0) return;
      final next = _controller.offset + 0.35;
      if (next >= max) {
        _controller.jumpTo(0);
      } else {
        _controller.jumpTo(next);
      }
    });
  }

  @override
  void dispose() {
    _scrollTimer?.cancel();
    _highlightTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(
              Icons.favorite_border,
              size: 14,
              color: AppColors.forestSoft.withValues(alpha: 0.9),
            ),
            const SizedBox(width: AppSpacing.xs),
            Text(
              AppStrings.bodyRecoveryTitle.toUpperCase(),
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
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: AppRadius.cardAll,
            boxShadow: kCardShadow,
          ),
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.sm,
            AppSpacing.md,
            AppSpacing.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: _viewportHeight,
                child: widget.items.isEmpty
                    ? Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          AppStrings.bodyRecoveryEmpty,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppColors.textMuted,
                                    fontSize: 13,
                                    height: 1.35,
                                  ),
                        ),
                      )
                    : ListView.builder(
                        controller: _controller,
                        physics: const NeverScrollableScrollPhysics(),
                        itemExtent: _rowExtent,
                        itemCount: widget.items.length,
                        itemBuilder: (context, index) {
                          final item = widget.items[index];
                          final highlight = item.id == _highlightId;
                          return _RecoveryRow(
                            item: item,
                            highlight: highlight,
                          );
                        },
                      ),
              ),
              if (widget.nextHint != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Divider(
                  height: 1,
                  thickness: 1,
                  color: AppColors.divider.withValues(alpha: 0.85),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  widget.nextHint!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.textTertiary,
                        fontWeight: FontWeight.w500,
                        fontSize: 11,
                        height: 1.3,
                      ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _RecoveryRow extends StatelessWidget {
  const _RecoveryRow({
    required this.item,
    required this.highlight,
  });

  final RecoveryItemVm item;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final dot = highlight ? AppColors.success : AppColors.forestSoft;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 5),
            child: AnimatedContainer(
              duration: AppMotion.normal,
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: dot,
                shape: BoxShape.circle,
                boxShadow: highlight
                    ? [
                        BoxShadow(
                          color: AppColors.success.withValues(alpha: 0.35),
                          blurRadius: 6,
                        ),
                      ]
                    : null,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          SizedBox(
            width: 52,
            child: Text(
              item.timeLabel,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: highlight ? AppColors.forest : AppColors.textSecondary,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              item.body,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: highlight ? FontWeight.w600 : FontWeight.w400,
                    fontSize: 12,
                    height: 1.25,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
