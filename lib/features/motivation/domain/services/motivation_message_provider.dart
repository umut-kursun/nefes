import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';

/// Pluggable message source.
///
/// Catalog and (later) personalized providers implement this.
/// Return null when the provider has nothing for the requested ids.
abstract class MotivationMessageProvider {
  MotivationMessage? resolve({
    required MilestoneRule milestone,
    required MotivationContext context,
  });
}
