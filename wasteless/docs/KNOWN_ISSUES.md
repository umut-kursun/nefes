# Known Issues — v1.0.0-beta.1

Non-blocking issues for closed beta. **Do not fix in beta hotfix track** unless they become release blockers.

## OCR & receipt parsing

| Issue | Impact | Workaround |
|-------|--------|------------|
| Poor photo quality reduces OCR accuracy | Medium | Retake in good light; review highlighted low-confidence lines before save |
| Crumpled/long thermal receipts may miss line items | Medium | Manual edit in review screen |
| Bank screenshot mode less tested than receipt mode | Low | Use receipt mode for market fişleri |
| Some merchant formats not in golden corpus | Low | Report via feedback with receipt type |

## PWA & platform

| Issue | Impact | Workaround |
|-------|--------|------------|
| iOS Safari: no `launchQueue` / file_handlers | Low | Use in-app camera or gallery on `/add` |
| iOS: update banner may require manual refresh | Low | Settings → Güncelle |
| Android adaptive icon safe zone | Low | 192px icon reused for maskable; may clip on some launchers |
| Offline: receipt scan requires network | Expected | Cached pages work; scan when back online |

## Product & UX

| Issue | Impact | Workaround |
|-------|--------|------------|
| Privacy & Terms pages are beta stubs | Low | Acceptable for closed beta; legal review before public launch |
| No remote feedback upload | By design | Export JSON from Settings and send to team manually |
| Premium/Pro features shown as teaser only | None | All current features are free in beta |
| Product Knowledge admin UI is English | Low | Password-protected; not needed for normal testers |
| Context menu disabled globally | Low | Intentional for PWA UX |

## Analytics & telemetry

| Issue | Impact | Workaround |
|-------|--------|------------|
| Analytics stored locally only | By design | No server dashboard; export not exposed in UI (localStorage key `wl_product_analytics`) |
| Session end on mobile tab background unreliable | Low | `beforeunload` may not fire; session metrics approximate |
| Retention D1/D7 markers are device-local | Low | Clearing storage resets markers |

## Developer / internal

| Issue | Impact | Workaround |
|-------|--------|------------|
| `receipt-pipeline` logs stage timings to server console | None for users | Server-side only; not visible in browser |
| Debug routes exist (`/ocr/debug`, `/receipt-engine/debug`) | Low | Not linked in nav; staging/debug only |
| Static export disables Next.js API routes in production | Expected | Cloudflare Worker handles `/api/analyze` |
| Some receipt-engine test fixtures out of sync with types | None for users | Tests pass; fixture drift in quality track only |

## Not in scope for beta

The following are **intentionally not implemented** (roadmap items):

- Budgets and spending goals
- Charts beyond basic reports
- Premium paywall / subscriptions
- Web Share Target API
- Cloud sync or accounts
- Remote crash/feedback upload

## Reporting new issues

1. In-app: **Settings → Geri bildirim**
2. Export: **Settings → Geri bildirimi dışa aktar (JSON)** when queue has entries
3. Include: device, browser, steps to reproduce, screenshot if possible
