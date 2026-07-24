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

/// Soft rounded geometry — design-system radii 8/12/16/20/24/28.
abstract final class AppRadius {
  static const double xs = 8;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double card = 20;
  static const double xl = 24;
  static const double xxl = 28;
  static const double pill = 999;

  static final BorderRadius xsAll = BorderRadius.circular(xs);
  static final BorderRadius smAll = BorderRadius.circular(sm);
  static final BorderRadius mdAll = BorderRadius.circular(md);
  static final BorderRadius lgAll = BorderRadius.circular(lg);
  static final BorderRadius cardAll = BorderRadius.circular(card);
  static final BorderRadius xlAll = BorderRadius.circular(xl);
}

/// NEFES semantic color tokens (light) — warm cream / deep forest / soft sage.
abstract final class AppColors {
  // Brand seeds (legacy aliases)
  static const Color seedLight = forest;
  static const Color seedDark = Color(0xFFA8C3B5);

  // Core brand — Primary #1E5B3A, Primary Light / Success #34C759 (design system)
  static const Color forest = Color(0xFF1E5B3A);
  static const Color forestMid = Color(0xFF256B45);
  static const Color forestSoft = Color(0xFF2E7D4F);
  static const Color primaryLight = Color(0xFF34C759);
  static const Color mist = Color(0xFFD8E6DD);
  static const Color sage = Color(0xFFC9D6CE);

  // Surfaces
  static const Color canvasLight = Color(0xFFF7F9F7);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceRaised = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF5F7F5);
  static const Color surfaceInset = Color(0xFFEFF2EF);
  static const Color surfaceSage = Color(0xFFEAF3EC);
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
  static const Color progress = primaryLight;
  static const Color progressTrack = Color(0xFFE6EFE8);
  static const Color exceeded = Color(0xFFFFB020);
  static const Color info = Color(0xFF4A5F56);
  static const Color insightAccent = forestSoft;
  static const Color success = Color(0xFF34C759);
  static const Color warning = Color(0xFFFFB020);
  static const Color danger = Color(0xFFFF4D4F);
  static const Color onDanger = Color(0xFFFFFFFF);
  static const Color dangerContainer = Color(0xFFFDE8E8);
  static const Color onDangerContainer = Color(0xFFC0271C);

  // Gain tile badge tints — soft, never loud
  static const Color badgeMoneyBg = Color(0xFFE4F2E9);
  static const Color badgeMoneyFg = forest;
  static const Color badgeTimeBg = Color(0xFFE4F2E9);
  static const Color badgeTimeFg = forestSoft;
  static const Color badgeSessionsBg = Color(0xFFE4F2E9);
  static const Color badgeSessionsFg = forestSoft;
  static const Color badgeHeartBg = Color(0xFFFCE7E9);
  static const Color badgeHeartFg = Color(0xFFE5484D);
  static const Color badgeDefaultBg = Color(0xFFE4F2E9);
  static const Color badgeDefaultFg = forestSoft;

  // Hero achievement chip (reference soft rose pill)
  static const Color achievementChipBg = Color(0xFFFCE7E9);
  static const Color achievementChipFg = Color(0xFFC0384A);
  static const Color actionBeige = Color(0xFFF0EEE9);

  // Soft elevation — Card Shadow 0px 8px 24px rgba(0,0,0,0.06)
  static const Color shadowSoft = Color(0x0F000000);

  // Dark canvas
  static const Color canvasDark = Color(0xFF121512);
  static const Color surfaceDark = Color(0xFF1A1F1B);

  // Nav
  static const Color navSelectedFill = Color(0xFFE4F2E9);
}

/// Card elevation preset — Card Shadow 0px 8px 24px rgba(0,0,0,0.06).
const List<BoxShadow> kCardShadow = [
  BoxShadow(
    color: Color(0x0F000000),
    blurRadius: 24,
    offset: Offset(0, 8),
  ),
];

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

  // Hero (~26% of viewport; Display XL timer at 56 / Bold per design system)
  static const double heroViewportFraction = 0.26;
  static const double heroMinHeight = 190;
  static const double heroMaxHeight = 250;
  static const double heroEmptyHeight = 150;
  static const double heroLabelSize = 12;
  static const double timerHhMm = 56;
  static const double timerSs = 30;
  static const double timerRowHeight = 62;

  // Daily status — lighter, less dominant
  static const double statusCountSize = 20;
  static const double progressTrackHeight = 8;

  // Actions — equal visual weight square cards
  static const double actionIconBox = 32;
  static const double actionIconGlyph = 20;
  static const double actionTitleSize = 15;
  static const double actionSubtitleSize = 11;
  static const double actionMinBody = 88;

  // Gains — one grouped card (primary + secondary row)
  static const double gainPrimaryValue = 32;
  static const double gainSecondaryValue = 16;
  static const double gainLabelSize = 12;
  static const double gainPrimaryIcon = 60;

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
