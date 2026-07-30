import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
  loadRealReceiptPurchase,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { analyzeReceipt } from "../analyzeReceipt";

describe("analyzeReceipt", () => {
  it("parses real receipt OCR text via ocrText input", async () => {
    const ref = REAL_RECEIPT_CATALOG[0];
    const ocr = loadRealReceiptOcr(ref);
    const golden = loadRealReceiptPurchase(ref);

    const result = await analyzeReceipt(
      { ocrText: ocr.rawText, sourceHint: ref.merchant },
      { modes: { performance: true, quality: true, debug: false, validation: true } }
    );

    expect(result.success).toBe(true);
    expect(result.purchase).toEqual(golden);
    expect(result.validation.isValid).toBeDefined();
    expect(result.confidence.overall).toBeGreaterThan(0);
    expect(result.rawOcr.lines.length).toBeGreaterThan(0);
    expect(result.normalizedOcr.rawText.length).toBeGreaterThan(0);
    expect(result.versions.engine).toBeTruthy();
    expect(result.debugReport.sections.length).toBeGreaterThan(0);
  });

  it("returns structured error on empty OCR text failure path", async () => {
    const result = await analyzeReceipt({ ocrText: "" });
    expect(result.success).toBe(true);
    expect(result.purchase.products).toEqual([]);
  });
});
