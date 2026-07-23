# NEFES — Deployment & PWA (infrastructure)

This document covers **public HTTPS deployment** and **Android Chrome PWA install**.
It does **not** change app business logic, domain models, or local data architecture.

## Critical: deploy `build/web`, never `web/`

| Path | What it is | Deploy? |
|------|------------|---------|
| `web/` | Flutter **source** templates (`index.html`, manifest, icons, bootstrap template) — ~10 files | **No** |
| `build/web/` | Flutter **release** output (`main.dart.js`, `flutter.js`, `canvaskit/`, `assets/`, …) — hundreds of files | **Yes** |

If Cloudflare only uploads ~9 assets, the Worker is pointing at `web/` and the app will stick on the splash screen (`main.dart.js` → 404).

Canonical Wrangler config:

```toml
# wrangler.toml
name = "nefes321"
[assets]
directory = "./build/web"
not_found_handling = "single-page-application"
```

Do **not** put a Wrangler `[build]` command in `wrangler.toml`.  
GitHub Actions already runs `flutter build web --release` before `wrangler deploy`.  
If Cloudflare Workers Builds is also used, set the dashboard build command to  
`bash tool/ci_build_web.sh` (or equivalent) and keep the assets directory as `build/web`.

## Current production URL

`https://nefes321.forappsvs.workers.dev` (Cloudflare Workers)

## Production build (local)

```powershell
cd c:\Users\ukursun\Documents\nefes
flutter pub get
flutter build web --release
```

Verify before deploy:

```powershell
Test-Path build\web\main.dart.js
Test-Path build\web\flutter.js
Test-Path build\web\canvaskit
(Get-ChildItem build\web -Recurse -File).Count   # should be >> 9
```

## Cloudflare Workers (Git-connected)

Repo includes:

- `wrangler.toml` — `assets.directory = "./build/web"`, Worker name `nefes321`
- `tool/ci_build_web.sh` — installs Flutter (if needed) and runs `flutter build web --release`
- `.github/workflows/deploy-cloudflare.yml` — optional GitHub Actions deploy path

### Dashboard settings to check

1. Workers & Pages → **nefes321** → Settings → Build
2. **Build command** should run Flutter (or rely on `wrangler.toml` `[build].command`)
3. **Deploy / assets directory** must resolve to **`build/web`**, not `web`
4. Do **not** set “assets directory” / “root directory” to `web`

### GitHub Actions secrets (required for this workflow)

In GitHub → Settings → Secrets and variables → Actions, create **both**:

- `CLOUDFLARE_API_TOKEN` — API token with **Edit Cloudflare Workers** permission
- `CLOUDFLARE_ACCOUNT_ID` — **32-character hex** account id from Cloudflare → Workers & Pages → Overview (right sidebar)

Invalid example values that will fail deploy:

- Worker name (`nefes321`)
- `workers.dev` subdomain (`forappsvs`)
- Zone / site name
- API token pasted into the account-id field

If either secret is missing or the account id is not 32 hex chars, the workflow fails in
**Require and normalize Cloudflare secrets** with an explicit error.

Create the token: Cloudflare → My Profile → API Tokens → Create Token →
“Edit Cloudflare Workers”.

After adding secrets, re-run the failed workflow (Actions → Re-run jobs).

## Data safety (local-first)

NEFES stores smoking events and settings **in the browser** (IndexedDB / Sembast + `shared_preferences`).

- Data on `http://localhost` is **not** the same as data on the production HTTPS origin.
- Existing localhost smoking history will **not** appear automatically on the deployed URL.
- Reinstalling the PWA does **not** provide cloud backup.
- Clearing site data / Chrome storage for that origin can **delete** local NEFES data.
- Cloud sync / accounts / backup are **out of scope** for the current version.

## PWA install checklist (Android Chrome)

1. Open the **HTTPS** Workers URL.
2. Menu → **Uygulamayı yükle** / **Ana ekrana ekle**.
3. Icon label **NEFES**, standalone launch.
4. Log a cigarette → reopen → data still there.
5. After one online load, airplane mode reopen should still load cached shell assets (`sw.js`).

## Missing brand assets

Replace Flutter placeholder icons under `web/icons/` and `web/favicon.png` before a branded public launch (same sizes: 192 / 512 / maskable).
