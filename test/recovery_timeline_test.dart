import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/features/motivation/domain/services/recovery_timeline_evaluator.dart';

void main() {
  const evaluator = RecoveryTimelineEvaluator();

  group('RecoveryTimelineEvaluator', () {
    test('null / negative elapsed yields empty snapshot', () {
      expect(evaluator.evaluate(null).unlocked, isEmpty);
      expect(evaluator.evaluate(null).next, isNull);
      expect(evaluator.evaluate(const Duration(seconds: -1)).unlocked, isEmpty);
      expect(evaluator.evaluate(const Duration(seconds: -1)).next, isNull);
    });

    test('just smoked unlocks nothing; next is 20m', () {
      final snap = evaluator.evaluate(Duration.zero);
      expect(snap.unlocked, isEmpty);
      expect(snap.next?.id, 'r_20m');
    });

    test('19 minutes unlocks nothing; next is 20m', () {
      final snap = evaluator.evaluate(const Duration(minutes: 19));
      expect(snap.unlocked, isEmpty);
      expect(snap.next?.id, 'r_20m');
    });

    test('20 minutes unlocks r_20m; next is 2h', () {
      final snap = evaluator.evaluate(const Duration(minutes: 20));
      expect(snap.unlocked.map((m) => m.id), ['r_20m']);
      expect(snap.next?.id, 'r_2h');
    });

    test('12 hours unlocks through r_12h', () {
      final snap = evaluator.evaluate(const Duration(hours: 12));
      expect(
        snap.unlocked.map((m) => m.id).toList(),
        ['r_20m', 'r_2h', 'r_8h', 'r_12h'],
      );
      expect(snap.next?.id, 'r_24h');
    });

    test('25 hours unlocks through r_24h', () {
      final snap = evaluator.evaluate(const Duration(hours: 25));
      expect(
        snap.unlocked.map((m) => m.id).toList(),
        ['r_20m', 'r_2h', 'r_8h', 'r_12h', 'r_24h'],
      );
      expect(snap.next?.id, 'r_48h');
    });

    test('past final milestone has no next', () {
      final snap = evaluator.evaluate(const Duration(days: 10));
      expect(snap.unlocked.length, 8);
      expect(snap.next, isNull);
    });
  });
}
