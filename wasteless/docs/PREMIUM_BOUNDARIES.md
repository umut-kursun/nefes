# Premium Boundaries

Design reference for WasteLess Free vs Pro tiers during beta.

## Free (current)

| Capability | Included |
|---|---|
| Receipt scan & OCR | Yes |
| Manual expense entry | Yes |
| Local expense history | Yes (device storage) |
| Categories & tags | Yes |
| Purchase memory search | Yes |
| Basic local insights | Yes |
| Reports (local) | Yes |
| Data export | Yes (JSON) |

## Pro (planned — not available in beta)

| Capability | Status |
|---|---|
| Advanced AI insights | Design preview only |
| Unlimited history | Design preview only |
| Price alerts | Not implemented |
| Cloud backup & sync | Not implemented |
| Budget goals | Not implemented |
| Priority OCR / batch scan | Not implemented |

## Beta policy

- No payment integration in beta.
- `PremiumTeaser` component shows Free vs Pro columns for UX testing only.
- Pro features must not be gated behind paywalls until launch criteria in `BETA_LAUNCH_PLAN.md` are met.
- Feedback on desired Pro features: Settings → Geri bildirim.

## Technical notes

- All tier logic is product/UX only; no receipt engine or SDK changes.
- Feature flags for Pro should live in product layer (`src/components/`, `src/lib/`) when implemented post-beta.
