import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';

/// Resolves active smoke events by applying compensating deletes (D12).
abstract final class ActiveSmokeResolver {
  /// Returns smoke events that have not been undone, oldest → newest.
  static List<SmokingLogEvent> resolve(List<SmokingLogEvent> allEvents) {
    final deletedParentIds = allEvents
        .where((e) => e.isSmokeDeleted && e.parentEventId != null)
        .map((e) => e.parentEventId!)
        .toSet();

    final active =
        allEvents
            .where((e) => e.isSmoke && !deletedParentIds.contains(e.id))
            .toList()
          ..sort((a, b) => a.createdAtUtc.compareTo(b.createdAtUtc));

    return active;
  }
}
