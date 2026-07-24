import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/motivation_message_provider.dart';

/// Personalized lines when enough history exists.
class PersonalizedMessageProvider implements MotivationMessageProvider {
  const PersonalizedMessageProvider();

  @override
  MotivationMessage? resolveId({
    required String messageId,
    required MilestoneRule milestone,
    required MotivationContext context,
  }) {
    switch (messageId) {
      case 'personal_vs_yesterday_delay':
        final improvement = context.improvementVsYesterdayBest;
        if (improvement == null || improvement.inMinutes < 1) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body:
              'Düne göre ${improvement.inMinutes} dk daha uzun bekliyorsun.',
        );
      case 'personal_longest_today':
        if (!context.isPersonalBestToday) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bugünün en uzun sigarasız süresi bu.',
        );
      case 'personal_money_today':
        final moneyToday = context.moneySavedToday;
        if (moneyToday == null || moneyToday < 1) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body:
              'Bugün şimdilik ${MoneyCalculator.formatTry(moneyToday)} biriktirdin.',
        );
      case 'personal_usual_time':
        if (!context.usuallySmokesAroundNow) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Genelde bu saatte içerdin.\nBugün bekliyorsun.',
        );
      default:
        return null;
    }
  }
}
