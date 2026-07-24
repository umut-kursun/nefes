import 'package:nefes/features/motivation/domain/entities/delay_session.dart';
import 'package:nefes/features/motivation/domain/entities/milestone_rule.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_context.dart';
import 'package:nefes/features/motivation/domain/entities/motivation_message.dart';
import 'package:nefes/features/motivation/domain/services/catalog_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/default_milestones.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/motivation/domain/services/motivation_message_provider.dart';
import 'package:nefes/features/motivation/domain/services/personal_stats_provider.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';

/// Result of evaluating the active delay for motivational content.
class MotivationEvaluation {
  const MotivationEvaluation({
    required this.session,
    required this.elapsed,
    this.milestone,
    this.message,
  });

  final DelaySession session;
  final Duration elapsed;
  final MilestoneRule? milestone;
  final MotivationMessage? message;

  String? get messageId => message?.id;
}

/// Core motivation engine — milestone selection + pluggable message providers.
///
/// Presentation stays outside; this class only produces data.
class MotivationEngine {
  MotivationEngine({
    PersonalStatsProvider? statsProvider,
    List<MilestoneRule>? milestones,
    List<MotivationMessageProvider>? messageProviders,
  })  : statsProvider = statsProvider ?? const EventPersonalStatsProvider(),
        milestones = List.unmodifiable(
          (List<MilestoneRule>.from(milestones ?? DefaultMilestones.rules)
            ..sort((a, b) => a.at.compareTo(b.at))),
        ),
        messageProviders = List.unmodifiable(
          messageProviders ?? const [CatalogMessageProvider()],
        );

  final PersonalStatsProvider statsProvider;
  final List<MilestoneRule> milestones;

  /// Providers are queried in order; first non-null message wins.
  /// Insert personalized providers ahead of the catalog later.
  final List<MotivationMessageProvider> messageProviders;

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
  }) {
    final elapsed = session.elapsedAt(nowUtc);
    final milestone = highestReached(elapsed);
    if (milestone == null) {
      return MotivationEvaluation(session: session, elapsed: elapsed);
    }

    final context = buildContext(
      session: session,
      allEvents: allEvents,
      nowUtc: nowUtc,
      pricePerCigarette: pricePerCigarette,
    );

    MotivationMessage? message;
    for (final provider in messageProviders) {
      message = provider.resolve(milestone: milestone, context: context);
      if (message != null) break;
    }

    return MotivationEvaluation(
      session: session,
      elapsed: elapsed,
      milestone: milestone,
      message: message,
    );
  }

  MilestoneRule? highestReached(Duration elapsed) {
    MilestoneRule? reached;
    for (final rule in milestones) {
      if (elapsed < rule.at) break;
      reached = rule;
    }
    return reached;
  }

  MotivationContext buildContext({
    required DelaySession session,
    required List<SmokingLogEvent> allEvents,
    required DateTime nowUtc,
    double? pricePerCigarette,
  }) {
    final elapsed = session.elapsedAt(nowUtc);
    final nowLocal = nowUtc.toLocal();
    final cigarettesDelayed = 1;

    final money = MoneyCalculator.moneyNotSpent(
      cigarettesDelayed: cigarettesDelayed,
      pricePerCigarette: pricePerCigarette,
    );

    final day = session.localDayDate;
    final yesterday = day.subtract(const Duration(days: 1));
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
      cigarettesDelayed: cigarettesDelayed,
      pricePerCigarette: pricePerCigarette,
      moneySaved: money,
      longestDelayToday: statsProvider.longestCompletedDelay(
        allEvents: allEvents,
        onlyLocalDay: day,
        excludingSessionId: session.sessionId,
      ),
      longestDelayAllTime: statsProvider.longestCompletedDelay(
        allEvents: allEvents,
        excludingSessionId: session.sessionId,
      ),
      averageCompletedDelay: statsProvider.averageCompletedDelay(
        allEvents: allEvents,
        onlyLocalDay: day,
        excludingSessionId: session.sessionId,
      ),
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
    );
  }
}
