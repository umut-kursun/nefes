import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/motivation/domain/services/money_calculator.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';

/// How the gain tile value should animate and format.
enum GainValueFormat {
  plain,
  money,
  minutes,
  count,
}

/// One compact tile in the “Bugün kazandıkların” dashboard.
class TodayGainTile {
  const TodayGainTile({
    required this.id,
    required this.label,
    required this.value,
    this.numericValue,
    this.format = GainValueFormat.plain,
    this.showPlus = false,
  });

  final String id;
  final String label;
  final String value;

  /// Target for count-up animation; null = fade-only.
  final double? numericValue;
  final GainValueFormat format;
  final bool showPlus;
}

/// Builds the emotional center of Today — progress first, never empty tiles.
abstract final class TodayGainsBuilder {
  static List<TodayGainTile> build({
    required HomeSnapshot snapshot,
    required double? pricePerCigarette,
    required int urgePassedCount,
    required Duration? activeDelayElapsed,
    DateTime? nowLocal,
  }) {
    final now = nowLocal ?? DateTime.now();
    final delayedMinutes = snapshot.todayDelayTotal.inMinutes;
    final sessions = snapshot.todayDelayCount;

    final money = MoneyCalculator.moneyNotSpent(
      cigarettesDelayed: urgePassedCount,
      pricePerCigarette: pricePerCigarette,
    );

    final moneyTile = money != null
        ? TodayGainTile(
            id: 'money',
            label: AppStrings.gainSavedToday,
            value: MoneyCalculator.formatTry(money),
            numericValue: money,
            format: GainValueFormat.money,
          )
        : TodayGainTile(
            id: 'remaining',
            label: AppStrings.gainRemaining,
            value: '${snapshot.remaining}',
            numericValue: snapshot.remaining.toDouble(),
            format: GainValueFormat.count,
          );

    final delayTimeTile = TodayGainTile(
      id: 'delay_time',
      label: AppStrings.gainDelayedTime,
      value: AppStrings.gainMinutes(delayedMinutes),
      numericValue: delayedMinutes.toDouble(),
      format: GainValueFormat.minutes,
    );

    final sessionsTile = TodayGainTile(
      id: 'sessions',
      label: AppStrings.gainDelays,
      value: '$sessions',
      numericValue: sessions.toDouble(),
      format: GainValueFormat.count,
    );

    final fourth = _fourthTile(
      snapshot: snapshot,
      activeDelayElapsed: activeDelayElapsed,
      nowLocal: now,
    );

    return [moneyTile, delayTimeTile, sessionsTile, fourth];
  }

  static TodayGainTile _fourthTile({
    required HomeSnapshot snapshot,
    required Duration? activeDelayElapsed,
    required DateTime nowLocal,
  }) {
    final firstDelay = _firstCigaretteDelayMinutes(snapshot);
    if (firstDelay != null) {
      return TodayGainTile(
        id: 'first_delay',
        label: AppStrings.gainFirstCigaretteDelay,
        value: AppStrings.gainMinutesPlus(firstDelay),
        numericValue: firstDelay.toDouble(),
        format: GainValueFormat.minutes,
        showPlus: true,
      );
    }

    if (activeDelayElapsed != null && activeDelayElapsed.inMinutes >= 0) {
      final mins = activeDelayElapsed.inMinutes;
      return TodayGainTile(
        id: 'active_delay',
        label: AppStrings.gainActiveDelay,
        value: mins < 1 ? AppStrings.gainJustStarted : AppStrings.gainMinutes(mins),
        numericValue: mins < 1 ? null : mins.toDouble(),
        format: mins < 1 ? GainValueFormat.plain : GainValueFormat.minutes,
      );
    }

    if (snapshot.todayCount == 0) {
      return const TodayGainTile(
        id: 'clean_start',
        label: AppStrings.gainCleanStart,
        value: AppStrings.gainCleanStartValue,
      );
    }

    return TodayGainTile(
      id: 'remaining',
      label: AppStrings.gainRemaining,
      value: '${snapshot.remaining}',
      numericValue: snapshot.remaining.toDouble(),
      format: GainValueFormat.count,
    );
  }

  /// Minutes from local midnight until the first cigarette today.
  static int? _firstCigaretteDelayMinutes(HomeSnapshot snapshot) {
    if (snapshot.todayEvents.isEmpty) return null;
    // todayEvents are newest-first; earliest smoke is last.
    final first = snapshot.todayEvents.last;
    final local = first.createdAtUtc.toLocal();
    return local.hour * 60 + local.minute;
  }
}
