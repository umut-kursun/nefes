import 'package:nefes/features/motivation/domain/entities/recovery_milestone.dart';
import 'package:nefes/features/motivation/domain/services/recovery_timeline.dart';

/// Snapshot of unlocked + next recovery milestones for a given elapsed duration.
class RecoveryTimelineSnapshot {
  const RecoveryTimelineSnapshot({
    required this.unlocked,
    this.next,
  });

  final List<RecoveryMilestone> unlocked;
  final RecoveryMilestone? next;

  static const empty = RecoveryTimelineSnapshot(unlocked: []);
}

/// Selects unlocked / next recovery milestones from [RecoveryTimeline].
class RecoveryTimelineEvaluator {
  const RecoveryTimelineEvaluator([
    this.milestones = RecoveryTimeline.milestones,
  ]);

  final List<RecoveryMilestone> milestones;

  RecoveryTimelineSnapshot evaluate(Duration? elapsed) {
    if (elapsed == null || elapsed.isNegative) {
      return RecoveryTimelineSnapshot.empty;
    }

    final unlocked = <RecoveryMilestone>[];
    RecoveryMilestone? next;
    for (final rule in milestones) {
      if (elapsed >= rule.at) {
        unlocked.add(rule);
      } else {
        next = rule;
        break;
      }
    }
    return RecoveryTimelineSnapshot(unlocked: unlocked, next: next);
  }
}
