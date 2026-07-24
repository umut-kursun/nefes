import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/motivation_message_provider.dart';

/// Personalized lines when enough history exists.
///
/// Returns null when it cannot personalize — catalog fills the gap.
class PersonalizedMessageProvider implements MotivationMessageProvider {
  const PersonalizedMessageProvider();

  @override
  MotivationMessage? resolve({
    required MilestoneRule milestone,
    required MotivationContext context,
  }) {
    final improvement = context.improvementVsYesterdayBest;
    if (improvement != null &&
        improvement.inMinutes >= 1 &&
        milestone.at.inMinutes >= 10) {
      return MotivationMessage(
        id: 'personal_vs_yesterday_delay',
        milestoneAt: milestone.at,
        body:
            'Düne göre ${improvement.inMinutes} dk daha uzun direniyorsun.',
      );
    }

    if (context.isPersonalBestToday && milestone.at.inMinutes >= 10) {
      return MotivationMessage(
        id: 'personal_longest_today',
        milestoneAt: milestone.at,
        body: 'Bugünün en uzun sigarasız süresi.',
      );
    }

    final moneyToday = context.moneySavedToday;
    if (moneyToday != null &&
        moneyToday >= 10 &&
        milestone.at.inMinutes >= 5) {
      return MotivationMessage(
        id: 'personal_money_today',
        milestoneAt: milestone.at,
        body:
            'Bugün yaklaşık ${MoneyCalculator.formatTry(moneyToday)} biriktirdin.',
      );
    }

    if (context.usuallySmokesAroundNow && milestone.at.inMinutes >= 3) {
      return MotivationMessage(
        id: 'personal_usual_time',
        milestoneAt: milestone.at,
        body: 'Genelde bu saatte içerdin.\nBugün erteledin.',
      );
    }

    return null;
  }
}
