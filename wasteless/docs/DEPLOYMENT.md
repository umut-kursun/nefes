# WasteLess — Cloudflare deploy (Nefes-style)

Public HTTPS PWA: Cloudflare Workers serves static Next export + `/api/analyze`.

## Production URL

After first deploy: `https://wasteless.<your-subdomain>.workers.dev`  
(same Cloudflare account as Nefes / `forappsvs`)

## One-time setup

1. Cloudflare login (once on this machine):

```powershell
cd c:\Users\ukursun\Documents\nefes\wasteless
npx wrangler login
```

2. Put OpenAI key on the Worker:

```powershell
npx wrangler secret put OPENAI_API_KEY
```

3. Deploy:

```powershell
npm run deploy
```

## Local development

```powershell
npm run dev
```

Uses Next.js API route + `.env.local` (`OPENAI_API_KEY`).

## GitHub Actions

Workflow: `.github/workflows/deploy-wasteless-cloudflare.yml`

Secrets (repo Settings → Secrets):

- `CLOUDFLARE_API_TOKEN` — same as Nefes
- `CLOUDFLARE_ACCOUNT_ID` — same as Nefes (32 hex)
- `OPENAI_API_KEY` — optional; synced to Worker on deploy

## Architecture

| Piece | Role |
|-------|------|
| `out/` | Next static export (UI + PWA manifest) |
| `worker/index.ts` | `/api/analyze` (OpenAI vision) |
| `wrangler.toml` | Worker name `wasteless`, assets = `./out` |
