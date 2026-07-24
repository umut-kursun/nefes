import 'package:nefes/features/motivation/domain/entities/delay_session.dart';
import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';

/// Computed facts available while evaluating a delay session.
///
/// Message and card providers read this; they do not compute stats themselves.
class MotivationContext {
  const MotivationContext({
    required this.session,
    required this.elapsed,
    required this.cigarettesDelayed,
    this.pricePerCigarette,
    this.moneySaved,
    this.moneySavedToday,
    this.longestDelayToday,
    this.longestDelayAllTime,
    this.longestDelayYesterday,
    this.averageCompletedDelay,
    this.averageInterSmokeInterval,
    this.todayCountAtNow,
    this.yesterdayCountAtSameClock,
    this.nextMilestone,
    this.usuallySmokesAroundNow = false,
  });

  final DelaySession session;
  final Duration elapsed;
  final int cigarettesDelayed;
  final double? pricePerCigarette;
  final double? moneySaved;
  final double? moneySavedToday;
  final Duration? longestDelayToday;
  final Duration? longestDelayAllTime;
  final Duration? longestDelayYesterday;
  final Duration? averageCompletedDelay;
  final Duration? averageInterSmokeInterval;
  final int? todayCountAtNow;
  final int? yesterdayCountAtSameClock;
  final MilestoneRule? nextMilestone;
  final bool usuallySmokesAroundNow;

  bool get isPersonalBestAllTime {
    final best = longestDelayAllTime;
    if (best == null) return elapsed.inMinutes >= 1;
    return elapsed > best;
  }

  bool get isPersonalBestToday {
    final best = longestDelayToday;
    if (best == null) return elapsed.inMinutes >= 1;
    return elapsed > best;
  }

  bool get isAboveAverageDelay {
    final avg = averageCompletedDelay;
    if (avg == null || avg.inSeconds <= 0) return false;
    return elapsed > avg;
  }

  bool get isAheadOfYesterday {
    final today = todayCountAtNow;
    final yesterday = yesterdayCountAtSameClock;
    if (today == null || yesterday == null) return false;
    return today < yesterday;
  }

  Duration? get improvementVsYesterdayBest {
    final yesterday = longestDelayYesterday;
    if (yesterday == null) return null;
    if (elapsed <= yesterday) return null;
    return elapsed - yesterday;
  }
}
