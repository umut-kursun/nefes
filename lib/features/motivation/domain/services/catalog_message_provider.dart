import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/motivation_message_provider.dart';

/// Milestone catalog — static templates plus dynamic fact lines.
///
/// Personalized copy belongs in a separate [MotivationMessageProvider].
class CatalogMessageProvider implements MotivationMessageProvider {
  const CatalogMessageProvider();

  @override
  MotivationMessage? resolve({
    required MilestoneRule milestone,
    required MotivationContext context,
  }) {
    for (final messageId in milestone.messageIds) {
      final message = _build(messageId, milestone, context);
      if (message != null) return message;
    }
    return null;
  }

  MotivationMessage? _build(
    String messageId,
    MilestoneRule milestone,
    MotivationContext context,
  ) {
    final facts = _factsFor(context);
    switch (messageId) {
      case 'first_minute':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Harika.\nİlk dakikayı geçtin.',
          facts: facts,
        );
      case 'urge_fades':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Çoğu istek birkaç dakika içinde zayıflar.',
          facts: facts,
        );
      case 'money_saved':
        final money = context.moneySaved;
        if (money == null) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bugün yaklaşık ${MoneyCalculator.formatTry(money)} cebinde kaldı.',
          facts: facts,
        );
      case 'five_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Beş dakika direndin. İstek hafifliyor.',
          facts: facts,
        );
      case 'best_today':
        if (!context.isPersonalBestToday) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bugünkü en uzun bekleme süren.',
          facts: facts,
        );
      case 'ten_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'On dakika. Bu isteği geride bırakıyorsun.',
          facts: facts,
        );
      case 'vs_yesterday':
        if (!context.isAheadOfYesterday) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Dünkü aynı saate göre daha iyi gidiyorsun.',
          facts: facts,
        );
      case 'fifteen_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'On beş dakika bekledin. Güçlü bir tercih.',
          facts: facts,
        );
      case 'duration_fact':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yirmi dakikadır bekliyorsun.',
          facts: facts,
        );
      case 'twenty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yirmi dakika. Nefesine tutunmaya devam.',
          facts: facts,
        );
      case 'above_average':
        if (!context.isAboveAverageDelay) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bugün ortalamandan daha uzun bekliyorsun.',
          facts: facts,
        );
      case 'thirty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yarım saat. Bu bir zafer.',
          facts: facts,
        );
      case 'forty_five_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Kırk beş dakika. İstek büyük ölçüde geçti.',
          facts: facts,
        );
      case 'personal_record':
        if (!context.isPersonalBestAllTime) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yeni kişisel rekor.',
          facts: facts,
        );
      case 'sixty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bir saat bekledin. Bu senin gücün.',
          facts: facts,
        );
      case 'generic_keep_going':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Devam et. Her dakika sayılır.',
          facts: facts,
        );
      default:
        return null;
    }
  }

  List<MotivationFact> _factsFor(MotivationContext context) {
    final facts = <MotivationFact>[];
    final minutes = context.elapsed.inMinutes;
    if (minutes >= 1) {
      facts.add(
        MotivationFact(
          kind: MotivationFactKind.delayDuration,
          label: '$minutes dk',
        ),
      );
    }
    if (context.cigarettesDelayed > 0) {
      facts.add(
        MotivationFact(
          kind: MotivationFactKind.cigarettesDelayed,
          label: '${context.cigarettesDelayed} sigara ertelendi',
        ),
      );
    }
    final money = context.moneySaved;
    if (money != null) {
      facts.add(
        MotivationFact(
          kind: MotivationFactKind.moneySaved,
          label: MoneyCalculator.formatTry(money),
        ),
      );
    }
    if (context.isPersonalBestToday || context.isPersonalBestAllTime) {
      facts.add(
        const MotivationFact(
          kind: MotivationFactKind.personalBest,
          label: 'Kişisel en iyi',
        ),
      );
    }
    if (context.isAheadOfYesterday) {
      facts.add(
        const MotivationFact(
          kind: MotivationFactKind.todayVsYesterday,
          label: 'Dünden daha iyi',
        ),
      );
    }
    return facts;
  }
}
