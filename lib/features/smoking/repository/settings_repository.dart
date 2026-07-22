import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';

/// Settings contract. Simple prefs only — not smoking events (OD-2).
abstract class SettingsRepository {
  Future<AppSettings> getSettings();

  Stream<AppSettings> watchSettings();

  Future<void> completeOnboarding({
    required int averagePerDay,
    required int dailyTarget,
  });

  Future<void> setDailyTarget(int value);
}
