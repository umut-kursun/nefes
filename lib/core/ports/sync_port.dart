/// Future-facing sync port. Local data remains source of truth in V1.
abstract class SyncPort {
  Future<void> pushPending();

  Future<void> pullRemote();
}

class NoopSyncPort implements SyncPort {
  const NoopSyncPort();

  @override
  Future<void> pushPending() async {}

  @override
  Future<void> pullRemote() async {}
}
