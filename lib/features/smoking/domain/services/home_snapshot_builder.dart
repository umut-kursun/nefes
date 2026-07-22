import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/domain/services/active_smoke_resolver.dart';
import 'package:nefes/features/smoking/domain/services/delay_session_resolver.dart';

/// Pure builder for HomeSnapshot from events + settings + "now".
abstract final class HomeSnapshotBuilder {
  static HomeSnapshot build({
    required List<SmokingLogEvent> allEvents,
    required AppSettings settings,
    required DateTime nowLocal,
  }) {
    final active = ActiveSmokeResolver.resolve(allEvents);
    final triggers = SmokeTriggerResolver.resolveMap(allEvents);
    final todayEventsAsc = active
        .where(
          (e) =>
              e.localYear == nowLocal.year &&
              e.localMonth == nowLocal.month &&
              e.localDay == nowLocal.day,
        )
        .toList();

    final items = <HomeEventItem>[];
    for (var i = 0; i < todayEventsAsc.length; i++) {
      final event = todayEventsAsc[i];
      Duration? interval;
      final indexInActive = active.indexWhere((e) => e.id == event.id);
      if (indexInActive > 0) {
        final previous = active[indexInActive - 1];
        interval = event.createdAtUtc.difference(previous.createdAtUtc);
      }
      items.add(
        HomeEventItem(
          id: event.id,
          createdAtUtc: event.createdAtUtc,
          sequenceNumber: i + 1,
          intervalSincePrevious: interval,
          trigger: triggers[event.id],
        ),
      );
    }

    final itemsNewestFirst = items.reversed.toList();
    final todayCount = todayEventsAsc.length;
    final target = settings.dailyTarget;
    final remaining = target - todayCount;
    final last = active.isEmpty ? null : active.last;
    final delayStats = DelaySessionResolver.todayDelayStats(
      allEvents: allEvents,
      nowLocal: nowLocal,
    );

    return HomeSnapshot(
      todayCount: todayCount,
      dailyTarget: target,
      remaining: remaining,
      isTargetExceeded: todayCount > target,
      todayEvents: itemsNewestFirst,
      lastSmokeAtUtc: last?.createdAtUtc,
      latestActiveSmokeId: last?.id,
      hasCompletedOnboarding: settings.hasCompletedOnboarding,
      activeDelay: DelaySessionResolver.resolveActive(allEvents),
      todayDelayCount: delayStats.count,
      todayDelayTotal: delayStats.total,
    );
  }
}
