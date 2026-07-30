# Data Models

## ReceiptResult

Primary SDK output:

```typescript
interface ReceiptResult {
  success: boolean;
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  debugReport: ReceiptDebugReport;
  confidence: ReceiptConfidenceBreakdown;
  performance: Partial<PipelineLayerTimings>;
  rawOcr: { rawText: string; lines: string[] };
  normalizedOcr: { lines: string[]; rawText: string };
  versions: ReceiptEngineVersions;
  error?: { code: string; message: string };
}
```

## Input variants

```typescript
type ReceiptAnalyzeInput =
  | { imageDataUrl: string; altImageDataUrl?: string; sourceHint?: string; preprocessMs?: number }
  | { imageBuffer: Buffer | Uint8Array; mimeType: string; sourceHint?: string }
  | { ocrText: string; sourceHint?: string };
```

## Source types

- `PurchaseDraft` — from `receipt-engine/types/models/purchase`
- `ValidationReportGolden` — validation without embedded purchase
- `ReceiptDebugReport` — from `receipt-engine-quality`
- `ReceiptConfidenceBreakdown` — per-field confidence scores
- `PipelineLayerTimings` — from `receipt-engine-debug/tracePipeline`
- `ReceiptEngineVersions` — engine/schema/corpus/golden/regression/parser versions

## Export formats

`json` | `csv` | `excel` | `markdown` | `html` | `debug-bundle` | `regression-bundle` | `quality-report`
