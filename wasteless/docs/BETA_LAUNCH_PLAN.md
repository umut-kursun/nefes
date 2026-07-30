# Beta Launch Plan — Post-Beta Priorities

Ordered priorities after closed beta feedback window (2–4 weeks).

## P0 — Must have before public beta

1. **Legal** — Full privacy policy and terms (TR + EN if needed).
2. **Feedback pipeline** — Optional secure upload endpoint (with consent) or email template for JSON export.
3. **OCR trust** — Continue UX improvements; engine accuracy tracked separately.
4. **Crash / error reporting** — Local-only error log export (no PII).

## P1 — High value

1. **Onboarding analytics review** — Analyze `first_receipt_saved` funnel and `screen_abandon` on add.
2. **Duplicate receipt hint** — Wire recovery preset to real duplicate detection (product layer).
3. **Insight engagement** — Rank insights by `insight_viewed` frequency.
4. **Retention emails / push** — Only if user opts in; not in current privacy model.

## P2 — Pro groundwork

1. **Feature flags** — Product-layer gates for Pro previews.
2. **Budget goals** — Design + local implementation.
3. **Price alerts** — Requires history + notification UX.
4. **Cloud backup** — Architecture spike; conflicts with current local-first promise.

## P3 — Nice to have

1. **i18n** — English UI option.
2. **Widget / quick capture** — OS-level shortcuts.
3. **Merchant logos** — Cosmetic enrichment.

## Success metrics (beta)

| Metric | Target |
|---|---|
| First receipt saved (within 24h of install) | > 60% of testers |
| Scan success rate | > 75% |
| Manual edit rate (expected) | 20–40% (healthy verification) |
| D7 retention (local marker) | > 30% |
| Feedback submissions | ≥ 1 per active tester |

## Decision gates

- **Public beta:** Legal complete + checklist signed off + no P0 bugs.
- **Pro announcement:** Payment provider selected + PREMIUM_BOUNDARIES implemented in code.
- **Store listing:** Full privacy review + OCR data flow documented.
