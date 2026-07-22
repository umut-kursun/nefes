import 'dart:async';
// ignore: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;

/// Emits once when a new service worker takes control (or is waiting).
Stream<void> watchPwaUpdateAvailable() {
  final controller = StreamController<void>.broadcast();

  void notify() {
    if (!controller.isClosed) controller.add(null);
  }

  html.window.navigator.serviceWorker?.addEventListener('controllerchange', (_) {
    notify();
  });

  // If a worker is already waiting (registered before Flutter boot).
  html.window.navigator.serviceWorker?.ready.then((reg) {
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
  });

  return controller.stream;
}

/// Reload so the new shell assets load.
void applyPwaUpdate() {
  html.window.location.reload();
}
