# OCR fixtures

Category-specific OCR text samples for L1 provider tests and end-to-end pipeline runs.

## Categories

| Category | Status |
|----------|--------|
| `supermarket/` | Active — full e2e goldens |
| `malformed/` | Active — normalization recovery tests |
| `low-confidence/` | Active — confidence metadata tests |
| `blurred/` | Active — degraded OCR (no purchase golden) |
| `fuel/` | Placeholder — awaiting real OCR |
| `restaurant/` | Placeholder — awaiting real OCR |
| `pharmacy/` | Placeholder — awaiting real OCR |

## Files per fixture

- `{name}.txt` — raw OCR text
- `{name}.meta.json` — optional line confidences / bbox hints

Load via `ocrFixtureRegistry.ts`.
