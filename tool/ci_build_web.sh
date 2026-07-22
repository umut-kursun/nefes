#!/usr/bin/env bash
# CI build for Cloudflare Workers / GitHub Actions.
# Produces the full Flutter Web release output in build/web.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FLUTTER_DIR="${FLUTTER_DIR:-$HOME/flutter}"

if ! command -v flutter >/dev/null 2>&1; then
  if [[ ! -x "$FLUTTER_DIR/bin/flutter" ]]; then
    echo "Installing Flutter SDK into $FLUTTER_DIR ..."
    git clone https://github.com/flutter/flutter.git -b stable --depth 1 "$FLUTTER_DIR"
  fi
  export PATH="$FLUTTER_DIR/bin:$PATH"
fi

flutter --version
flutter config --no-analytics
flutter precache --web
flutter pub get
flutter build web --release

echo "Verifying build/web contents..."
test -f build/web/main.dart.js
test -f build/web/flutter.js
test -f build/web/flutter_bootstrap.js
test -f build/web/index.html
test -d build/web/assets
test -d build/web/canvaskit

echo "build/web is ready for Cloudflare Workers assets deploy."
