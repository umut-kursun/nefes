{{flutter_js}}
{{flutter_build_config}}

// Intentionally omit Flutter serviceWorkerSettings.
// Flutter 3.44+ ships a cleanup SW that unregisters itself; NEFES uses web/sw.js instead.
_flutter.loader.load();
