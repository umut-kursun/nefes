import 'dart:async';

import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/repository/settings_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Settings backed by shared_preferences only (OD-2).
class SettingsRepositoryImpl implements SettingsRepository {
  SettingsRepositoryImpl(this._prefs);

  static const _onboardingKey = 'has_completed_onboarding';
  static const _dailyTargetKey = 'daily_target';
  static const _averageKey = 'average_per_day';
  static const _packPriceKey = 'pack_price';
  static const _pricePerCigaretteKey = 'price_per_cigarette';
  static const _cigarettesPerPackKey = 'cigarettes_per_pack';
  static const defaultDailyTarget = 20;
  static const defaultCigarettesPerPack = 20;

  final SharedPreferences _prefs;
  final _controller = StreamController<AppSettings>.broadcast();

  @override
  Future<AppSettings> getSettings() async {
    final completed = _prefs.getBool(_onboardingKey) ?? false;
    final target = _prefs.getInt(_dailyTargetKey) ?? defaultDailyTarget;
    final average = _prefs.getInt(_averageKey);
    final packPrice = _prefs.getDouble(_packPriceKey);
    final pricePerCigarette = _prefs.getDouble(_pricePerCigaretteKey);
    final cigarettesPerPack =
        _prefs.getInt(_cigarettesPerPackKey) ?? defaultCigarettesPerPack;
    return AppSettings(
      hasCompletedOnboarding: completed,
      dailyTarget: target,
      averagePerDay: average,
      packPrice: packPrice,
      pricePerCigarette: pricePerCigarette,
      cigarettesPerPack: cigarettesPerPack,
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

  @override
  Future<void> setCigarettePricing({
    double? packPrice,
    double? cigarettePrice,
    int cigarettesPerPack = defaultCigarettesPerPack,
  }) async {
    final pack = cigarettesPerPack > 0
        ? cigarettesPerPack
        : defaultCigarettesPerPack;
    final normalized = MoneyCalculator.normalizePricePerCigarette(
      packPrice: packPrice,
      cigarettePrice: cigarettePrice,
      cigarettesPerPack: pack,
    );

    await _prefs.setInt(_cigarettesPerPackKey, pack);

    if (packPrice != null && packPrice > 0) {
      await _prefs.setDouble(_packPriceKey, packPrice);
    } else {
      await _prefs.remove(_packPriceKey);
    }

    if (normalized != null) {
      await _prefs.setDouble(_pricePerCigaretteKey, normalized);
    } else {
      await _prefs.remove(_pricePerCigaretteKey);
    }

    _controller.add(await getSettings());
  }
}
