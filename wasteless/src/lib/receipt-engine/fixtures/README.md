# Receipt Engine v2 — Fixture Strategy

Fixtures are organized by receipt **category**, not by locale alone.
Each category folder holds real OCR-derived samples when available.

## Layout

```
fixtures/
  supermarket/       # Full pipeline goldens (migrated from tr-supermarket)
  weighted/          # Weighted / continuation product scenarios
  multi-payment/     # Multiple payment rows
  convenience/       # Placeholder — awaiting OCR samples
  pharmacy/          # Placeholder
  restaurant/        # Placeholder
  fuel/              # Placeholder
  malformed/         # Placeholder — OCR error cases
  discount/          # Placeholder — discount footer scenarios
  multi-vat/         # Placeholder
  split-payment/     # Placeholder
  refund/            # Placeholder
  credit-note/       # Placeholder
  malformed-ocr/     # Placeholder
  ocr/               # L1 OCR text fixtures + ocrFixtureRegistry.ts
  tr-supermarket/    # Deprecated — use category folders via fixtureRegistry
```

## Pipeline stages per fixture

Each fixture name (e.g. `with-bag`) may contain:

| Stage | File |
|-------|------|
| OCR | `{name}.txt` |
| Layout | `expected/{name}.layout.json` |
| Graph | `expected/{name}.graph.json` |
| Classified | `expected/{name}.classified.json` |
| Blocks | `expected/{name}.blocks.json` |
| Purchase | `expected/{name}.purchase.json` |

Load fixtures via `fixtureRegistry.ts` — do not hard-code legacy paths.

## Rules

- Do not invent receipt content for placeholder categories.
- Regression tests compare layer output to golden JSON only.
- L6 (Purchase) goldens compare `PurchaseDraft` only.
