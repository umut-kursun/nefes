import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';

/// Pluggable message source.
///
/// The engine walks [MilestoneRule.messageIds] in order and asks each provider
/// for that id — first non-null wins.
abstract class MotivationMessageProvider {
  MotivationMessage? resolveId({
    required String messageId,
    required MilestoneRule milestone,
    required MotivationContext context,
  });
}
