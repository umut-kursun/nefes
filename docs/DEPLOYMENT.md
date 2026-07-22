# NEFES — Deployment & PWA (infrastructure)

This document covers **public HTTPS deployment** and **Android Chrome PWA install**.
It does **not** change app business logic, domain models, or local data architecture.

## Current status (pre-publish)

| Item | Status |
|------|--------|
| `web/manifest.json` | Ready (`name`/`short_name` NEFES, `lang: tr`, `display: standalone`, `start_url: /`) |
| `web/index.html` | Manifest linked; theme `#1C2B24`; canvas `#F7F5F2` |
| Icons | **Placeholder Flutter logos** (192/512 + maskable) — replace before public brand launch |
| Custom `web/sw.js` | Shell asset cache after first successful load (Flutter 3.44+ has no default SW) |
| Cloudflare helpers | `web/_redirects`, `web/_headers` (copied into `build/web`) |
| Git remote | **None yet** — repository has no commits / no remote |
| Public deploy | **Not published** — waiting for your explicit approval |

## Production build (local)

```powershell
cd c:\Users\ukursun\Documents\nefes
flutter pub get
flutter analyze
flutter test
flutter build web --release
```

Output directory:

```text
build/web/
```

Serve that folder over **HTTPS** for installability (Chrome requires a secure context except `localhost`).

## Data safety (local-first)

NEFES stores smoking events and settings **in the browser** (IndexedDB / Sembast + `shared_preferences`).

- Data on `http://localhost` is **not** the same as data on the production HTTPS origin.
- Existing localhost smoking history will **not** appear automatically on the deployed URL.
- Reinstalling the PWA does **not** provide cloud backup.
- Clearing site data / Chrome storage for that origin can **delete** local NEFES data.
- Cloud sync / accounts / backup are **out of scope** for the current version.

## Recommended host: Cloudflare Pages

**Why**

- Free tier suitable for a static Flutter Web app
- HTTPS by default
- Easy Git-connected redeploys later
- No Android SDK
- Compatible with `build/web` static output

**Alternatives:** GitHub Pages also works (HTTPS + static), but Cloudflare Pages is preferred here for simpler SPA headers/redirects and CDN defaults.

## What you must do manually (no accounts created by the agent)

### A) Create a Git repository and push (first time)

1. Create a new **private or public** GitHub repository (e.g. `nefes`).
2. On your machine (after M3 is finished and you are ready to commit):

```powershell
cd c:\Users\ukursun\Documents\nefes
git add .
git status
git commit -m "Prepare NEFES Flutter Web PWA for deployment."
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git
git push -u origin main
```

Do **not** commit secrets. Do not force-push.

### B) Connect Cloudflare Pages (after you approve public deploy)

1. Sign in at [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages**.
2. **Connect to Git** → select the NEFES repository.
3. Build settings:

| Setting | Value |
|---------|--------|
| Framework preset | None |
| Build command | See note below |
| Build output directory | `build/web` |
| Root directory | `/` (repo root) |

**Build command options**

- **Preferred for CI:** install Flutter in the build environment, then:

```bash
flutter pub get && flutter build web --release
```

  (Add a Flutter install step in Cloudflare build, or use a community Flutter build image / GitHub Action that uploads `build/web`.)

- **Simplest first publish:** build locally with `flutter build web --release`, then use Cloudflare Pages **Direct Upload** of the `build/web` folder (no Git build needed for the first try).

4. After deploy, open the `*.pages.dev` HTTPS URL on Android Chrome.

### C) Android Chrome install checklist

1. Open the **HTTPS** URL in Chrome (Android).
2. Menu → **Uygulamayı yükle** or **Ana ekrana ekle**.
3. Confirm home-screen icon label is **NEFES**.
4. Launch from the icon → UI should look **standalone** (minimal browser chrome).
5. Log a cigarette, force-close, reopen → local data still present.
6. After one successful online load, enable airplane mode and reopen → shell/assets should still open (best-effort via `sw.js`).
7. Confirm `manifest.json` loads at `/manifest.json`.

## Missing brand assets (required for production branding)

Replace these Flutter placeholder files with NEFES artwork (same paths/sizes):

| File | Size | Notes |
|------|------|--------|
| `web/favicon.png` | 32×32 (or multi) | Browser tab |
| `web/icons/Icon-192.png` | 192×192 | Install / home screen |
| `web/icons/Icon-512.png` | 512×512 | Splash / install |
| `web/icons/Icon-maskable-192.png` | 192×192 | Android adaptive (safe zone) |
| `web/icons/Icon-maskable-512.png` | 512×512 | Android adaptive (safe zone) |

Do **not** ship the default Flutter logo as the public NEFES brand if you can provide real icons first.

## Service worker note (Flutter 3.44+)

Flutter’s built-in `flutter_service_worker.js` is now a **cleanup** worker (self-unregistering).
NEFES uses a custom `web/sw.js` plus `web/flutter_bootstrap.js` that **does not** enable Flutter’s SW settings, so the shell cache is not wiped on the next visit.

| File | Role |
|------|------|
| `web/sw.js` | Cache shell assets after first successful load |
| `web/flutter_bootstrap.js` | Loads Flutter without Flutter SW settings |

Rebuild after changing these files: `flutter build web --release`.
