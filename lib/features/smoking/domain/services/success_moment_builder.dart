import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/motivation/domain/entities/effort_celebration.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';

/// Subtle in-UI celebration — never a failure popup.
class SuccessMoment {
  const SuccessMoment({
    required this.id,
    required this.text,
  });

  final String id;
  final String text;
}

/// Builds premium “you are winning” moments from progress signals.
abstract final class SuccessMomentBuilder {
  static SuccessMoment? fromClosedDelay({
    required EffortCelebration celebration,
    required Duration? allTimeBest,
  }) {
    final resisted = celebration.resisted;
    final minutes = resisted.inMinutes.clamp(0, 24 * 60);

    if (allTimeBest == null
        ? minutes >= 5
        : resisted > allTimeBest) {
      return SuccessMoment(
        id: 'personal_best',
        text: AppStrings.momentPersonalBest,
      );
    }

    if (celebration.improvement != null &&
        celebration.improvement!.inMinutes >= 1) {
      return SuccessMoment(
        id: 'vs_yesterday',
        text: AppStrings.momentLongerThanYesterday(
          celebration.improvement!.inMinutes,
        ),
      );
    }

    if (minutes >= 30) {
      return SuccessMoment(
        id: 'minutes_30',
        text: AppStrings.momentMinutesEarned(minutes),
      );
    }

    if (minutes >= 1) {
      return SuccessMoment(
        id: 'minutes_earned',
        text: AppStrings.momentMinutesEarned(minutes),
      );
    }

    return const SuccessMoment(
      id: 'first_effort',
      text: AppStrings.momentFirstEffort,
    );
  }

  static SuccessMoment? firstDelayOfDay({required bool isFirstToday}) {
    if (!isFirstToday) return null;
    return const SuccessMoment(
      id: 'first_delay',
      text: AppStrings.momentFirstDelay,
    );
  }

  static SuccessMoment urgePassed({required int minutes}) {
    if (minutes >= 1) {
      return SuccessMoment(
        id: 'urge_passed',
        text: AppStrings.momentMinutesEarned(minutes),
      );
    }
    return const SuccessMoment(
      id: 'urge_passed_soft',
      text: AppStrings.momentUrgePassed,
    );
  }

  static SuccessMoment? moneyMilestone({
    required double? amountTry,
    required Set<int> alreadyShown,
  }) {
    if (amountTry == null || amountTry < 50) return null;
    final bucket = amountTry >= 100 ? 100 : 50;
    if (alreadyShown.contains(bucket)) return null;
    return SuccessMoment(
      id: 'money_$bucket',
      text: AppStrings.momentMoneySaved(MoneyCalculator.formatTry(bucket.toDouble())),
    );
  }

  /// First cigarette later than yesterday’s first — today is already better.
  static SuccessMoment? laterFirstCigarette({
    required HomeSnapshot snapshot,
    required List<SmokingLogEvent> allEvents,
    required DateTime nowLocal,
  }) {
    final todayFirst = _firstSmokeMinutes(snapshot.todayEvents);
    if (todayFirst == null || snapshot.todayCount != 1) return null;

    final yesterday = DateTime(nowLocal.year, nowLocal.month, nowLocal.day)
        .subtract(const Duration(days: 1));
    final yesterdayFirst = _firstSmokeMinutesFromEvents(
      allEvents: allEvents,
      localDay: yesterday,
    );
    if (yesterdayFirst == null) return null;
    if (todayFirst <= yesterdayFirst) return null;

    final gained = todayFirst - yesterdayFirst;
    return SuccessMoment(
      id: 'later_first',
      text: AppStrings.momentLaterThanYesterday(gained),
    );
  }

  static int? _firstSmokeMinutes(List<HomeEventItem> todayEvents) {
    if (todayEvents.isEmpty) return null;
    final first = todayEvents.last;
    final local = first.createdAtUtc.toLocal();
    return local.hour * 60 + local.minute;
  }

  static int? _firstSmokeMinutesFromEvents({
    required List<SmokingLogEvent> allEvents,
    required DateTime localDay,
  }) {
    final deleted = <String>{
      for (final e in allEvents)
        if (e.isSmokeDeleted && e.parentEventId != null) e.parentEventId!,
    };
    SmokingLogEvent? earliest;
    for (final e in allEvents) {
      if (!e.isSmoke) continue;
      if (deleted.contains(e.id)) continue;
      if (e.localYear != localDay.year ||
          e.localMonth != localDay.month ||
          e.localDay != localDay.day) {
        continue;
      }
      if (earliest == null || e.createdAtUtc.isBefore(earliest.createdAtUtc)) {
        earliest = e;
      }
    }
    if (earliest == null) return null;
    return earliest.localHour * 60 + earliest.localMinute;
  }
}
