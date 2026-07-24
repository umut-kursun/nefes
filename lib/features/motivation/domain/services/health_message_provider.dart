import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/services/motivation_message_provider.dart';

/// Educational habit/health coaching — no exaggerated medical claims.
class HealthMessageProvider implements MotivationMessageProvider {
  const HealthMessageProvider();

  @override
  MotivationMessage? resolveId({
    required String messageId,
    required MilestoneRule milestone,
    required MotivationContext context,
  }) {
    switch (messageId) {
      case 'health_craving_fades':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'En güçlü istek genelde birkaç dakika içinde yumuşar.',
        );
      case 'health_habit_loop':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Her dakika alışkanlık döngüsünü biraz daha zayıflatır.',
        );
      case 'health_waiting_success':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Beklemek bile bir başarıdır.',
        );
      case 'health_every_minute':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Her erteleme önemli.',
        );
      case 'health_pace':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Acele etmek zorunda değilsin.\nNefesine dön.',
        );
      case 'health_body_benefits':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bu mola, alışkanlığa karşı küçük bir kazanım.',
        );
      default:
        return null;
    }
  }
}
