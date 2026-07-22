import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';

/// Primary capture action — strong but not celebratory.
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
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.forest,
          foregroundColor: AppColors.textOnForest,
          disabledBackgroundColor: AppColors.forest.withValues(alpha: 0.45),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          textStyle: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            letterSpacing: 0.15,
            color: AppColors.textOnForest,
          ),
        ),
        child: AnimatedSwitcher(
          duration: AppMotion.fast,
          child: isLoading
              ? const SizedBox(
                  key: ValueKey('loading'),
                  width: 22,
                  height: 22,
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
                      Icon(icon, size: 20),
                      const SizedBox(width: AppSpacing.sm),
                    ],
                    Text(label),
                  ],
                ),
        ),
      ),
    );
  }
}

/// Secondary resist/delay action — calm alternative to logging.
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
      color: AppColors.surfaceMuted,
      borderRadius: AppRadius.mdAll,
      child: InkWell(
        onTap: onPressed,
        borderRadius: AppRadius.mdAll,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: [
              Icon(icon, size: 22, color: AppColors.forestMid),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.forest,
                      ),
                    ),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
            ],
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
