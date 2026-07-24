import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';

/// Default progressive milestones — mix encouragement, health, progress.
abstract final class DefaultMilestones {
  static const List<MilestoneRule> rules = [
    MilestoneRule(
      id: 'm_1',
      at: Duration(minutes: 1),
      messageIds: [
        'first_minute',
        'health_craving_fades',
        'generic_keep_going',
      ],
    ),
    MilestoneRule(
      id: 'm_3',
      at: Duration(minutes: 3),
      messageIds: [
        'urge_fades',
        'health_craving_fades',
        'minutes_earned',
        'generic_keep_going',
      ],
    ),
    MilestoneRule(
      id: 'm_5',
      at: Duration(minutes: 5),
      messageIds: [
        'health_waiting_success',
        'five_minutes',
        'health_habit_loop',
        'personal_usual_time',
        'generic_keep_going',
      ],
    ),
    MilestoneRule(
      id: 'm_10',
      at: Duration(minutes: 10),
      messageIds: [
        'best_today',
        'personal_longest_today',
        'health_every_minute',
        'ten_minutes',
        'generic_keep_going',
      ],
    ),
    MilestoneRule(
      id: 'm_15',
      at: Duration(minutes: 15),
      messageIds: [
        'personal_vs_yesterday_delay',
        'health_pace',
        'vs_yesterday',
        'fifteen_minutes',
        'next_target_near',
        'generic_keep_going',
      ],
    ),
    MilestoneRule(
      id: 'm_20',
      at: Duration(minutes: 20),
      messageIds: [
        'health_habit_loop',
        'personal_money_today',
        'twenty_minutes',
        'next_target_near',
        'generic_keep_going',
      ],
    ),
    MilestoneRule(
      id: 'm_30',
      at: Duration(minutes: 30),
      messageIds: [
        'health_body_benefits',
        'above_average',
        'thirty_minutes',
        'generic_keep_going',
      ],
    ),
    MilestoneRule(
      id: 'm_45',
      at: Duration(minutes: 45),
      messageIds: [
        'health_every_minute',
        'forty_five_minutes',
        'generic_keep_going',
      ],
    ),
    MilestoneRule(
      id: 'm_60',
      at: Duration(minutes: 60),
      messageIds: [
        'personal_record',
        'health_waiting_success',
        'sixty_minutes',
        'generic_keep_going',
      ],
    ),
  ];
}
