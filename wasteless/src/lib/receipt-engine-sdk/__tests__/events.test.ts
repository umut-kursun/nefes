import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { createReceiptEngine } from "../analyzeReceipt";
import type { LifecycleEventName } from "../events/lifecycle";

describe("ReceiptEngine lifecycle events", () => {
  it("emits ordered pipeline events for ocrText input", async () => {
    const ref = REAL_RECEIPT_CATALOG[0];
    const ocr = loadRealReceiptOcr(ref);
    const engine = createReceiptEngine();
    const seen: LifecycleEventName[] = [];

    engine.events.on("onOCRFinished", () => seen.push("onOCRFinished"));
    engine.events.on("onLayoutFinished", () => seen.push("onLayoutFinished"));
    engine.events.on("onSegmentationFinished", () =>
      seen.push("onSegmentationFinished")
    );
    engine.events.on("onClassificationFinished", () =>
      seen.push("onClassificationFinished")
    );
    engine.events.on("onPurchaseDraftCreated", () =>
      seen.push("onPurchaseDraftCreated")
    );
    engine.events.on("onValidationFinished", () =>
      seen.push("onValidationFinished")
    );
    engine.events.on("onCompleted", () => seen.push("onCompleted"));

    const result = await engine.analyze({ ocrText: ocr.rawText });

    expect(result.success).toBe(true);
    expect(seen).toEqual([
      "onOCRFinished",
      "onLayoutFinished",
      "onSegmentationFinished",
      "onClassificationFinished",
      "onPurchaseDraftCreated",
      "onValidationFinished",
      "onCompleted",
    ]);
  });
});
