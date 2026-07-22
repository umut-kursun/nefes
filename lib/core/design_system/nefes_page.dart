import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';

/// Constrained page body with consistent horizontal padding.
class NefesPageBody extends StatelessWidget {
  const NefesPageBody({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(
      AppSpacing.lg,
      AppSpacing.sm,
      AppSpacing.lg,
      AppSpacing.lg,
    ),
    this.scrollable = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= AppBreakpoints.dashboardWide;
    final maxWidth = isWide
        ? AppBreakpoints.desktopMaxContent
        : AppBreakpoints.mobileMaxContent;

    Widget content = Padding(padding: padding, child: child);
    if (scrollable) {
      content = SingleChildScrollView(child: content);
    }

    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: content,
        ),
      ),
    );
  }
}

/// Uppercase-ish section label used in settings / grouped lists.
class NefesSectionLabel extends StatelessWidget {
  const NefesSectionLabel(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(
        left: AppSpacing.xs,
        bottom: AppSpacing.sm,
        top: AppSpacing.xs,
      ),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: AppColors.textMuted,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

/// Compact empty-state block — icon + title + optional hint.
class NefesEmptyState extends StatelessWidget {
  const NefesEmptyState({
    super.key,
    required this.title,
    this.hint,
    this.icon = Icons.inbox_outlined,
  });

  final String title;
  final String? hint;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 28, color: AppColors.textMuted),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (hint != null) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                hint!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
