import { describe, expect, it } from "vitest";
import { formatCopyAllDebug } from "@/lib/receipt-engine-debug/formatCopyAllDebug";
import { emptyPurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { runReceiptEngineV2 } from "@/lib/receipt-engine-v2/engine/runReceiptEngineV2";
import { parseVisionResult } from "@/lib/receipt-engine-v2/vision/parseVisionResult";

describe("formatCopyAllDebug", () => {
  it("uses stage-oriented V2 report when engineResult is present", () => {
    const vision = parseVisionResult({
      rawText: "MIGROS\nEKMEK %1 15,00\nTOPLAM 15,00",
      lines: ["MIGROS", "EKMEK %1 15,00", "TOPLAM 15,00"],
      merchant: { rawName: "MIGROS" },
    });
    const engineResult = runReceiptEngineV2(vision);

    const bundle = formatCopyAllDebug({
      ocr: vision.rawText,
      purchase: emptyPurchaseDraft(),
      validation: {
        isValid: true,
        consistent: true,
        score: 100,
        errors: [],
        warnings: [],
        info: [],
      },
      engineResult,
    });

    expect(bundle).toContain("==================== TOKENIZER ====================");
    expect(bundle).toContain("==================== PARSED PRODUCTS ====================");
    expect(bundle).not.toContain("===== RAW VISION =====");
    expect(bundle).not.toContain('"ok": true');
  });

  it("falls back to compact legacy report without JSON dumps", () => {
    const bundle = formatCopyAllDebug({
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
      stageTimings: {
        openAiRequestMs: 5000,
        totalMs: 5200,
        engine: "v1",
      },
    });

    expect(bundle).toContain("==================== OCR ====================");
    expect(bundle).toContain("[00] LINE 1");
    expect(bundle).toContain("==================== PURCHASE ====================");
    expect(bundle).toContain("==================== VALIDATION ====================");
    expect(bundle).toContain("engine     : v1");
    expect(bundle).not.toContain("===== RECEIPT ENGINE RESULT =====");
    expect(bundle).not.toContain("{");
  });
});
