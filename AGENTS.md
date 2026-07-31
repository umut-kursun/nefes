# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **monorepo with two independent products**:

| Product | Path | Stack | Dev server |
| --- | --- | --- | --- |
| **NEFES** | repo root | Flutter Web PWA (smoking-reduction habit app, Turkish UI) | `flutter run -d chrome` |
| **WasteLess** | `wasteless/` | Next.js 14 App Router PWA (receipt / spending tracker, Turkish UI) | `npm run dev` (port 3000) |

Standard commands are documented in `README.md` (NEFES) and `wasteless/README.md` (WasteLess). Notes below are the non-obvious bits.

### Toolchain locations (already provisioned in the snapshot)
- **Flutter** stable **3.44.8** lives at `~/flutter`; `~/flutter/bin` is added to `PATH` via `~/.bashrc`. If `flutter` is not found in a non-interactive shell, prefix with the full path: `"$HOME/flutter/bin/flutter"`. The startup update script uses that full path to run `flutter pub get`.
- **Node 22** and **npm** are pre-installed. WasteLess requires Node >= 20.
- **Chrome** is at `/usr/local/bin/google-chrome` (used by `flutter run -d chrome`).

### NEFES (Flutter, repo root)
- Lint: `flutter analyze` (currently reports 3 pre-existing info-level lints, no errors).
- Test: `flutter test`. **Known pre-existing failure**: `test/m5_capture_first_test.dart` › "Capture-first logging trigger can be cleared" fails on Flutter 3.44.8 (`Expected false, Actual true`). This is unrelated to environment setup — do not assume you broke it. All other suites pass (82/83).
- Run in dev: `flutter run -d chrome` (release mode `--release` is faster in-browser per the README, but debug is fine for development).

### WasteLess (`wasteless/`)
- All commands run from `wasteless/`: `npm run dev`, `npm run lint`, `npm test` (vitest), `npm run build`.
- Data is **client-side only** (IndexedDB via Dexie). A fresh browser profile starts **empty** — there is no server DB or seed. To exercise memory/analytics features, add expenses first via the `/add` manual flow or the home quick-add buttons.
- The `/api/analyze` receipt-vision route needs `OPENAI_API_KEY`. It is optional for most development: manual/quick-add entry, Purchase Memory search, category analytics, and all `vitest` suites work without any API key.
- The receipt parsing engine under `wasteless/src/lib/receipt-engine` (layered, alpha) is **not** the production analyze path today; `/api/analyze` uses the vision pipeline in `wasteless/src/lib/receipt-pipeline`.

### Deploy (WasteLess)
- Cloudflare Workers deploy (`npx wrangler deploy`, or the CI in `.github/workflows/deploy-cloudflare.yml`) requires the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. These are not present in the cloud VM by default.
