# WasteLess v1.0.0-beta.1 — Release Notes

**Release date:** 2026-07-30  
**Channel:** Closed Beta  
**Deploy target:** Cloudflare Workers (static export + `/api/analyze`)

## Overview

First closed-beta build of WasteLess — a privacy-first PWA for receipt scanning, expense tracking, and purchase memory. All expense data stays on-device (IndexedDB). Receipt images are sent to the server only for OCR/analysis.

## What's included

### Core product
- **Receipt scan** — Camera, gallery, or “Open with WasteLess” (Android file handler)
- **Manual expense entry** — Full review/edit before save
- **Purchase memory** — Search past purchases by product, merchant, date
- **Insights & reports** — Local analytics from stored expenses
- **Categories, tags, calendar, history**
- **Onboarding** — First-run tour with optional display name

### Beta infrastructure
- **Local analytics** (`product-analytics.ts`) — Screen views, scan success/fail, timings
- **Beta telemetry** (`beta-telemetry.ts`) — Session lifecycle, D1/D7 retention markers
- **Feedback queue** — In-app feedback form + JSON export from Settings
- **PWA** — Install prompt, offline fallback page, service worker update flow
- **Legal stubs** — Privacy (`/privacy`) and Terms (`/terms`) pages

### Release fixes (this build)
- Fixed duplicate `Link` import in Settings (build blocker)
- Fixed corrupted duplicate `analyzeReceipt()` call in `receipt-engine-analyze.ts`
- Fixed invalid `readonly` method signatures in `merchantProfileRegistry.ts`
- Fixed TypeScript iteration issues in PWA launch handler and SDK event/registry code
- Fixed ESLint/type errors in golden script writers
- Aligned version to `1.0.0-beta.1` across `package.json`, `APP_VERSION`, `version.json`

## Environment variables

### Production (Cloudflare Worker secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for receipt OCR/analysis |
| `OPENAI_VISION_MODEL` | No | Vision model override (default: `gpt-4o-mini`) |
| `OPENAI_OCR_MODEL` | No | OCR model override (default: `gpt-4o-mini`) |
| `OPENAI_VISION_FALLBACK_MODEL` | No | Fallback vision model (default: `gpt-4o`) |
| `KB_ADMIN_PASSWORD` | No | Password for Product Knowledge admin UI |

Set secrets via:

```powershell
npx wrangler secret put OPENAI_API_KEY
```

### Local development (`.env.local`)

Copy `.env.example` → `.env.local` and set at minimum:

```
OPENAI_API_KEY=sk-...
```

Build for Cloudflare static export:

```powershell
$env:DEPLOY_TARGET="cloudflare"; npm run build
```

Deploy:

```powershell
npm run deploy
```

See also [DEPLOYMENT.md](./DEPLOYMENT.md).

## Verification (this release)

| Check | Result |
|-------|--------|
| Production build (`DEPLOY_TARGET=cloudflare`) | ✅ Pass |
| Test suite (`npx vitest run`) | ✅ 240/240 pass |
| PWA manifest + SW + `/offline` fallback | ✅ Configured |
| Icons (192, 512, maskable, apple-touch) | ✅ Present in `public/icons/` |
| Analytics wired via `AppShell` | ✅ `useProductAnalytics` + `useBetaTelemetry` |
| Feedback export | ✅ Settings → Geri bildirimi dışa aktar |
| Update flow | ✅ `UpdatePrompt` + Settings → Güncelle |

## Known limitations

See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for non-blocking issues tracked for post-beta.

## Upgrade notes

- Existing installs: use **Settings → Güncelle** or accept the update banner when a new service worker is waiting.
- `version.json` is regenerated on each deploy with the current semver and build timestamp.

## Recommended tag

```powershell
git tag -a v1.0.0-beta.1 -m "WasteLess closed beta 1"
```
