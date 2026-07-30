# SDK Usage

## Quick start

```typescript
import { analyzeReceipt, createReceiptEngine } from "@/lib/receipt-engine-sdk";

// OCR text path (skip L1 OCR)
const result = await analyzeReceipt({
  ocrText: fs.readFileSync("receipt.txt", "utf8"),
  sourceHint: "migros-ortak-pos",
});

console.log(result.purchase.merchant);
console.log(result.confidence.overall);
```

## Image input

```typescript
const result = await analyzeReceipt({
  imageDataUrl: "data:image/jpeg;base64,...",
  sourceHint: "receipt",
}, {
  ocrProviderId: "openai",
}, {
  ocrFactoryOptions: {
    kind: "openai",
    openAi: { apiKey: process.env.OPENAI_API_KEY! },
  },
});
```

## Buffer input

```typescript
const result = await analyzeReceipt({
  imageBuffer: fs.readFileSync("receipt.jpg"),
  mimeType: "image/jpeg",
});
```

## Class-based API

```typescript
const engine = createReceiptEngine({ language: "tr", currency: "TRY" });

engine.events.on("onValidationFinished", ({ validation }) => {
  console.log("Valid:", validation.isValid);
});

const result = await engine.analyze({ ocrText: "..." });
```

## Export

```typescript
import { exportReceiptResult } from "@/lib/receipt-engine-sdk";

const markdown = await exportReceiptResult(result, "markdown");
const bundle = await exportReceiptResult(result, "debug-bundle");
```

## WasteLess integration

`src/lib/receipt-engine-analyze.ts` is a thin wrapper over `analyzeReceipt` for the Next.js API route.
