/// A well-established recovery threshold keyed by time since last cigarette.
class RecoveryMilestone {
  const RecoveryMilestone({
    required this.id,
    required this.at,
    required this.timeLabel,
    required this.body,
  });

  /// Stable id (e.g. `r_20m`).
  final String id;

  /// Elapsed time since last smoke required to unlock.
  final Duration at;

  /// Short human label for the threshold (e.g. `20 dk`, `12 saat`).
  final String timeLabel;

  /// Calm, non-diagnostic body copy.
  final String body;
}
