/// A dynamic progress card shown during an active Delay Coach session.
class ProgressCard {
  const ProgressCard({
    required this.kind,
    required this.title,
    required this.value,
  });

  final ProgressCardKind kind;
  final String title;
  final String value;
}

enum ProgressCardKind {
  moneySaved,
  timeSmokeFree,
  cigarettesAvoided,
  personalBest,
  betterThanYesterday,
  nextTarget,
}
