/// Positive framing when a delay ends because the user smoked.
///
/// Effort is celebrated — never framed as failure.
class EffortCelebration {
  const EffortCelebration({
    required this.resisted,
    required this.message,
    this.yesterdayBest,
    this.improvement,
  });

  final Duration resisted;
  final String message;
  final Duration? yesterdayBest;
  final Duration? improvement;
}
