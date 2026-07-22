/// Platform-specific backup file I/O.
///
/// Implemented with `dart:html` for the web target and a safe stub for
/// non-web targets (e.g. `flutter test` running on the VM), so importing
/// this file never breaks test compilation.
library;

export 'backup_file_io_stub.dart'
    if (dart.library.html) 'backup_file_io_web.dart';
