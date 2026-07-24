import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/motivation/domain/entities/effort_celebration.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/services/success_moment_builder.dart';
import 'package:nefes/features/smoking/domain/services/today_gains_builder.dart';

void main() {
  group('TodayGainsBuilder', () {
    test('builds money / delay / sessions / first-delay hierarchy', () {
      final noon = DateTime.utc(2026, 7, 24, 9);
      final tiles = TodayGainsBuilder.build(
        snapshot: HomeSnapshot(
          todayCount: 1,
          dailyTarget: 10,
          remaining: 9,
          isTargetExceeded: false,
          todayEvents: [
            HomeEventItem(
              id: 's1',
              createdAtUtc: noon,
              sequenceNumber: 1,
            ),
          ],
          lastSmokeAtUtc: noon,
          latestActiveSmokeId: 's1',
          hasCompletedOnboarding: true,
          activeDelay: null,
          todayDelayCount: 4,
          todayDelayTotal: const Duration(minutes: 13),
        ),
        pricePerCigarette: 7,
        urgePassedCount: 3,
        activeDelayElapsed: null,
        nowLocal: DateTime(2026, 7, 24, 12),
      );

      expect(tiles.length, 4);
      expect(tiles[0].id, 'money');
      expect(tiles[0].numericValue, 21);
      expect(tiles[0].format, GainValueFormat.money);
      expect(tiles[1].id, 'delay_time');
      expect(tiles[1].value, '13 dk');
      expect(tiles[2].id, 'sessions');
      expect(tiles[2].value, '4');
      expect(tiles[3].id, 'first_delay');
      expect(tiles[3].showPlus, isTrue);
      expect(tiles[3].value.startsWith('+'), isTrue);
    });
  });

  group('SuccessMomentBuilder', () {
    test('celebrates personal best without shame language', () {
      const celebration = EffortCelebration(
        resisted: Duration(minutes: 18),
        message: '18 dakika kazandın.',
        yesterdayBest: Duration(minutes: 7),
        improvement: Duration(minutes: 11),
      );

      final moment = SuccessMomentBuilder.fromClosedDelay(
        celebration: celebration,
        allTimeBest: const Duration(minutes: 12),
      );

      expect(moment?.id, 'personal_best');
      expect(moment?.text.toLowerCase(), isNot(contains('aştı')));
      expect(moment?.text.toLowerCase(), isNot(contains('başarısız')));
    });

    test('celebrates longer than yesterday when not a record', () {
      const celebration = EffortCelebration(
        resisted: Duration(minutes: 10),
        message: '10 dakika kazandın.',
        yesterdayBest: Duration(minutes: 7),
        improvement: Duration(minutes: 3),
      );

      final moment = SuccessMomentBuilder.fromClosedDelay(
        celebration: celebration,
        allTimeBest: const Duration(minutes: 40),
      );

      expect(moment?.id, 'vs_yesterday');
      expect(moment?.text, contains('3'));
    });
  });
}
