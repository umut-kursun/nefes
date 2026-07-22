import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';

/// Tonal surface — preferred over bordered cards.
enum NefesSurfaceTone { raised, muted, inset, transparent }

class NefesSurface extends StatelessWidget {
  const NefesSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.tone = NefesSurfaceTone.raised,
    this.radius = AppRadius.md,
    this.onTap,
    this.border,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final NefesSurfaceTone tone;
  final double radius;
  final VoidCallback? onTap;
  final Border? border;

  Color _color(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    if (brightness == Brightness.dark) {
      final scheme = Theme.of(context).colorScheme;
      return switch (tone) {
        NefesSurfaceTone.raised => scheme.surfaceContainerHighest,
        NefesSurfaceTone.muted => scheme.surfaceContainerHigh,
        NefesSurfaceTone.inset => scheme.surfaceContainer,
        NefesSurfaceTone.transparent => Colors.transparent,
      };
    }
    return switch (tone) {
      NefesSurfaceTone.raised => AppColors.surfaceLight,
      NefesSurfaceTone.muted => AppColors.surfaceMuted,
      NefesSurfaceTone.inset => AppColors.surfaceInset,
      NefesSurfaceTone.transparent => Colors.transparent,
    };
  }

  @override
  Widget build(BuildContext context) {
    final decoration = BoxDecoration(
      color: _color(context),
      borderRadius: BorderRadius.circular(radius),
      border: border,
    );

    final content = Padding(padding: padding, child: child);

    if (onTap == null) {
      return DecoratedBox(decoration: decoration, child: content);
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: Ink(decoration: decoration, child: content),
      ),
    );
  }
}

/// Legacy alias — keeps older imports compiling while migrating screens.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return NefesSurface(padding: padding, child: child);
  }
}
