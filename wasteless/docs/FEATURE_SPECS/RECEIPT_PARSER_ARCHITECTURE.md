# Receipt Engine Parser Architecture

> Status: Implemented architecture sprint — document segmentation + section-scoped parsing.  
> Validators are unchanged and remain the source of truth for correctness.

## Pipeline

```
OCR
 → Layout (+ feature extract)
 → Document Segmentation (state machine)
 → Graph
 → Semantic classification (section-gated)
 → Section-scoped block builders
 → Purchase Draft
 → Validation (unchanged)
```

## Architectural changes

### 1. Document segmentation (state machine)

Module: `document-segmentation/`

Sections:

`HEADER → PRODUCTS → TOTALS → PAYMENTS → VAT_SUMMARY → CARD_SLIP → LOYALTY → FOOTER → END`

Rules:

- One-way transitions only — never return to `PRODUCTS` after `TOTALS`.
- Coarse region mapping preserves graph compatibility:
  - `HEADER` → `header`
  - `PRODUCTS` → `body`
  - everything after → `footer`
- Layout lines carry both `region` and `section`.

### 2. Section isolation

Only the PRODUCTS section may create products.

Product classifier and product block builder:

- require coarse `body` (PRODUCTS)
- reject totals / payment / card-slip / footer structural markers as defense-in-depth

Payment, VAT summary, card-slip, and loyalty lines are footer-section consumers and cannot leak into products.

### 3. Semantic kinds

Added:

- `address` — header address lines (not merchant)
- `card_slip` — POS terminal metadata (`AID`, `TERM`, `ONAY`, `PAYWAVE`, …)

Existing kinds (`product`, `total`, `payment`, `vat`, …) remain; classification is gated by section/region.

### 4. Merchant confidence scoring

`merchant/merchantScorer.ts` scores header candidates:

- company / org suffixes → high
- greetings → ~0
- address / URL / footer → low/zero

Metadata block keeps the highest-scoring merchant.

### 5. Purchased quantity vs package attributes

Package sizes (`150 GR`, `330 ML`, `1 L`, `29.766 LT` alone) are **attributes**, not purchased quantity.

Purchased quantity only from:

- explicit expressions (`2 ADET`, `x 3`)
- sold-by-weight / dispensed patterns (`0,744 kg x 89,90`)

### 6. Fuel mapping helper

`fuelMapper.ts` extracts liters, TL/L, fuel type, plate, pump — without inventing products outside PRODUCTS.

Sold-quantity unit prices (`29,766 LT x 79,17`) are taken from the embedded expression, never from the trailing line total. Structural qty/unit-price tokens are not reclassified as clock times.

### 7. Validation

L7 validators are **not** weakened. Parser quality is measured by validators passing.

## Why this is better

| Before | After |
|--------|-------|
| Every body line with money ≈ product | Products only from PRODUCTS section |
| Independent per-line classification | Document state machine + section gates |
| Package size mistaken for qty | Explicit purchased-qty rules |
| First header line = merchant | Confidence-scored merchant |
| Card-slip / POS leaked as products | `card_slip` section + classifier |

Determinism: same OCR → same sections → same draft.  
Extensibility: new section kinds / profiles plug into the state machine without product-regex sprawl.

## Accuracy improvements (expected)

- Totals / payments / POS slip / loyalty / footer no longer become products
- Merchant selection ignores greetings and addresses
- Quantity no longer invents “1” from “1 L” package text
- Fuel dispensed liters remain recoverable as sold quantity / fuel draft fields

## Remaining limitations

- Layout profiles are still a single `generic-tr` stub (no merchant-specific grammars yet)
- L8 knowledge / L9 expense builders remain stubs
- Fuel type / pump extraction is best-effort from text; needs fuel goldens
- Restaurant / pharmacy / LCW corpora should be added as golden fixtures next
- Segmentation markers are structural (necessary for boundaries) — not product-name heuristics, but still text-driven
- OCR errors that garble `TOPLAM` may delay the PRODUCTS→TOTALS transition

## Regression suite

`__tests__/parser-architecture.test.ts` plus existing golden stages (layout → validation).

Each golden should continue to verify: merchant, products, total, payment, VAT — and that totals/footer/payment/terminal lines are never products.
