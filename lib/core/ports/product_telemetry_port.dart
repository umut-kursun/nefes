/// Lightweight product telemetry port — no network, no PII.
///
/// UI and use cases may emit named events; the default implementation is a
/// no-op so analytics SDKs can be wired later without scattering calls.
abstract class ProductTelemetryPort {
  void track(String name, [Map<String, Object?> properties = const {}]);
}

class NoopProductTelemetryPort implements ProductTelemetryPort {
  const NoopProductTelemetryPort();

  @override
  void track(String name, [Map<String, Object?> properties = const {}]) {}
}

/// Stable event names for future product analytics.
abstract final class TelemetryEvents {
  static const cigaretteLogged = 'cigarette_logged';
  static const triggerAdded = 'trigger_added';
  static const triggerCleared = 'trigger_cleared';
  static const delayStarted = 'delay_started';
  static const delayCompleted = 'delay_completed';
  static const delayCancelled = 'delay_cancelled';
  static const retroactiveLogCreated = 'retroactive_log_created';
  static const eventTimeCorrected = 'event_time_corrected';
  static const eventDeleted = 'event_deleted';
  static const undoLatest = 'undo_latest';
}
