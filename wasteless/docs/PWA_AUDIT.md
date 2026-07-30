# WasteLess PWA Audit & Modernization

**Date:** 2026-07-30  
**Stack:** Next.js 14 + `@ducanh2912/next-pwa` + Workbox + Cloudflare static export  
**Principle:** Incremental modernization only — no rebuild of working infrastructure.

---

## 1. Audit Summary

| Area | Status before | Decision |
|------|---------------|----------|
| **manifest.json** | Solid base (`id`, `categories`, `lang`, maskable 512) | Extended with shortcuts, `display_override`, `launch_handler`, `file_handlers` |
| **manifest.webmanifest** | Duplicate of manifest.json | Kept in sync (same content) |
| **Service worker** | Workbox precache + custom `SKIP_WAITING` listener | **Unchanged** — lifecycle is correct |
| **Caching** | `cleanupOutdatedCaches`, document fallback `/offline`, immutable `_next/static` | Added `navigationPreload: true` |
| **Install flow** | `InstallPrompt` (`beforeinstallprompt`) | **Unchanged** — works on Chromium |
| **Update flow** | Settings → Güncelle via `applyAppUpdate()` | Added passive `UpdatePrompt` banner |
| **Offline** | `/offline` page + Workbox document fallback | **Unchanged** |
| **Icons** | 192/512 any + 512 maskable + apple-touch-icon | Added 192 maskable entry (same asset — see recommendations) |
| **Splash screen** | OS-generated from manifest colors + icons | **Unchanged** — no custom splash needed |
| **Shortcuts** | Missing | Added: Fiş tara → `/add`, Hafıza → `/memory` |
| **Theme colors** | `#0F766E` in manifest + viewport meta | **Unchanged** |
| **Viewport** | `viewport-fit: cover`, safe areas in UI | **Unchanged** |
| **iOS** | apple-touch-icon, standalone meta, status bar `default` | **Unchanged** — see iOS notes |
| **Android** | Install prompt, maskable icon | Added `file_handlers` + launch queue |
| **share_target** | Missing | **Deferred** — requires POST handler (see §6) |
| **Storage persistence** | Not requested | Added best-effort `navigator.storage.persist()` |
| **Background sync** | N/A for offline-first Dexie app | **Not added** — no server queue |
| **Performance** | ReviewForm/ReceiptEngine already dynamic-imported on `/add` | **Unchanged** — already lazy |

---

## 2. Current Weaknesses (remaining)

1. **Android Share Sheet (`share_target`)** — Static export cannot receive multipart POST at `/add`. Needs a Cloudflare Worker route or dedicated share endpoint.
2. **Dedicated 192×192 maskable icon** — Currently reuses `icon-192.png` for maskable purpose; adaptive icon safe-zone may clip on some launchers.
3. **Manifest screenshots** — Not in repo; needed for richer Play Store / install UI on some platforms.
4. **iOS install UX** — No programmatic install; users must use Share → Add to Home Screen (no `beforeinstallprompt`).
5. **Icon assets not in git** — `/public/icons/*.png` referenced but may live only in deploy artifacts; verify in CI/release pipeline.
6. **Dual manifest files** — `manifest.json` and `manifest.webmanifest` must stay manually synced (acceptable for now).
7. **Periodic background sync** — Not applicable without remote sync API.

---

## 3. Improvements Implemented

### Manifest
- `display_override`: `["standalone", "minimal-ui"]`
- `prefer_related_applications`: `false`
- `launch_handler.client_mode`: `"navigate-existing"` (faster resume)
- **Shortcuts:** scan receipt, memory
- **file_handlers:** JPEG/PNG/WebP/HEIC → `/add`
- **192 maskable** icon entry (purpose split)

### Service worker / caching
- `navigationPreload: true` in Workbox options (faster navigations when SW active)
- Manifest cache headers: `no-cache` in `public/_headers`

### Update UX
- `UpdatePrompt` — top banner when waiting SW detected; uses existing `applyAppUpdate()`
- Dismissible for 6 hours (Settings path still works)

### Receipt-specific
- **`launchQueue` consumer** — OS “Open with WasteLess” on image files
- **`/add` auto-scan** — pending launch file processed on mount

### Reliability
- **`requestPersistentStorage()`** — best-effort Dexie durability
- Fixed corrupted UTF-8 comments in `app-version.ts`

### Developer experience
- This document + release checklist below

---

## 4. Files Modified

