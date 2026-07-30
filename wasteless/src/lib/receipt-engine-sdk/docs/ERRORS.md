# Errors

## Result-level errors

When analysis fails, `ReceiptResult.success` is `false` and `error` is set:

```typescript
{
  code: "ANALYSIS_FAILED",
  message: "Human-readable description"
}
```

The result still includes empty defaults for purchase, validation, and debug report.

## OCR provider errors

Stub providers throw helpful errors:

```
OCR provider "google-vision" is not implemented. Register a custom provider via ocrProviderRegistry.register() or use "openai" / "mock".
```

Unknown provider IDs:

```
Unknown OCR provider "foo". Available: mock, openai, google-vision, ...
```

## Export errors

Unsupported format:

```
Unsupported export format: <format>
```

## Validation

The SDK does not weaken validators. L7 validation runs unchanged; `validation.errors` reflects full validator output.

## WasteLess API mapping

`receipt-engine-analyze.ts` maps SDK failures to HTTP responses:

| SDK | API |
|-----|-----|
| `success: false` | `{ error, failureCode, status: 500 }` |
| `success: true` | `{ purchase, validation, imageDataUrl }` |
