/// A time-based milestone that can unlock motivational content.
class MilestoneRule {
  const MilestoneRule({
    required this.id,
    required this.at,
    required this.messageIds,
  });

  /// Stable rule id (e.g. `m_5`).
  final String id;

  /// Elapsed delay required to unlock this milestone.
  final Duration at;

  /// Ordered catalog message ids — first match that a provider can render wins.
  final List<String> messageIds;
}
