import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/services/motivation_message_provider.dart';

/// Short, friendly milestone catalog — never preachy, never guilt.
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
    switch (messageId) {
      case 'first_minute':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Harika.\nİlk dakikayı geçtin.',
        );
      case 'urge_fades':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'İlk istek dalgasını atlattın.',
        );
      case 'money_saved':
        if (context.moneySaved == null) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Biraz daha devam et.',
        );
      case 'five_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Beş dakika.\nİstek hafifliyor.',
        );
      case 'best_today':
        if (!context.isPersonalBestToday) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bugün gerçekten iyi gidiyorsun.',
        );
      case 'ten_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'On dakika.\nMomentum sende.',
        );
      case 'vs_yesterday':
        if (!context.isAheadOfYesterday &&
            context.improvementVsYesterdayBest == null) {
          return null;
        }
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Dünkü aynı saate göre daha iyi.',
        );
      case 'fifteen_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'On beş dakika.\nGüçlü bir tercih.',
        );
      case 'duration_fact':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yirmi dakika.\nDevam et.',
        );
      case 'twenty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yirmi dakika.\nNefesine tutun.',
        );
      case 'above_average':
        if (!context.isAboveAverageDelay) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bugün ortalamanın üzerindesin.',
        );
      case 'thirty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yarım saat.\nBu büyük bir adım.',
        );
      case 'forty_five_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Kırk beş dakika.\nİstek geçiyor.',
        );
      case 'personal_record':
        if (!context.isPersonalBestAllTime) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yeni kişisel rekor.',
        );
      case 'sixty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bir saat.\nBu senin gücün.',
        );
      case 'generic_keep_going':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Devam et.\nHer dakika sayılır.',
        );
      case 'pre_milestone':
        return MotivationMessage(
          id: messageId,
          milestoneAt: Duration.zero,
          body: 'Nefesine tutun.\nİlk dakika geliyor.',
        );
      default:
        return null;
    }
  }
}
