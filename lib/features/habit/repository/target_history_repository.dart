import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';

abstract class TargetHistoryRepository {
  Future<List<DailyTargetPeriod>> getAll({
    HabitType habitType = HabitType.smoking,
  });

  Stream<List<DailyTargetPeriod>> watchAll({
    HabitType habitType = HabitType.smoking,
  });

  Future<void> appendPeriod(DailyTargetPeriod period);

  Future<void> replaceAll(List<DailyTargetPeriod> periods);
}
