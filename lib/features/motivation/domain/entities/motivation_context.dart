import 'package:nefes/features/motivation/domain/entities/delay_session.dart';

/// Computed facts available while evaluating a delay session.
///
/// Message providers read this; they do not compute stats themselves.
class MotivationContext {
  const MotivationContext({
    required this.session,
    required this.elapsed,
    required this.cigarettesDelayed,
    this.pricePerCigarette,
    this.moneySaved,
    this.longestDelayToday,
    this.longestDelayAllTime,
    this.averageCompletedDelay,
    this.todayCountAtNow,
    this.yesterdayCountAtSameClock,
  });

  final DelaySession session;
  final Duration elapsed;
  final int cigarettesDelayed;
  final double? pricePerCigarette;
  final double? moneySaved;
  final Duration? longestDelayToday;
  final Duration? longestDelayAllTime;
  final Duration? averageCompletedDelay;
  final int? todayCountAtNow;
  final int? yesterdayCountAtSameClock;

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
}
