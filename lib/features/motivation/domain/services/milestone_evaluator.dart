import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/services/default_milestones.dart';

/// Selects reached / next milestones from a sorted rule catalog.
class MilestoneEvaluator {
  MilestoneEvaluator({List<MilestoneRule>? milestones})
      : milestones = List.unmodifiable(
          (List<MilestoneRule>.from(milestones ?? DefaultMilestones.rules)
            ..sort((a, b) => a.at.compareTo(b.at))),
        );

  final List<MilestoneRule> milestones;

  MilestoneRule? highestReached(Duration elapsed) {
    MilestoneRule? reached;
    for (final rule in milestones) {
      if (elapsed < rule.at) break;
      reached = rule;
    }
    return reached;
  }

  MilestoneRule? nextAfter(Duration elapsed) {
    for (final rule in milestones) {
      if (elapsed < rule.at) return rule;
    }
    return null;
  }

  /// Zero-based index of [rule] in the catalog, or -1.
  int indexOf(MilestoneRule? rule) {
    if (rule == null) return -1;
    return milestones.indexWhere((m) => m.id == rule.id);
  }
}
