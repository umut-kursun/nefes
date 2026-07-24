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

  /// Turkish Lira display helper for simple UI.
  static String formatTry(double amount) {
    if (amount == amount.roundToDouble()) {
      return '₺${amount.round()}';
    }
    return '₺${amount.toStringAsFixed(2)}';
  }
}
