import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';

/// Default progressive milestones for delay sessions.
abstract final class DefaultMilestones {
  static const List<MilestoneRule> rules = [
    MilestoneRule(
      id: 'm_1',
      at: Duration(minutes: 1),
      messageIds: ['first_minute', 'generic_keep_going'],
    ),
    MilestoneRule(
      id: 'm_3',
      at: Duration(minutes: 3),
      messageIds: ['urge_fades', 'generic_keep_going'],
    ),
    MilestoneRule(
      id: 'm_5',
      at: Duration(minutes: 5),
      messageIds: ['money_saved', 'five_minutes', 'generic_keep_going'],
    ),
    MilestoneRule(
      id: 'm_10',
      at: Duration(minutes: 10),
      messageIds: ['best_today', 'ten_minutes', 'generic_keep_going'],
    ),
    MilestoneRule(
      id: 'm_15',
      at: Duration(minutes: 15),
      messageIds: ['vs_yesterday', 'fifteen_minutes', 'generic_keep_going'],
    ),
    MilestoneRule(
      id: 'm_20',
      at: Duration(minutes: 20),
      messageIds: ['duration_fact', 'twenty_minutes', 'generic_keep_going'],
    ),
    MilestoneRule(
      id: 'm_30',
      at: Duration(minutes: 30),
      messageIds: ['above_average', 'thirty_minutes', 'generic_keep_going'],
    ),
    MilestoneRule(
      id: 'm_45',
      at: Duration(minutes: 45),
      messageIds: ['forty_five_minutes', 'generic_keep_going'],
    ),
    MilestoneRule(
      id: 'm_60',
      at: Duration(minutes: 60),
      messageIds: ['personal_record', 'sixty_minutes', 'generic_keep_going'],
    ),
  ];
}
