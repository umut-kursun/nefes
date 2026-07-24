import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/services/motivation_message_provider.dart';

/// Short, calm Turkish coach lines — natural companion, never a machine.
class CatalogMessageProvider implements MotivationMessageProvider {
  const CatalogMessageProvider();

  @override
  MotivationMessage? resolveId({
    required String messageId,
    required MilestoneRule milestone,
    required MotivationContext context,
  }) {
    switch (messageId) {
      case 'first_minute':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Güzel.\nİlk dakikayı geçtin.',
        );
      case 'urge_fades':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'İlk istek dalgasını atlattın.',
        );
      case 'minutes_earned':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Birkaç dakika daha kazandın.',
        );
      case 'five_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Beş dakika oldu.\nİstek yavaş yavaş azalıyor.',
        );
      case 'best_today':
        if (!context.isPersonalBestToday) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bugünkü en uzun bekleyişin.',
        );
      case 'ten_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'On dakika.\nİyi gidiyorsun.',
        );
      case 'vs_yesterday':
        if (!context.isAheadOfYesterday &&
            context.improvementVsYesterdayBest == null) {
          return null;
        }
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Düne göre daha sakin ilerliyorsun.',
        );
      case 'fifteen_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'On beş dakika.\nBu gerçek bir tercih.',
        );
      case 'twenty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yirmi dakika.\nNefesine eşlik et.',
        );
      case 'above_average':
        if (!context.isAboveAverageDelay) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bugün ortalamanın üzerinde ilerliyorsun.',
        );
      case 'thirty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yarım saat.\nBunu hak ettin.',
        );
      case 'forty_five_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Kırk beş dakika.\nİstek büyük ölçüde geçti.',
        );
      case 'personal_record':
        if (!context.isPersonalBestAllTime) return null;
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yeni kişisel rekor.\nBunu hak ettin.',
        );
      case 'sixty_minutes':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bir saat.\nBugün güçlü bir gün.',
        );
      case 'next_target_near':
        final next = context.nextMilestone;
        if (next == null) return null;
        final left = next.at - context.elapsed;
        if (left.inSeconds < 20 || left.inMinutes > 20) return null;
        final label = left.inMinutes >= 1
            ? '${left.inMinutes} dk'
            : '${left.inSeconds} sn';
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Bir sonraki hedefe çok az kaldı.\n($label)',
        );
      case 'generic_keep_going':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Devam et.\nHer dakika bir kazanım.',
        );
      case 'pre_milestone':
        return MotivationMessage(
          id: messageId,
          milestoneAt: Duration.zero,
          body: 'Birlikte bekleyelim.\nİlk dakika yakında.',
        );
      case 'duration_fact':
        return MotivationMessage(
          id: messageId,
          milestoneAt: milestone.at,
          body: 'Yirmi dakika oldu.\nBir adım daha.',
        );
      default:
        return null;
    }
  }
}
