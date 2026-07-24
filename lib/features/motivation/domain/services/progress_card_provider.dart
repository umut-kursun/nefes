import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/progress_card.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';

/// Builds progress cards for a milestone; rotates kinds to avoid repetition.
abstract class ProgressCardProvider {
  List<ProgressCard> cardsFor({
    required MotivationContext context,
    required MilestoneRule? milestone,
    required Set<ProgressCardKind> recentlyShown,
  });
}

class CatalogProgressCardProvider implements ProgressCardProvider {
  const CatalogProgressCardProvider({this.maxCards = 2});

  final int maxCards;

  @override
  List<ProgressCard> cardsFor({
    required MotivationContext context,
    required MilestoneRule? milestone,
    required Set<ProgressCardKind> recentlyShown,
  }) {
    final candidates = _candidates(context);
    if (candidates.isEmpty) return const [];

    final preferred = <ProgressCard>[];
    final fallback = <ProgressCard>[];
    for (final card in candidates) {
      if (recentlyShown.contains(card.kind)) {
        fallback.add(card);
      } else {
        preferred.add(card);
      }
    }

    final ordered = [...preferred, ...fallback];
    return ordered.take(maxCards).toList(growable: false);
  }

  List<ProgressCard> _candidates(MotivationContext context) {
    final cards = <ProgressCard>[];

    final money = context.moneySavedToday ?? context.moneySaved;
    if (money != null) {
      cards.add(
        ProgressCard(
          kind: ProgressCardKind.moneySaved,
          title: 'Birikim',
          value: MoneyCalculator.formatTry(money),
        ),
      );
    }

    final minutes = context.elapsed.inMinutes;
    if (minutes >= 1) {
      cards.add(
        ProgressCard(
          kind: ProgressCardKind.timeSmokeFree,
          title: 'Sigarasız süre',
          value: '$minutes dk',
        ),
      );
    }

    if (context.cigarettesDelayed > 0) {
      cards.add(
        ProgressCard(
          kind: ProgressCardKind.cigarettesAvoided,
          title: 'Ertelenen',
          value: '${context.cigarettesDelayed} sigara',
        ),
      );
    }

    if (context.isPersonalBestToday || context.isPersonalBestAllTime) {
      cards.add(
        const ProgressCard(
          kind: ProgressCardKind.personalBest,
          title: 'Rekor',
          value: 'Kişisel en iyi',
        ),
      );
    }

    final improvement = context.improvementVsYesterdayBest;
    if (improvement != null && improvement.inMinutes >= 1) {
      cards.add(
        ProgressCard(
          kind: ProgressCardKind.betterThanYesterday,
          title: 'Dünden iyi',
          value: '+${improvement.inMinutes} dk',
        ),
      );
    } else if (context.isAheadOfYesterday) {
      cards.add(
        const ProgressCard(
          kind: ProgressCardKind.betterThanYesterday,
          title: 'Dünden iyi',
          value: 'Daha az sigara',
        ),
      );
    }

    final next = context.nextMilestone;
    if (next != null) {
      final remaining = next.at - context.elapsed;
      final secs = remaining.inSeconds.clamp(1, 24 * 60 * 60);
      final label = secs >= 60
          ? '${(secs / 60).ceil()} dk'
          : '$secs sn';
      cards.add(
        ProgressCard(
          kind: ProgressCardKind.nextTarget,
          title: 'Sonraki hedef',
          value: label,
        ),
      );
    }

    return cards;
  }
}
