import { describe, expect, it } from "vitest";
import { formatCopyAllDebug } from "@/lib/receipt-engine-debug/formatCopyAllDebug";
import { emptyPurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";

describe("formatCopyAllDebug", () => {
  it("includes all sections in order with plain-text headers", () => {
    const rawVision = '  {"merchant":"X"}  \n';
    const bundle = formatCopyAllDebug({
      rawVision,
      ocr: "LINE 1\nLINE 2",
      purchase: emptyPurchaseDraft(),
      validation: {
        isValid: true,
        consistent: true,
        score: 100,
        errors: [],
        warnings: [],
        info: [],
      },
      analyzeResult: { ok: true },
    });

    expect(bundle.indexOf("===== RAW VISION =====")).toBeLessThan(
      bundle.indexOf("===== OCR =====")
    );
    expect(bundle.indexOf("===== OCR =====")).toBeLessThan(
      bundle.indexOf("===== PARSER JSON =====")
    );
    expect(bundle.indexOf("===== PARSER JSON =====")).toBeLessThan(
      bundle.indexOf("===== PURCHASE DRAFT =====")
    );
    expect(bundle.indexOf("===== PURCHASE DRAFT =====")).toBeLessThan(
      bundle.indexOf("===== VALIDATION =====")
    );
    expect(bundle.indexOf("===== VALIDATION =====")).toBeLessThan(
      bundle.indexOf("===== RECEIPT ENGINE RESULT =====")
    );
    expect(bundle).toContain(rawVision);
    expect(bundle).toContain('"ok": true');
  });
});
