/// Smoking / delay event types. Compensating and related events preserve audit history (D12).
enum SmokingEventType {
  smoke,
  smokeDeleted,

  /// Related event: trigger annotation for a smoke (parent = smoke id).
  smokeTriggerNoted,

  /// Related event: clears trigger context for a smoke (parent = smoke id).
  smokeTriggerCleared,

  /// Start of a resist/delay session.
  delayStarted,

  /// End of a resist/delay session (parent = delayStarted id).
  delayEnded;

  static SmokingEventType fromStorage(String value) {
    return SmokingEventType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => SmokingEventType.smoke,
    );
  }
}

enum EventSource {
  manual,
  wear,
  import,
  system;

  static EventSource fromStorage(String value) {
    return EventSource.values.firstWhere(
      (e) => e.name == value,
      orElse: () => EventSource.manual,
    );
  }
}

enum SyncStatus {
  local,
  pending,
  synced,
  conflict;

  static SyncStatus fromStorage(String value) {
    return SyncStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => SyncStatus.local,
    );
  }
}
