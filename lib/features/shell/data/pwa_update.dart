/// Platform-specific PWA update detection.
library;

export 'pwa_update_stub.dart'
    if (dart.library.html) 'pwa_update_web.dart';
