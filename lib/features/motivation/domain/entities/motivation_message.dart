/// A single motivational line (or short block) for a delay milestone.
class MotivationMessage {
  const MotivationMessage({
    required this.id,
    required this.milestoneAt,
    required this.body,
    this.facts = const [],
  });

  final String id;
  final Duration milestoneAt;
  final String body;
  final List<MotivationFact> facts;
}

/// Dynamic fact chip shown under the message body.
class MotivationFact {
  const MotivationFact({
    required this.kind,
    required this.label,
  });

  final MotivationFactKind kind;
  final String label;
}

enum MotivationFactKind {
  moneySaved,
  cigarettesDelayed,
  delayDuration,
  personalBest,
  todayVsYesterday,
}
