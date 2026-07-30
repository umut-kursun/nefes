# Real Receipt Golden Fixtures

Immutable raw OCR text captured from beta test scenarios. These fixtures drive the **Real Receipt Golden Suite** (`real-receipt-golden.test.ts`) and complement the synthetic fixtures in `FIXTURE_CATALOG`.

## Immutability policy

- **`.txt` files are frozen.** Do not edit OCR text in place. Any change to a `.txt` file will fail `real-receipt-immutability.test.ts` until checksums are explicitly updated.
- **Expected JSON** under `expected/` is regenerated via the golden write script when pipeline output intentionally changes.
- Checksums are stored in `REAL_RECEIPT_OCR_CHECKSUMS` inside `realReceiptRegistry.ts`.

## Directory layout

```
real/
  {merchant-slug}/
    {name}.txt          ← immutable raw OCR
    {name}.meta.json    ← provenance metadata
    expected/
      {name}.layout.json
      {name}.graph.json
      {name}.classified.json
      {name}.blocks.json
      {name}.purchase.json
      {name}.validation.json
```

## Regenerating goldens

After an intentional pipeline change:

```bash
npx tsx src/lib/receipt-engine/scripts/writeRealReceiptGoldens.ts
npm test
```

## Ingesting new beta OCR from debug-traces

1. Run the app with debug saving enabled (`RECEIPT_ENGINE_DEBUG_SAVE=1` and/or `OCR_DEBUG_SAVE=1` in development).
2. Locate the trace under `debug-traces/{traceId}/` at the project root.
3. Extract raw OCR text (from the OCR layer output or `raw-response.json` for OCR-only traces).
4. Create a new folder under `real/{merchant-slug}/` with:
   - `{name}.txt` — paste raw OCR verbatim
   - `{name}.meta.json` — set `source: "beta-test-scenario"`, `immutable: true`, description, category, `ingestedAt`, and trace origin
5. Add an entry to `REAL_RECEIPT_CATALOG` in `realReceiptRegistry.ts`.
6. Compute SHA256 of the new `.txt` and add it to `REAL_RECEIPT_OCR_CHECKSUMS`.
7. Run `writeRealReceiptGoldens.ts` to generate `expected/*.json`.
8. Add behavioral assertions in `document-parser-regression.test.ts` if needed.

## Current fixtures

| Slug | Category | Description |
|------|----------|-------------|
| `migros-ortak-pos` | supermarket | Migros with shared POS payment |
| `lcw-clothing` | clothing | LC Waikiki retail |
| `toyzz-card-slip` | retail | Toyzz Shop with card slip |
| `shell-motorin` | fuel | Shell motorin quantity/unit price |
| `opet-benzin` | fuel | Opet benzin line |
| `lezzet-restaurant` | restaurant | Restaurant food + cash |
| `eczane-pharmacy` | pharmacy | Pharmacy with cashier footer |
