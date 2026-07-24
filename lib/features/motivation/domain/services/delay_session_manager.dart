import 'package:nefes/features/motivation/domain/entities/coach_snapshot.dart';
import 'package:nefes/features/motivation/domain/entities/delay_session.dart';
import 'package:nefes/features/motivation/domain/entities/effort_celebration.dart';
import 'package:nefes/features/motivation/domain/entities/progress_card.dart';
import 'package:nefes/features/motivation/domain/services/motivation_engine.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';

/// Owns the active Delay Coach session and card-rotation memory.
class DelaySessionManager {
  DelaySessionManager({required this.engine});

  final MotivationEngine engine;

  DelaySession? _session;
  String? _lastMilestoneId;
  final List<ProgressCardKind> _recentKinds = [];

  DelaySession? get activeSession => _session;

  DelaySession open({
    required ActiveDelaySession active,
    required List<SmokingLogEvent> allEvents,
  }) {
    if (_session?.sessionId == active.id) return _session!;
    _session = engine.openSession(active: active, allEvents: allEvents);
    _lastMilestoneId = null;
    _recentKinds.clear();
    return _session!;
  }

  void sync({
    required ActiveDelaySession? active,
    required List<SmokingLogEvent> allEvents,
  }) {
    if (active == null) {
      clear();
      return;
    }
    open(active: active, allEvents: allEvents);
  }

  CoachSnapshot? evaluate({
    required List<SmokingLogEvent> allEvents,
    required DateTime nowUtc,
    double? pricePerCigarette,
  }) {
    final session = _session;
    if (session == null) return null;

    final evaluation = engine.evaluate(
      session: session,
      allEvents: allEvents,
      nowUtc: nowUtc,
      pricePerCigarette: pricePerCigarette,
      recentlyShown: _recentKinds.toSet(),
    );

    final milestoneId = evaluation.milestone?.id;
    if (milestoneId != null && milestoneId != _lastMilestoneId) {
      _lastMilestoneId = milestoneId;
      for (final card in evaluation.cards) {
        _recentKinds.add(card.kind);
      }
      while (_recentKinds.length > 4) {
        _recentKinds.removeAt(0);
      }
    }

    return evaluation.toSnapshot();
  }

  EffortCelebration celebrateSmoke({
    required Duration resisted,
    required List<SmokingLogEvent> allEvents,
    required DateTime nowLocal,
  }) {
    return engine.celebrateEffort(
      resisted: resisted,
      allEvents: allEvents,
      nowLocal: nowLocal,
    );
  }

  void clear() {
    _session = null;
    _lastMilestoneId = null;
    _recentKinds.clear();
  }
}
