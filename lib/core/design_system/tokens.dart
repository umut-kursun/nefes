import 'package:flutter/material.dart';

/// Spacing tokens for the NEFES design system.
abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}

/// Motion tokens — subtle, short durations.
abstract final class AppMotion {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 220);
  static const Curve standard = Curves.easeOutCubic;
}

/// Brand / semantic colors (Material 3 mapped in [AppTheme]).
abstract final class AppColors {
  static const Color seedLight = Color(0xFF1C2B24);
  static const Color seedDark = Color(0xFFA8C3B5);
  static const Color canvasLight = Color(0xFFF7F5F2);
  static const Color canvasDark = Color(0xFF121512);
}

/// Layout breakpoints and content widths for responsive dashboards.
abstract final class AppBreakpoints {
  /// Switch Home to two-column dashboard at this width and above.
  static const double dashboardWide = 840;

  static const double mobileMaxContent = 430;
  static const double desktopMaxContent = 960;
}
