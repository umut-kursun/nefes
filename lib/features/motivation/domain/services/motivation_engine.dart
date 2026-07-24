import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/motivation/domain/entities/coach_snapshot.dart';
import 'package:nefes/features/motivation/domain/entities/delay_session.dart';
import 'package:nefes/features/motivation/domain/entities/effort_celebration.dart';
import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/entities/progress_card.dart';
import 'package:nefes/features/motivation/domain/services/catalog_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/default_milestones.dart';
import 'package:nefes/features/motivation/domain/services/health_message_provider.dart';
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
    this.moneyCaption,
    this.cards = const [],
  });

  final DelaySession session;
  final Duration elapsed;
  final MilestoneRule? milestone;
  final MilestoneRule? nextMilestone;
  final MotivationMessage? message;
  final String? moneyCaption;
  final List<ProgressCard> cards;

  String? get messageId => message?.id;

  CoachSnapshot toSnapshot() => CoachSnapshot(
        session: session,
        elapsed: elapsed,
        milestone: milestone,
        nextMilestone: nextMilestone,
        message: message,
        moneyCaption: moneyCaption,
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
        milestoneEvaluator = milestoneEvaluator ??
            MilestoneEvaluator(milestones: DefaultMilestones.rules),
        messageProviders = List.unmodifiable(
          messageProviders ??
              const [
                PersonalizedMessageProvider(),
                HealthMessageProvider(),
                CatalogMessageProvider(),
              ],
        ),
        progressCardProvider =
            progressCardProvider ?? const CatalogProgressCardProvider(maxCards: 1);

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
    Set<String> recentMessageIds = const {},
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

    final ids = milestone?.messageIds ?? const ['pre_milestone'];
    final rule = milestone ??
        const MilestoneRule(
          id: 'm_0',
          at: Duration.zero,
          messageIds: ['pre_milestone'],
        );

    MotivationMessage? message;
    for (final messageId in ids) {
      if (recentMessageIds.contains(messageId) && ids.length > 1) {
        continue;
      }
      for (final provider in messageProviders) {
        message = provider.resolveId(
          messageId: messageId,
          milestone: rule,
          context: context,
        );
        if (message != null) break;
      }
      if (message != null) break;
    }

    // If everything was filtered by recent history, allow a repeat fallback.
    if (message == null) {
      for (final messageId in ids) {
        for (final provider in messageProviders) {
          message = provider.resolveId(
            messageId: messageId,
            milestone: rule,
            context: context,
          );
          if (message != null) break;
        }
        if (message != null) break;
      }
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
      moneyCaption: _moneyCaption(context),
      cards: cards,
    );
  }

  String? _moneyCaption(MotivationContext context) {
    final sessionMoney = context.moneySaved;
    if (sessionMoney != null) {
      return AppStrings.sessionMoneyEstimate(
        MoneyCalculator.formatTry(sessionMoney),
      );
    }
    final today = context.moneySavedToday;
    if (today != null) {
      return AppStrings.todayMoneyTotal(MoneyCalculator.formatTry(today));
    }
    return null;
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
          '$minutes dakika kazandın.\nDünden ${improvement.inMinutes} dk daha uzun.';
    } else if (yesterdayBest != null) {
      message = '$minutes dakika kazandın.\nHer deneme seni güçlendirir.';
    } else if (minutes >= 1) {
      message = '$minutes dakika kazandın.\nBu çaba kayda değer.';
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

    // One active urge = at most one cigarette for session money (never inflate).
    final sessionCigarettes = elapsed.inSeconds >= 30 ? 1 : 0;
    final moneySession = MoneyCalculator.moneyNotSpent(
      cigarettesDelayed: sessionCigarettes,
      pricePerCigarette: pricePerCigarette,
    );

    final urgePassedToday = statsProvider.urgePassedCountOnDay(
      allEvents: allEvents,
      localDay: day,
      excludingSessionId: session.sessionId,
    );
    final moneyToday = MoneyCalculator.moneyNotSpent(
      cigarettesDelayed: urgePassedToday,
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
      cigarettesDelayed: sessionCigarettes,
      pricePerCigarette: pricePerCigarette,
      moneySaved: moneySession,
      moneySavedToday: moneyToday,
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
