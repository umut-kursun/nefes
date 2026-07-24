import 'package:nefes/features/motivation/domain/entities/delay_session.dart';
import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/entities/progress_card.dart';

/// Presentation-ready Delay Coach frame for one evaluation tick.
class CoachSnapshot {
  const CoachSnapshot({
    required this.session,
    required this.elapsed,
    this.milestone,
    this.nextMilestone,
    this.message,
    this.moneyCaption,
    this.cards = const [],
  });

  final DelaySession session;
  final Duration elapsed;
  final MilestoneRule? milestone;
  final MilestoneRule? nextMilestone;
  final MotivationMessage? message;
  final String? moneyCaption;
  final List<ProgressCard> cards;

  String? get messageId => message?.id;
  String? get milestoneId => milestone?.id;
}
