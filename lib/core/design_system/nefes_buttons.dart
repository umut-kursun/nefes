import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';

/// Shared primary capture control — matches Today’s forest action.
class NefesPrimaryButton extends StatelessWidget {
  const NefesPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final labelStyle = Theme.of(context).textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
      height: 1.1,
      color: AppColors.textOnForest, // must beat theme onSurface
    );

    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.forest,
          foregroundColor: AppColors.textOnForest,
          disabledBackgroundColor: AppColors.forest.withValues(alpha: 0.4),
          disabledForegroundColor:
              AppColors.textOnForest.withValues(alpha: 0.7),
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          textStyle: labelStyle,
        ).copyWith(
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return AppColors.textOnForest.withValues(alpha: 0.14);
            }
            if (states.contains(WidgetState.hovered)) {
              return AppColors.textOnForest.withValues(alpha: 0.08);
            }
            if (states.contains(WidgetState.focused)) {
              return AppColors.textOnForest.withValues(alpha: 0.1);
            }
            return null;
          }),
        ),
        child: AnimatedSwitcher(
          duration: AppMotion.fast,
          child: isLoading
              ? const SizedBox(
                  key: ValueKey('loading'),
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.textOnForest,
                  ),
                )
              : Row(
                  key: const ValueKey('label'),
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 22, color: AppColors.textOnForest),
                      const SizedBox(width: 10),
                    ],
                    Text(label, style: labelStyle),
                  ],
                ),
        ),
      ),
    );
  }
}

/// Shared soft-sage secondary action — calm alternative to logging.
class NefesSecondaryAction extends StatelessWidget {
  const NefesSecondaryAction({
    super.key,
    required this.label,
    required this.onPressed,
    this.subtitle,
    this.icon = Icons.pause_circle_outline,
  });

  final String label;
  final String? subtitle;
  final VoidCallback? onPressed;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceSecondaryAction,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.mdAll,
        side: BorderSide(
          color: AppColors.outlineSoft.withValues(alpha: 0.55),
        ),
      ),
      child: InkWell(
        onTap: onPressed,
        borderRadius: AppRadius.mdAll,
        overlayColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.pressed)) {
            return AppColors.forest.withValues(alpha: 0.1);
          }
          if (states.contains(WidgetState.hovered)) {
            return AppColors.forest.withValues(alpha: 0.06);
          }
          if (states.contains(WidgetState.focused)) {
            return AppColors.forest.withValues(alpha: 0.08);
          }
          return null;
        }),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
            ),
            child: Row(
              children: [
                Icon(icon, size: 22, color: AppColors.forestMid),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        label,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: AppColors.textOnSage,
                          fontWeight: FontWeight.w700,
                          height: 1.2,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style:
                              Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppColors.textSecondary,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                const Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: AppColors.forestSoft,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Legacy alias.
class AppPrimaryButton extends NefesPrimaryButton {
  const AppPrimaryButton({
    super.key,
    required super.label,
    required super.onPressed,
    super.isLoading,
  });
}
