import 'package:flutter/material.dart';

/// Spacing scale — denser than the previous prototype rhythm.
abstract final class AppSpacing {
  static const double xxs = 2;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 40;
}

/// Motion — short, calm, no bounce.
abstract final class AppMotion {
  static const Duration fast = Duration(milliseconds: 140);
  static const Duration normal = Duration(milliseconds: 220);
  static const Duration slow = Duration(milliseconds: 320);
  static const Curve standard = Curves.easeOutCubic;
  static const Curve emphasized = Curves.easeInOutCubic;
}

/// Restrained corner radii.
abstract final class AppRadius {
  static const double xs = 6;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double pill = 999;

  static final BorderRadius xsAll = BorderRadius.circular(xs);
  static final BorderRadius smAll = BorderRadius.circular(sm);
  static final BorderRadius mdAll = BorderRadius.circular(md);
  static final BorderRadius lgAll = BorderRadius.circular(lg);
}

/// NEFES semantic color tokens (light).
///
/// Deep forest primary, warm off-white canvas, tonal surfaces —
/// identity without glassmorphism or loud gradients.
abstract final class AppColors {
  // Brand seeds (legacy aliases used by older call sites)
  static const Color seedLight = forest;
  static const Color seedDark = Color(0xFFA8C3B5);

  // Core brand
  static const Color forest = Color(0xFF1C2B24);
  static const Color forestMid = Color(0xFF2F463B);
  static const Color forestSoft = Color(0xFF3D5C4E);
  static const Color mist = Color(0xFFD5E0D8);

  // Surfaces
  static const Color canvasLight = Color(0xFFF3F0EB);
  static const Color surfaceLight = Color(0xFFFAF8F5);
  static const Color surfaceRaised = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFE8EDE8);
  static const Color surfaceInset = Color(0xFFE4E0D9);

  // Text
  static const Color textPrimary = Color(0xFF1A211D);
  static const Color textSecondary = Color(0xFF5A655E);
  static const Color textMuted = Color(0xFF8A938C);
  static const Color textOnForest = Color(0xFFF7F5F2);

  // Lines / chrome
  static const Color divider = Color(0xFFD8DCD7);
  static const Color outlineSoft = Color(0xFFC9CFC8);

  // Status — calm, observational
  static const Color progress = forestSoft;
  static const Color progressTrack = Color(0xFFDCE3DC);
  static const Color exceeded = Color(0xFF8B6F4E); // warm earth, not alarm red
  static const Color info = Color(0xFF4A5F56);

  // Dark canvas (system dark)
  static const Color canvasDark = Color(0xFF121512);
  static const Color surfaceDark = Color(0xFF1A1F1B);
}

/// Layout breakpoints and content widths.
abstract final class AppBreakpoints {
  static const double dashboardWide = 840;
  static const double mobileMaxContent = 430;
  static const double desktopMaxContent = 720;
}
