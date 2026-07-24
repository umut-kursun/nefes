import 'package:nefes/features/motivation/domain/entities/coach_snapshot.dart';
import 'package:nefes/features/motivation/domain/entities/delay_session.dart';
import 'package:nefes/features/motivation/domain/entities/effort_celebration.dart';
import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/entities/progress_card.dart';
import 'package:nefes/features/motivation/domain/services/catalog_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/default_milestones.dart';
import 'package:nefes/features/motivation/domain/services/milestone_evaluator.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/motivation_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/personal_stats_provider.dart';
import 'package:nefes/features/motivation/domain/services/personalized_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/progress_card_provider.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';

/// Result of evaluating the active delay for motivational content.
class MotivationEvaluation {
  const MotivationEvaluation({
    required this.session,
    required this.elapsed,
    this.milestone,
    this.nextMilestone,
    this.message,
    this.cards = const [],
  });

  final DelaySession session;
  final Duration elapsed;
  final MilestoneRule? milestone;
  final MilestoneRule? nextMilestone;
  final MotivationMessage? message;
  final List<ProgressCard> cards;

  String? get messageId => message?.id;

  CoachSnapshot toSnapshot() => CoachSnapshot(
        session: session,
        elapsed: elapsed,
        milestone: milestone,
        nextMilestone: nextMilestone,
        message: message,
        cards: cards,
      );
}

/// Core motivation engine — milestones, messages, and progress cards.
class MotivationEngine {
  MotivationEngine({
    PersonalStatsProvider? statsProvider,
    MilestoneEvaluator? milestoneEvaluator,
    List<MotivationMessageProvider>? messageProviders,
    ProgressCardProvider? progressCardProvider,
  })  : statsProvider = statsProvider ?? const EventPersonalStatsProvider(),
        milestoneEvaluator =
            milestoneEvaluator ?? MilestoneEvaluator(milestones: DefaultMilestones.rules),
        messageProviders = List.unmodifiable(
          messageProviders ??
              const [
                PersonalizedMessageProvider(),
                CatalogMessageProvider(),
              ],
        ),
        progressCardProvider =
            progressCardProvider ?? const CatalogProgressCardProvider();

  final PersonalStatsProvider statsProvider;
  final MilestoneEvaluator milestoneEvaluator;
  final List<MotivationMessageProvider> messageProviders;
  final ProgressCardProvider progressCardProvider;

  DelaySession openSession({
    required ActiveDelaySession active,
    required List<SmokingLogEvent> allEvents,
  }) {
    return statsProvider.buildSession(
      sessionId: active.id,
      startedAtUtc: active.startedAtUtc,
      allEvents: allEvents,
      intendedDuration: active.intendedDuration,
    );
  }

  MotivationEvaluation evaluate({
    required DelaySession session,
    required List<SmokingLogEvent> allEvents,
    required DateTime nowUtc,
    double? pricePerCigarette,
    Set<ProgressCardKind> recentlyShown = const {},
  }) {
    final elapsed = session.elapsedAt(nowUtc);
    final milestone = milestoneEvaluator.highestReached(elapsed);
    final next = milestoneEvaluator.nextAfter(elapsed);
    final context = buildContext(
      session: session,
      allEvents: allEvents,
      nowUtc: nowUtc,
      pricePerCigarette: pricePerCigarette,
      nextMilestone: next,
    );

    MotivationMessage? message;
    if (milestone != null) {
      for (final provider in messageProviders) {
        message = provider.resolve(milestone: milestone, context: context);
        if (message != null) break;
      }
    } else {
      message = const CatalogMessageProvider().resolve(
        milestone: const MilestoneRule(
          id: 'm_0',
          at: Duration.zero,
          messageIds: ['pre_milestone'],
        ),
        context: context,
      );
    }

    final cards = progressCardProvider.cardsFor(
      context: context,
      milestone: milestone,
      recentlyShown: recentlyShown,
    );

    return MotivationEvaluation(
      session: session,
      elapsed: elapsed,
      milestone: milestone,
      nextMilestone: next,
      message: message,
      cards: cards,
    );
  }

