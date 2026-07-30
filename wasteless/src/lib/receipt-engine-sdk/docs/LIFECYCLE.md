# Lifecycle Events

The SDK emits events after each pipeline stage without modifying layer internals.

## Events

| Event | Payload | When |
|-------|---------|------|
| `onOCRFinished` | `{ ocr, durationMs }` | After L1 or ocrText normalization |
| `onLayoutFinished` | `{ layout, durationMs }` | After L2 |
| `onSegmentationFinished` | `{ layout, durationMs }` | After L2 segmentation |
| `onClassificationFinished` | `{ classified, graph, durationMs }` | After L4 |
| `onPurchaseDraftCreated` | `{ purchase, durationMs }` | After L6 |
| `onValidationFinished` | `{ validation, purchase, durationMs }` | After L7 |
| `onCompleted` | `{ result }` | Final ReceiptResult assembled |

## Usage

```typescript
import { createEventEmitter, analyzeReceipt } from "@/lib/receipt-engine-sdk";

const events = createEventEmitter();

events.on("onPurchaseDraftCreated", ({ purchase }) => {
  console.log("Products:", purchase.products.length);
});

await analyzeReceipt({ ocrText: "..." }, undefined, { events });
```

## Unsubscribe

Handlers return an unsubscribe function:

```typescript
const off = engine.events.on("onCompleted", () => {});
off();
```
