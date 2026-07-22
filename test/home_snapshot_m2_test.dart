import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/core/time/time_display.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:nefes/features/smoking/domain/services/event_factory.dart';
import 'package:nefes/features/smoking/domain/services/home_snapshot_builder.dart';

void main() {
  final factory = EventFactory();

  group('TimeDisplay', () {
    test('formats elapsed clock', () {
      expect(
        TimeDisplay.formatElapsedClock(const Duration(hours: 1, minutes: 23, seconds: 42)),
        '01:23:42',
      );
    });

    test('formats interval short in Turkish units', () {
      expect(
        TimeDisplay.formatIntervalShort(const Duration(hours: 1, minutes: 18)),
        '1 sa 18 dk',
      );
    });
  });

  group('ActiveSmokeResolver + HomeSnapshotBuilder', () {
    test('today count and remaining ignore undone events', () {
      final now = DateTime(2026, 7, 22, 15, 0);
      final first = factory.createSmoke(at: now.subtract(const Duration(hours: 2)));
      final second = factory.createSmoke(at: now.subtract(const Duration(hours: 1)));
      final undo = factory.createSmokeDeleted(
        parentSmokeId: second.id,
        at: now.subtract(const Duration(minutes: 30)),
      );

      final snapshot = HomeSnapshotBuilder.build(
        allEvents: [first, second, undo],
        settings: const AppSettings(
          hasCompletedOnboarding: true,
          dailyTarget: 10,
        ),
        nowLocal: now,
      );

      expect(snapshot.todayCount, 1);
      expect(snapshot.remaining, 9);
      expect(snapshot.isTargetExceeded, isFalse);
      expect(snapshot.latestActiveSmokeId, first.id);
      expect(snapshot.todayEvents.single.sequenceNumber, 1);
    });

    test('target exceeded does not block conceptually (count can exceed)', () {
      final now = DateTime(2026, 7, 22, 18, 0);
      final events = List.generate(
        3,
        (i) => factory.createSmoke(
          at: now.subtract(Duration(minutes: 30 * (3 - i))),
        ),
      );

      final snapshot = HomeSnapshotBuilder.build(
        allEvents: events,
        settings: const AppSettings(
          hasCompletedOnboarding: true,
          dailyTarget: 2,
        ),
        nowLocal: now,
      );

      expect(snapshot.todayCount, 3);
      expect(snapshot.isTargetExceeded, isTrue);
      expect(snapshot.remaining, -1);
    });

    test('history is newest first with intervals', () {
      final now = DateTime(2026, 7, 22, 16, 0);
      final a = factory.createSmoke(at: now.subtract(const Duration(hours: 2)));
      final b = factory.createSmoke(at: now.subtract(const Duration(hours: 1)));

      final snapshot = HomeSnapshotBuilder.build(
        allEvents: [a, b],
        settings: const AppSettings(
          hasCompletedOnboarding: true,
          dailyTarget: 20,
        ),
        nowLocal: now,
      );

      expect(snapshot.todayEvents.first.sequenceNumber, 2);
      expect(snapshot.todayEvents.first.id, b.id);
      expect(
        snapshot.todayEvents.first.intervalSincePrevious,
        const Duration(hours: 1),
      );
      expect(snapshot.todayEvents.last.sequenceNumber, 1);
    });

    test('day boundary uses local calendar day', () {
      final today = DateTime(2026, 7, 22, 10, 0);
      final yesterday = factory.createSmoke(
        at: DateTime(2026, 7, 21, 23, 30),
      );
      final morning = factory.createSmoke(at: today);

      final snapshot = HomeSnapshotBuilder.build(
        allEvents: [yesterday, morning],
        settings: const AppSettings(
          hasCompletedOnboarding: true,
          dailyTarget: 20,
        ),
        nowLocal: today,
      );

      expect(snapshot.todayCount, 1);
      expect(snapshot.lastSmokeAtUtc, morning.createdAtUtc);
      expect(
        snapshot.todayEvents.single.intervalSincePrevious,
        morning.createdAtUtc.difference(yesterday.createdAtUtc),
      );
    });

    test('resolver returns only active smokes', () {
      final a = factory.createSmoke();
      final b = factory.createSmoke();
      final del = factory.createSmokeDeleted(parentSmokeId: a.id);
      final active = ActiveSmokeResolver.resolve([a, b, del]);
      expect(active.map((e) => e.id), [b.id]);
    });
  });
}
