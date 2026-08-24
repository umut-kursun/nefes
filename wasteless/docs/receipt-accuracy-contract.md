# Receipt Accuracy Contract

This document defines the **financial accuracy contract** for Wasteless receipt analysis.
Phase 0 establishes measurement only; extraction and validation behavior are unchanged until later phases.

## Priority

1. Correctness
2. Data safety
3. Review when uncertain
4. Performance

A missing value requiring user correction is acceptable. A wrong financial value presented as correct is not.

## Mandatory fields

For every receipt (corpus A–I in production):

| Field | Requirement |
|-------|-------------|
| **Merchant** | Clean consumer-facing brand/store name |
| **Category** | Actual purchase category |
| **Date** | Valid ISO date from receipt evidence |
| **Time** | Valid time from receipt evidence |
| **Total** | Footer total semantics (TOPLAM, ÖDENECEK, …) |
| **Products** | Real product/service names only |
| **Product amounts** | Prices tied to correct products |

## Field verdicts

Each field receives one of:

- **`correct`** — matches contract ground truth
- **`needs_review`** — missing or uncertain; acceptable if analysis is not approved
- **`incorrect`** — wrong value while analysis is **`approved`** (false approval)

## Merchant rules

- Canonical examples: `Migros`, `File Market`, `Tiki Beach`, `Petrol Ofisi`
- Must not expose: address, phone, VKN/TCKN, legal suffixes, branch text
- Normalization must be generalized (registry + rules), not receipt-specific patches

## Category rules

- Must reflect actual purchase type (`market`, `yeme_icme`, `akaryakit`, `diger`, …)
- Never silently default to `market` when confidence is insufficient
- Wrong category on an approved receipt → **incorrect**

## Date and time

- Impossible dates (e.g. `13/38/2026`) must never normalize to valid ISO dates
- Deterministic validation via `parseDate` (V1 parser) is the reference for validity checks

## Total

- Hard financial field — footer-authoritative
- Do not confuse VAT, payment, product lines, discounts, or change with total
- Guessed totals must not be silently approved

## Products

These must **never** appear as products:

- Merchant headers, legal names, addresses, phone numbers
- VKN/TCKN, MERSIS, EPDK, POS/card metadata
- VAT lines, totals, payment lines, category subtotal labels (YİYECEK/İÇECEK)

Product names must not be bare amounts (`*215,00`), VAT tokens (`%20`), or quantities alone.

## Product amounts

- Must bind to the correct product line
- Support split lines (name + VAT + price), weighted items, fuel qty × unit price
- Commercial rounding per `moneyPolicy.ts` (`receiptReconciliationTolerance`, `lineReconciliationTolerance`)

## Payment

- Separate from VAT and total
- Pair method + amount; dedupe repeated OCR amounts
- TOPKDV must never become a payment

## Approval lifecycle (unchanged)

```
background analysis
→ draft persisted (pending_approval | needs_review)
→ user review
→ explicit "Onayla & Kaydet"
→ parseStatus = null (finalized)
```

Only explicit user confirmation finalizes an expense.

## Regression corpus

Receipts **A–I** are one frozen suite (`baselines/corpus-v0/`). Every program phase runs **all nine** together.
The baseline directory is immutable; harness reads it read-only.

## Testing tiers

| Tier | Path | Purpose |
|------|------|---------|
| **frozen-baseline** | Read corpus-v0 artifacts | Phase 0 scorecard reference |
| **tier-a-replay** | Cached `live-ocr.json` → existing V2 pipeline | Fast deterministic regression |
| **tier-b-live** | Real PNG → production router → Vision | Live production validation |

Fixture-only success is insufficient for phase sign-off; tier-b-live required before release phases.

## Performance KPI (program target)

| Metric | Target |
|--------|--------|
| P50 | ≤ 8 s |
| P95 | ≤ 15 s |
| Normal | ≤ 10 s |
| Investigation | > 20 s |
| Unacceptable | > 30 s normal path; 60–110 s sequential OCR prohibited |

## Harness commands

```bash
npm run test:corpus-contract          # Unit + tier-a replay tests
npm run corpus:contract               # Frozen baseline scorecard
npm run corpus:contract:replay        # Tier-a OCR replay scorecard
npm run corpus:contract:live          # Tier-b live Vision (requires OPENAI_API_KEY)
```

Reports are written to `reports/corpus-contract-*.json` and `reports/corpus-contract-phase0-*.md`.
