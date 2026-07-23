import 'dart:async';
// ignore: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;

/// Emits once when a new service worker takes control (or is waiting).
Stream<void> watchPwaUpdateAvailable() {
  final controller = StreamController<void>.broadcast();
  var notified = false;

  void notify() {
    if (notified || controller.isClosed) return;
    notified = true;
    controller.add(null);
  }

  html.window.navigator.serviceWorker?.addEventListener('controllerchange', (_) {
    notify();
  });

  Future<html.ServiceWorkerRegistration?> ready() async {
    try {
      return await html.window.navigator.serviceWorker?.ready;
    } catch (_) {
      return null;
    }
  }

  void watchRegistration(html.ServiceWorkerRegistration reg) {
    if (reg.waiting != null) notify();
    reg.addEventListener('updatefound', (_) {
      final installing = reg.installing;
      installing?.addEventListener('statechange', (_) {
        if (installing.state == 'installed' &&
            html.window.navigator.serviceWorker?.controller != null) {
          notify();
        }
      });
    });
    // Proactively ask the browser to fetch a fresh sw.js.
    try {
      reg.update();
    } catch (_) {}
  }

  ready().then((reg) {
    if (reg != null) watchRegistration(reg);
  });

  // Re-check when the installed PWA returns to foreground.
  html.document.addEventListener('visibilitychange', (_) {
    if (html.document.hidden == true) return;
    ready().then((reg) {
      if (reg == null) return;
      try {
        reg.update();
      } catch (_) {}
      if (reg.waiting != null) notify();
    });
  });

  return controller.stream;
}

/// Reload so the new shell assets load.
void applyPwaUpdate() {
  html.window.location.reload();
}
