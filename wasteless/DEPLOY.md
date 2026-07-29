# WasteLess — Production Deployment Guide

Deploy **WasteLess** to [Vercel](https://vercel.com) as a Next.js 14 serverless application with PWA support.

---

## 1. Requirements

| Requirement | Value |
|-------------|-------|
| Node.js | **20.x** (see `.nvmrc` and `package.json` `engines`) |
| Package manager | npm |
| Framework | Next.js 14 (App Router) |
| Hosting | Vercel (recommended) |
| OpenAI account | Vision-capable API key for receipt OCR |

**Build commands (default — no override needed on Vercel):**

```bash
npm install
npm run build
npm start          # local production smoke test
```

**Do not set** `DEPLOY_TARGET=cloudflare` on Vercel. That flag enables static export for Cloudflare Pages and disables serverless API routes.

---

## 2. Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you test PRs).

### Required

| Variable | Scope | Description |
|----------|-------|-------------|
| `OPENAI_API_KEY` | Server only | OpenAI API key. **Never** prefix with `NEXT_PUBLIC_`. |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_VISION_MODEL` | `gpt-4o-mini` | Legacy v1 analyze route model |
| `OPENAI_OCR_MODEL` | falls back to vision model | Receipt Engine OCR model |
| `OPENAI_VISION_FALLBACK_MODEL` | — | Fallback for v1 analyze retries |
| `KB_ADMIN_PASSWORD` | — | Password for product-knowledge admin UI |

### Development / staging only — do NOT enable in production

| Variable | Effect |
|----------|--------|
| `RECEIPT_ENGINE_DEBUG_EXPORT=1` | Exposes debug pages, debug APIs, JSON/ZIP export UI |
| `RECEIPT_ENGINE_DEBUG_SAVE=1` | Writes pipeline traces to disk (local only; **not supported on Vercel**) |
| `OCR_DEBUG_SAVE=1` | Writes OCR traces to disk (local only) |

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
# Edit .env.local and set OPENAI_API_KEY
```

---

## 3. Vercel Deployment Steps

### First-time deploy

1. Push the repository to GitHub (or GitLab/Bitbucket).
2. In Vercel, click **Add New Project** and import the repo.
3. **Root directory:** set to `wasteless` if the monorepo root is `nefes`.
4. **Framework preset:** Next.js (auto-detected).
5. **Node.js version:** 20.x (Project Settings → General → Node.js Version, or honor `.nvmrc`).
6. Add environment variables (see §2). At minimum: `OPENAI_API_KEY`.
7. Click **Deploy**.

### `vercel.json` highlights

The repo includes `vercel.json` with:

- `framework: nextjs`
- `regions: ["fra1"]` (Frankfurt — adjust for your users)
- API routes under `src/app/api/**` — `maxDuration: 60` seconds (requires Vercel Pro for 60s on some plans; Hobby default is 10s — upgrade or reduce timeout if OCR times out)

### Post-deploy smoke test

1. Open the production URL on a phone (or Chrome DevTools mobile emulation).
2. Add a receipt photo via **Harcama ekle**.
3. Confirm analysis completes and you can save an expense.
4. Install as PWA (Chrome → “Install app” / iOS Safari → Share → Add to Home Screen).
5. Toggle airplane mode briefly — offline fallback page should appear for uncached navigations.

---

## 4. GitHub Deployment (CI/CD)

Vercel integrates with GitHub automatically:

- **Production:** merges to your production branch (usually `main`) trigger production deploys.
- **Preview:** every pull request gets a preview URL.

Optional GitHub Actions (not required if using Vercel Git integration):

```yaml
# .github/workflows/ci.yml (example)
name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

---

## 5. Production Checklist

### Build quality

- [ ] `npm run build` completes with no errors
- [ ] `npm run lint` — zero warnings/errors
- [ ] `npm test` — all tests pass (161+)

### Security

- [ ] `OPENAI_API_KEY` set in Vercel, not in client code
- [ ] No `NEXT_PUBLIC_*` secrets
- [ ] Debug routes return 404 in production (`/ocr/debug`, `/receipt-engine/debug`)
- [ ] Debug APIs return 404 (`/api/ocr/debug`, `/api/receipt-engine/debug`, `/api/receipt-engine/debug-package`)
- [ ] API errors return generic messages (no stack traces)

### PWA

- [ ] `/manifest.json` loads (200)
- [ ] Icons: `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/apple-touch-icon.png`
- [ ] Theme color `#0F766E` in manifest and layout viewport
- [ ] Service worker registered in production (disabled in `npm run dev`)
- [ ] Offline fallback: `/offline`

### Mobile

- [ ] Viewport: `device-width`, `viewport-fit: cover`
- [ ] Safe areas: top padding and bottom nav use `env(safe-area-inset-*)`
- [ ] No horizontal scroll
- [ ] Touch targets ≥ 48px on primary actions (Add page upload buttons)
- [ ] Loading spinner during receipt analysis

### Performance

- [ ] Receipt review UI lazy-loaded on `/add`
- [ ] Debug export UI lazy-loaded (dev only)

---

## 6. Common Problems

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| “Sunucu yapılandırması eksik.” | Missing `OPENAI_API_KEY` on Vercel | Add env var, redeploy |
| OCR timeout / 504 | Serverless function exceeded duration | Upgrade Vercel plan or set lower `maxDuration`; use smaller images |
| PWA not updating after deploy | Service worker cache | Hard refresh; use in-app update prompt; wait for SW activation |
| Debug pages visible in prod | `RECEIPT_ENGINE_DEBUG_EXPORT=1` set | Remove flag, redeploy |
| Build fails on Node 18 | Engine requires Node 20 | Set Node 20 in Vercel project settings |
| `DEPLOY_TARGET=cloudflare` set | Static export breaks API routes on Vercel | Unset on Vercel |
| iOS keyboard covers inputs | Mobile Safari quirk | App uses keyboard guard in `AppShell`; retest on device |

---

## 7. Troubleshooting

### Check Vercel function logs

Vercel → Project → **Logs** → filter by `/api/receipt-engine` or `/api/analyze`.

Server-side errors are logged with `console.error`; clients receive sanitized messages only.

### Local production simulation

```bash
npm run build
npm start
# Open http://localhost:3000
```

Ensure `.env.local` contains `OPENAI_API_KEY`.

### Verify debug routes are blocked

```bash
curl -i https://YOUR_DOMAIN/ocr/debug
# Expect 404

curl -i -X POST https://YOUR_DOMAIN/api/ocr/debug
# Expect 404 JSON
```

### PWA / service worker

- Service worker is **disabled** when `NODE_ENV=development`.
- Run `npm run build && npm start` to test SW locally.
- Inspect **Application → Service Workers** in Chrome DevTools.

### Receipt analysis fails for all images

1. Confirm API key is valid and has billing.
2. Check model env vars (`OPENAI_OCR_MODEL`).
3. Review function logs for OpenAI HTTP errors.

---

## 8. Rollback Instructions

### Vercel instant rollback

1. Vercel → Project → **Deployments**.
2. Find the last known-good deployment.
3. Click **⋯ → Promote to Production** (or **Rollback**).

### Git rollback

```bash
git revert <bad-commit-sha>
git push origin main
```

Vercel will deploy the revert automatically if Git integration is enabled.

### Environment rollback

If a bad env var was introduced:

1. Vercel → Settings → Environment Variables.
2. Restore previous value or delete the variable.
3. **Redeploy** the current production deployment (Deployments → ⋯ → Redeploy).

---

## Architecture notes

- **Receipt Engine v2** runs server-side via `POST /api/receipt-engine`.
- **Legacy v1 pipeline** remains at `POST /api/analyze` (used for certain flows on `/add`).
- **Client storage:** IndexedDB (Dexie) — data stays on device; no backend database required.
- **Secrets:** Only server route handlers read `process.env.OPENAI_API_KEY`.

---

## Support contacts

Document your team’s on-call / maintainer here before go-live.
