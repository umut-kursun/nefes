/// Money helpers for motivational savings estimates.
abstract final class MoneyCalculator {
  /// Normalizes pack or per-cigarette input into [pricePerCigarette].
  static double? normalizePricePerCigarette({
    double? packPrice,
    double? cigarettePrice,
    int cigarettesPerPack = 20,
  }) {
    if (cigarettePrice != null && cigarettePrice > 0) {
      return cigarettePrice;
    }
    if (packPrice != null && packPrice > 0 && cigarettesPerPack > 0) {
      return packPrice / cigarettesPerPack;
    }
    return null;
  }

  /// Estimated money not spent for [cigarettesDelayed].
  static double? moneyNotSpent({
    required int cigarettesDelayed,
    required double? pricePerCigarette,
  }) {
    if (pricePerCigarette == null || pricePerCigarette <= 0) return null;
    if (cigarettesDelayed <= 0) return null;
    return cigarettesDelayed * pricePerCigarette;
  }

  /// Money kept today by smoking fewer than the [expectedPerDay] baseline.
  ///
  /// Returns null only when no price is known (so callers can fall back to a
  /// non-money tile); otherwise it returns a value ≥ 0, floored at zero when
  /// today's count already meets or exceeds the expected daily amount.
  static double? moneySavedVsExpected({
    required int expectedPerDay,
    required int smokedToday,
    required double? pricePerCigarette,
  }) {
    if (pricePerCigarette == null || pricePerCigarette <= 0) return null;
    final saved = expectedPerDay - smokedToday;
    if (saved <= 0) return 0;
    return saved * pricePerCigarette;
  }

  /// Turkish Lira display helper for simple UI.
  static String formatTry(double amount) {
    if (amount == amount.roundToDouble()) {
      return '₺${amount.round()}';
    }
    return '₺${amount.toStringAsFixed(2)}';
  }
}
