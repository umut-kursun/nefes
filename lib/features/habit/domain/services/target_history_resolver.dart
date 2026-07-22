import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';

/// Resolves the daily target that applied on a given local calendar day.
abstract final class TargetHistoryResolver {
  static int targetForLocalDay({
    required List<DailyTargetPeriod> periods,
    required DateTime localDay,
    required int fallbackTarget,
    HabitType habitType = HabitType.smoking,
  }) {
    final day = DateTime(localDay.year, localDay.month, localDay.day);
    final applicable = periods
        .where((p) => p.habitType == habitType.storageId)
        .where((p) => !p.effectiveFromLocalDate.isAfter(day))
        .toList()
      ..sort((a, b) {
        final byDate = a.effectiveFromLocalDate.compareTo(
          b.effectiveFromLocalDate,
        );
        if (byDate != 0) return byDate;
        return a.createdAtUtc.compareTo(b.createdAtUtc);
      });

    if (applicable.isEmpty) return fallbackTarget;
    return applicable.last.target;
  }
}
