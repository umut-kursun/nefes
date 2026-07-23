import 'dart:async';
// ignore: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;

const _justReloadedKey = 'nefes_sw_just_reloaded';

/// Emits when a *replacement* service worker is installed and the page still
/// runs the previous shell (needs reload). Does not fire on first install or
/// right after the user already reloaded for an update.
Stream<void> watchPwaUpdateAvailable() {
  final controller = StreamController<void>.broadcast();
  var notified = false;

  // After "Şimdi güncelle" reload, suppress prompts briefly so controllerchange
  // / update races don't immediately ask again.
  final justReloaded =
      html.window.sessionStorage[_justReloadedKey] == '1';
  if (justReloaded) {
    html.window.sessionStorage.remove(_justReloadedKey);
  }
  final suppressUntil = justReloaded
      ? DateTime.now().add(const Duration(seconds: 60))
      : null;

  void notify() {
    if (controller.isClosed || notified) return;
    if (suppressUntil != null && DateTime.now().isBefore(suppressUntil)) {
      return;
    }
    // First install: no controller yet — nothing to "update".
    if (html.window.navigator.serviceWorker?.controller == null) return;
    notified = true;
    controller.add(null);
  }

  void watchInstalling(html.ServiceWorker? worker) {
    if (worker == null) return;
    void onStateChange(html.Event _) {
      // A new worker finished installing while this page still has an active
      // controller → shell assets in memory are stale until reload.
      if (worker.state == 'installed' &&
          html.window.navigator.serviceWorker?.controller != null) {
        notify();
      }
    }

    worker.addEventListener('statechange', onStateChange);
    onStateChange(html.Event('statechange'));
  }

  void watchRegistration(html.ServiceWorkerRegistration reg) {
    // Only treat as update when a worker is waiting/installing *and* we already
    // control the page. Do not use controllerchange (fires after claim/reload).
    if (reg.waiting != null &&
        html.window.navigator.serviceWorker?.controller != null) {
      notify();
    }
    watchInstalling(reg.installing);

    reg.addEventListener('updatefound', (_) {
      watchInstalling(reg.installing);
    });
  }

  Future<html.ServiceWorkerRegistration?> registration() async {
    try {
      return await html.window.navigator.serviceWorker?.ready;
    } catch (_) {
      return null;
    }
  }

  registration().then((reg) {
    if (reg == null) return;
    watchRegistration(reg);
    // Quiet check; banner only via updatefound → installed.
    try {
      reg.update();
    } catch (_) {}
  });

  // Foreground resume: check for a new SW quietly (no immediate banner).
  html.document.addEventListener('visibilitychange', (_) {
    if (html.document.hidden == true) return;
    registration().then((reg) {
      if (reg == null) return;
      try {
        reg.update();
      } catch (_) {}
    });
  });

  return controller.stream;
}

/// Reload so the new shell assets load. Marks session so the banner stays quiet.
void applyPwaUpdate() {
  html.window.sessionStorage[_justReloadedKey] = '1';
  html.window.location.reload();
}