  EffortCelebration celebrateEffort({
    required Duration resisted,
    required List<SmokingLogEvent> allEvents,
    required DateTime nowLocal,
  }) {
    final yesterday = DateTime(nowLocal.year, nowLocal.month, nowLocal.day)
        .subtract(const Duration(days: 1));
    final yesterdayBest = statsProvider.longestCompletedDelay(
      allEvents: allEvents,
      onlyLocalDay: yesterday,
    );

    Duration? improvement;
    if (yesterdayBest != null && resisted > yesterdayBest) {
      improvement = resisted - yesterdayBest;
    }

    final minutes = resisted.inMinutes.clamp(0, 24 * 60);
    final String message;
    if (yesterdayBest != null && improvement != null) {
      message =
          '$minutes dakika direndin.\nDün ${yesterdayBest.inMinutes} dakikaydın.\nBugün ${improvement.inMinutes} dk daha uzun.';
    } else if (yesterdayBest != null) {
      message =
          '$minutes dakika direndin.\nHer deneme seni güçlendirir.';
    } else if (minutes >= 1) {
      message =
          '$minutes dakika direndin.\nBu çaba kayda değer.';
    } else {
      message = 'Kısa da olsa direndin.\nBu bir başlangıç.';
    }

    return EffortCelebration(
      resisted: resisted,
      message: message,
      yesterdayBest: yesterdayBest,
      improvement: improvement,
    );
  }

  MotivationContext buildContext({
    required DelaySession session,
    required List<SmokingLogEvent> allEvents,
    required DateTime nowUtc,
    double? pricePerCigarette,
    MilestoneRule? nextMilestone,
  }) {
    final elapsed = session.elapsedAt(nowUtc);
    final nowLocal = nowUtc.toLocal();
    final day = session.localDayDate;
    final yesterday = day.subtract(const Duration(days: 1));
    final interval = statsProvider.averageInterSmokeInterval(
      allEvents: allEvents,
      localDay: day,
      lookbackDays: 7,
    );
    final cigarettesDelayed = statsProvider.estimatedCigarettesAvoided(
      elapsed: elapsed,
      averageInterSmokeInterval: interval,
    );

    final money = MoneyCalculator.moneyNotSpent(
      cigarettesDelayed: cigarettesDelayed < 1 && elapsed.inMinutes >= 1
          ? 1
          : cigarettesDelayed,
      pricePerCigarette: pricePerCigarette,
    );

    final completedToday = statsProvider.completedDelayCountOnDay(
      allEvents: allEvents,
      localDay: day,
      excludingSessionId: session.sessionId,
    );
    final moneyTodayBase = MoneyCalculator.moneyNotSpent(
      cigarettesDelayed: completedToday + (elapsed.inMinutes >= 1 ? 1 : 0),
      pricePerCigarette: pricePerCigarette,
    );

    final clockCap = DateTime(
      day.year,
      day.month,
      day.day,
      nowLocal.hour,
      nowLocal.minute,
      nowLocal.second,
    );

    return MotivationContext(
      session: session,
      elapsed: elapsed,
      cigarettesDelayed: cigarettesDelayed < 1 && elapsed.inMinutes >= 1
          ? 1
          : cigarettesDelayed,
      pricePerCigarette: pricePerCigarette,
      moneySaved: money,
      moneySavedToday: moneyTodayBase,
      longestDelayToday: statsProvider.longestCompletedDelay(
        allEvents: allEvents,
        onlyLocalDay: day,
        excludingSessionId: session.sessionId,
      ),
      longestDelayAllTime: statsProvider.longestCompletedDelay(
        allEvents: allEvents,
        excludingSessionId: session.sessionId,
      ),
      longestDelayYesterday: statsProvider.longestCompletedDelay(
        allEvents: allEvents,
        onlyLocalDay: yesterday,
      ),
      averageCompletedDelay: statsProvider.averageCompletedDelay(
        allEvents: allEvents,
        onlyLocalDay: day,
        excludingSessionId: session.sessionId,
      ),
      averageInterSmokeInterval: interval,
      todayCountAtNow: statsProvider.activeSmokeCountOnDay(
        allEvents: allEvents,
        localYear: day.year,
        localMonth: day.month,
        localDay: day.day,
        atOrBeforeLocal: clockCap,
      ),
      yesterdayCountAtSameClock: statsProvider.activeSmokeCountOnDay(
        allEvents: allEvents,
        localYear: yesterday.year,
        localMonth: yesterday.month,
        localDay: yesterday.day,
        atOrBeforeLocal: DateTime(
          yesterday.year,
          yesterday.month,
          yesterday.day,
          nowLocal.hour,
          nowLocal.minute,
          nowLocal.second,
        ),
      ),
      nextMilestone: nextMilestone,
      usuallySmokesAroundNow: statsProvider.usuallySmokesAround(
        allEvents: allEvents,
        localNow: nowLocal,
      ),
    );
  }
}
