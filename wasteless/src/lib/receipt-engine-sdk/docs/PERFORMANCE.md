# Performance

## Timings

When `modes.performance` is enabled (default), `ReceiptResult.performance` includes:

| Field | Stage |
|-------|-------|
| `uploadMs` | L0 image acquisition |
| `ocrMs` | L1 OCR |
| `layoutMs` | L2 layout |
| `graphMs` | L3 graph |
| `classificationMs` | L4 classify |
| `blockMs` | L5 blocks |
| `purchaseMs` | L6 purchase |
| `validationMs` | L7 validate |
| `totalMs` | End-to-end |

For `ocrText` input, `uploadMs` and `ocrMs` are zero.

## Benchmark

Run the SDK benchmark suite:

```bash
npm run benchmark:sdk
```

Output: `reports/sdk-benchmark.json`

Metrics:
- Average, median, p95 latency
- Memory estimate (`process.memoryUsage` delta)
- Corpus coverage (real receipt fixtures)
- Pass rate (layout + purchase + validation golden match)
- Average confidence

## Optimization notes

1. Use `ocrText` input in tests and regression to skip OCR latency.
2. Disable `modes.quality` when debug report is not needed.
3. Disable `modes.performance` to skip timing collection overhead.
