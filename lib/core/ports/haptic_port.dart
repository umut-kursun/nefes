/// Platform haptic feedback port (web may be a no-op).
abstract class HapticPort {
  Future<void> lightImpact();
}

/// Web / default no-op haptic implementation for M1.
class NoopHapticPort implements HapticPort {
  const NoopHapticPort();

  @override
  Future<void> lightImpact() async {}
}
