import 'dart:async';

import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/repository/settings_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Settings backed by shared_preferences only (OD-2).
class SettingsRepositoryImpl implements SettingsRepository {
  SettingsRepositoryImpl(this._prefs);

  static const _onboardingKey = 'has_completed_onboarding';
  static const _dailyTargetKey = 'daily_target';
  static const _averageKey = 'average_per_day';
  static const defaultDailyTarget = 20;

  final SharedPreferences _prefs;
  final _controller = StreamController<AppSettings>.broadcast();

  @override
  Future<AppSettings> getSettings() async {
    final completed = _prefs.getBool(_onboardingKey) ?? false;
    final target = _prefs.getInt(_dailyTargetKey) ?? defaultDailyTarget;
    final average = _prefs.getInt(_averageKey);
    return AppSettings(
      hasCompletedOnboarding: completed,
      dailyTarget: target,
      averagePerDay: average,
    );
  }

  @override
  Stream<AppSettings> watchSettings() async* {
    yield await getSettings();
    yield* _controller.stream;
  }

  @override
  Future<void> completeOnboarding({
    required int averagePerDay,
    required int dailyTarget,
  }) async {
    await _prefs.setInt(_averageKey, averagePerDay);
    await _prefs.setInt(_dailyTargetKey, dailyTarget);
    await _prefs.setBool(_onboardingKey, true);
    _controller.add(await getSettings());
  }

  @override
  Future<void> setDailyTarget(int value) async {
    await _prefs.setInt(_dailyTargetKey, value);
    if (!(_prefs.getBool(_onboardingKey) ?? false)) {
      await _prefs.setBool(_onboardingKey, true);
    }
    _controller.add(await getSettings());
  }
}
