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

/// Soft rounded geometry with clear hierarchy.
abstract final class AppRadius {
  static const double xs = 6;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double pill = 999;

  static final BorderRadius xsAll = BorderRadius.circular(xs);
  static final BorderRadius smAll = BorderRadius.circular(sm);
  static final BorderRadius mdAll = BorderRadius.circular(md);
  static final BorderRadius lgAll = BorderRadius.circular(lg);
  static final BorderRadius xlAll = BorderRadius.circular(xl);
}

/// NEFES semantic color tokens (light) — warm cream / deep forest / soft sage.
abstract final class AppColors {
  // Brand seeds (legacy aliases)
  static const Color seedLight = forest;
  static const Color seedDark = Color(0xFFA8C3B5);

  // Core brand
  static const Color forest = Color(0xFF1C2B24);
  static const Color forestMid = Color(0xFF2F463B);
  static const Color forestSoft = Color(0xFF3D5C4E);
  static const Color mist = Color(0xFFD5E0D8);
  static const Color sage = Color(0xFFC9D6CE);

  // Surfaces
  static const Color canvasLight = Color(0xFFF7F5F2);
  static const Color surfaceLight = Color(0xFFFFFDFB);
  static const Color surfaceRaised = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFE8EDE8);
  static const Color surfaceInset = Color(0xFFE4E0D9);
  static const Color surfaceSage = Color(0xFFE3EBE5);
  static const Color surfaceSecondaryAction = surfaceSage;

  // Text
  static const Color textPrimary = Color(0xFF1A211D);
  static const Color textSecondary = Color(0xFF4F5B54);
  static const Color textMuted = Color(0xFF7A857E);
  static const Color textTertiary = Color(0xFF9AA39C);
  static const Color textOnForest = Color(0xFFF7F5F2);
  static const Color textOnSage = Color(0xFF1C2B24);

  // Lines / chrome
  static const Color divider = Color(0xFFE0E4DF);
  static const Color borderSubtle = Color(0xFFE6EAE4);
  static const Color outlineSoft = Color(0xFFC9CFC8);

  // Status
  static const Color progress = forestSoft;
  static const Color progressTrack = Color(0xFFE4EBE5);
  static const Color exceeded = Color(0xFF8B6F4E);
  static const Color info = Color(0xFF4A5F56);
  static const Color insightAccent = Color(0xFF7A9588);
  static const Color danger = Color(0xFF8B4A3A);
  static const Color onDanger = Color(0xFFFFF8F6);
  static const Color dangerContainer = Color(0xFFF3DDD7);
  static const Color onDangerContainer = Color(0xFF5C2B22);

  // Gain tile badge tints — soft, never loud
  static const Color badgeMoneyBg = Color(0xFFE7EFE9);
  static const Color badgeMoneyFg = Color(0xFF3D5C4E);
  static const Color badgeTimeBg = Color(0xFFE8EEF2);
  static const Color badgeTimeFg = Color(0xFF4A5F6A);
  static const Color badgeSessionsBg = Color(0xFFE4EBE5);
  static const Color badgeSessionsFg = Color(0xFF2F463B);
  static const Color badgeHeartBg = Color(0xFFF0EBE6);
  static const Color badgeHeartFg = Color(0xFF6B5344);
  static const Color badgeDefaultBg = Color(0xFFECEEEA);
  static const Color badgeDefaultFg = Color(0xFF3D5C4E);

  // Hero achievement chip (reference pink pill)
  static const Color achievementChipBg = Color(0xFFF3E4E2);
  static const Color achievementChipFg = Color(0xFF9B4A4A);
  static const Color actionBeige = Color(0xFFEDE6DC);

  // Soft elevation (Apple Health–like)
  static const Color shadowSoft = Color(0x14000000);

  // Dark canvas
  static const Color canvasDark = Color(0xFF121512);
  static const Color surfaceDark = Color(0xFF1A1F1B);

  // Nav
  static const Color navSelectedFill = Color(0xFFDDE7E1);
}

/// Layout breakpoints and content widths.
abstract final class AppBreakpoints {
  static const double dashboardWide = 840;
  static const double twinActionsMin = 380;

  /// Mobile content column (phone-first).
  static const double mobileMaxContent = 430;

  /// Desktop Today / reading column.
  static const double desktopMaxContent = 760;

  /// Compact blocks stay denser than the column when needed.
  static const double todayDenseBlock = 420;
}

/// Today dashboard density — tuned to the approved design reference (~412×915).
abstract final class TodayScale {
  // Header
  static const double brandSize = 22;
  static const double dateSize = 13;
  static const double overflowButton = 36;

  // Hero (~24% of viewport, matching the approved reference proportions)
  static const double heroViewportFraction = 0.24;
  static const double heroMinHeight = 180;
  static const double heroMaxHeight = 230;
  static const double heroEmptyHeight = 150;
  static const double heroLabelSize = 11;
  static const double timerHhMm = 48;
  static const double timerSs = 26;
  static const double timerRowHeight = 52;

  // Daily status — lighter, less dominant
  static const double statusCountSize = 18;
  static const double progressTrackHeight = 6;

  // Actions — equal visual weight square cards
  static const double actionIconBox = 32;
  static const double actionIconGlyph = 20;
  static const double actionTitleSize = 15;
  static const double actionSubtitleSize = 11;
  static const double actionMinBody = 88;

  // Gains — one grouped card (primary + secondary row)
  static const double gainPrimaryValue = 28;
  static const double gainSecondaryValue = 16;
  static const double gainLabelSize = 11;
  static const double gainPrimaryIcon = 40;

  // Metrics (legacy)
  static const double metricValueSize = 18;
  static const double metricUnitSize = 12;
  static const double metricLabelSize = 11;
  static const double metricDividerHeight = 34;

  // Timeline — horizontal bubbles
  static const double timelineTimeSize = 11;
  static const double timelineTitleSize = 12;
  static const double timelineTimeCol = 40;
  static const double timelineBubble = 72;
}
