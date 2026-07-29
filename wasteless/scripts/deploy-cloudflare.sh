#!/usr/bin/env bash
# Build static export then deploy Worker + assets (Nefes-style).
set -euo pipefail
cd "$(dirname "$0")/.."

API_PATH="src/app/api"
API_BACKUP="src/app/_api_dev_only"
MOVED=0

restore_api() {
  if [ "$MOVED" -eq 1 ] && [ -d "$API_BACKUP" ]; then
    rm -rf "$API_PATH"
    mv "$API_BACKUP" "$API_PATH"
    echo "Restored src/app/api"
  fi
}
trap restore_api EXIT

VERSION="$(node -p "require('./package.json').version")"
BUILT_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
printf '{"version":"%s","builtAt":"%s"}\n' "$VERSION" "$BUILT_AT" > public/version.json
echo "Wrote public/version.json → $VERSION"

if [ -d "$API_PATH" ]; then
  rm -rf "$API_BACKUP"
  mv "$API_PATH" "$API_BACKUP"
  MOVED=1
  echo "Temporarily moved src/app/api for static export"
fi

export DEPLOY_TARGET=cloudflare
export NODE_ENV=production
npm run build

if [ ! -f out/version.json ]; then
  cp public/version.json out/version.json
fi

npx wrangler deploy --config wrangler.toml
