/// Motivational delay session snapshot.
///
/// Built when a resist/delay starts. Does not mutate cigarette statistics.
class DelaySession {
  const DelaySession({
    required this.sessionId,
    required this.startedAtUtc,
    required this.cigaretteCountAtStart,
    required this.localYear,
    required this.localMonth,
    required this.localDay,
    this.intendedDuration,
    this.completedDelaysToday = 0,
    this.delayStreakDays = 0,
  });

  final String sessionId;
  final DateTime startedAtUtc;
  final int cigaretteCountAtStart;
  final int localYear;
  final int localMonth;
  final int localDay;
  final Duration? intendedDuration;

  /// Completed (non-cancelled) delays earlier today, at session open.
  final int completedDelaysToday;

  /// Consecutive local days with at least one completed delay (including today).
  final int delayStreakDays;

  DateTime get localDayDate => DateTime(localYear, localMonth, localDay);

  Duration elapsedAt(DateTime nowUtc) {
    final elapsed = nowUtc.difference(startedAtUtc);
    return elapsed.isNegative ? Duration.zero : elapsed;
  }
}