| File | Change |
|------|--------|
| `public/manifest.json` | Shortcuts, file_handlers, launch_handler, display_override |
| `public/manifest.webmanifest` | Synced with manifest.json |
| `public/_headers` | no-cache for manifest files |
| `next.config.mjs` | `navigationPreload: true` |
| `src/lib/pwa-launch-handler.ts` | **New** — launchQueue + storage persistence |
| `src/components/pwa-bootstrap.tsx` | **New** — early PWA init |
| `src/components/update-prompt.tsx` | **New** — update banner |
| `src/hooks/use-pwa-update.ts` | **New** — waiting SW detection |
| `src/components/providers.tsx` | Mount `PwaBootstrap` |
| `src/app/layout.tsx` | Mount `UpdatePrompt` |
| `src/app/add/page.tsx` | Consume launch files |
| `src/lib/app-version.ts` | Comment encoding fix |
| `docs/PWA_AUDIT.md` | **New** — this report |

**Unchanged (already best practice):**
- `sw-custom/index.js` — SKIP_WAITING handler
- `src/components/install-prompt.tsx`
- `src/app/offline/page.tsx`
- Workbox `skipWaiting: false` + user-controlled activation

---

## 5. Browser Compatibility

| Feature | Chrome Android | Edge | Safari iOS | Firefox |
|---------|----------------|------|------------|---------|
| Install prompt | ✅ | ✅ | ❌ (manual) | Limited |
| Update banner + Settings güncelle | ✅ | ✅ | ✅* | ✅* |
| Offline fallback | ✅ | ✅ | ✅ | ✅ |
| file_handlers + launchQueue | ✅ 102+ | ✅ | ❌ | ❌ |
| Shortcuts (long-press icon) | ✅ | ✅ | ❌ | ❌ |
| launch_handler navigate-existing | ✅ 110+ | ✅ | ❌ | ❌ |
| navigationPreload | ✅ | ✅ | N/A | ✅ |
| Maskable icons | ✅ | ✅ | N/A | N/A |

\*Safari/Firefox: SW update detection works; install UX differs.

---

## 6. Remaining Recommendations

### High value (when ready)
1. **share_target for receipt images** — Add Worker route `POST /share-target` that stores image briefly (KV/R2) and redirects to `/add?share=<token>`, or returns HTML that posts to client via `postMessage`.
2. **Dedicated `icon-192-maskable.png`** — Design with 80% safe zone for Android adaptive icons.
3. **Manifest screenshots** — 1080×1920 phone screenshots for install surfaces (`form_factor: "narrow"`).

### Medium value
4. **iOS install hint** — Dismissible card on Safari: “Paylaş → Ana Ekrana Ekle” (only when standalone mode false).
5. **Single manifest source** — Build step copies one JSON to both paths.
6. **Verify icons in CI** — Fail build if `/public/icons/` missing required sizes.

### Low value / not recommended now
7. **protocol_handlers** — No custom URL scheme needed yet.
8. **Periodic background sync** — No remote data to sync.
9. **Custom splash screens** — OS-generated is sufficient.

---

## 7. Release Checklist

Before each production deploy:

- [ ] Bump `APP_VERSION` in `src/lib/app-version.ts` and `package.json`
- [ ] Update `public/version.json` (if used in deploy script)
- [ ] Run production build (`DEPLOY_TARGET=cloudflare npm run build`) — regenerates `sw.js` precache
- [ ] Confirm `/public/icons/` assets exist (192, 512, maskable, apple-touch)
- [ ] Verify `manifest.json` ↔ `manifest.webmanifest` identical
- [ ] Test offline: airplane mode → navigate → `/offline` appears
- [ ] Test update: deploy vN+1, open installed PWA → “Güncelleme hazır” or Settings → Güncelle
- [ ] Test file open (Android Chrome): Gallery → Share/Open with → WasteLess → `/add` scans
- [ ] Lighthouse PWA audit ≥ 90 (installable, SW, manifest)

---

## 8. Cache Version Policy

- **Workbox precache:** Hash-based per build — automatic on each `next build`
- **Runtime caches:** `cleanupOutdatedCaches: true` removes stale Workbox caches
- **Manual reset:** Settings → Güncelle calls `applyAppUpdate()` which activates waiting SW or clears registrations + Cache Storage
- **HTTP:** `sw.js`, `version.json`, workbox chunks: `no-cache`; static assets: `immutable`

---

## 9. Architecture (unchanged core)

```
next.config.mjs (@ducanh2912/next-pwa)
  ├── public/sw.js          (Workbox precache, generated at build)
  ├── sw-custom/index.js    (SKIP_WAITING message → skipWaiting())
  └── fallbacks.document    → /offline

Client
  ├── InstallPrompt         beforeinstallprompt
  ├── UpdatePrompt          waiting SW detection
  ├── PwaBootstrap          launchQueue + storage.persist()
  └── applyAppUpdate()      Settings + UpdatePrompt
```

No parser, OCR, or receipt-engine changes were made in this sprint.
