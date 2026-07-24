import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/progress_card.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';

/// Builds progress facts for a milestone; prefers session money with clear scope.
abstract class ProgressCardProvider {
  List<ProgressCard> cardsFor({
    required MotivationContext context,
    required MilestoneRule? milestone,
    required Set<ProgressCardKind> recentlyShown,
  });
}

class CatalogProgressCardProvider implements ProgressCardProvider {
  const CatalogProgressCardProvider({this.maxCards = 1});

  final int maxCards;

  @override
  List<ProgressCard> cardsFor({
    required MotivationContext context,
    required MilestoneRule? milestone,
    required Set<ProgressCardKind> recentlyShown,
  }) {
    final candidates = <ProgressCard>[];

    final sessionMoney = context.moneySaved;
    if (sessionMoney != null) {
      candidates.add(
        ProgressCard(
          kind: ProgressCardKind.moneySaved,
          title: 'Bu oturum tahmini',
          value: MoneyCalculator.formatTry(sessionMoney),
        ),
      );
    } else if (context.moneySavedToday != null) {
      candidates.add(
        ProgressCard(
          kind: ProgressCardKind.moneySaved,
          title: 'Bugünkü toplam',
          value: MoneyCalculator.formatTry(context.moneySavedToday!),
        ),
      );
    }

    return candidates.take(maxCards).toList(growable: false);
  }
}
