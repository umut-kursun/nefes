/// Future-facing export port (CSV / JSON / PDF) — stub for M1.
enum ExportFormat { csv, json, pdf }

abstract class ExportPort {
  Future<void> export(ExportFormat format);
}

class NoopExportPort implements ExportPort {
  const NoopExportPort();

  @override
  Future<void> export(ExportFormat format) async {
    throw UnimplementedError('Export is not available in Milestone M1');
  }
}
