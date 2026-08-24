import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { purchaseDraftToExpenseDraft } from "@/lib/expense-factory";
import { parseVisionResult } from "@/lib/receipt-engine-v2/vision/parseVisionResult";
import { runReceiptEngineV2 } from "@/lib/receipt-engine-v2/engine/runReceiptEngineV2";
import {
  routeReceiptEngineAnalysis,
  v2PurchaseToPurchaseDraft,
} from "@/lib/receipt-engine-v2-integration";

const FIXTURE_OCR = readFileSync(
  join(
    process.cwd(),
    "src/lib/receipt-engine-v2/tests/golden/fixtures/cases/lezzet-restaurant/ocr.txt"
  ),
  "utf8"
);

const FIXTURE_LINES = FIXTURE_OCR.split(/\r?\n/).filter(Boolean);

const FIXTURE_VISION = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "src/lib/receipt-engine-v2/tests/golden/fixtures/cases/lezzet-restaurant/vision.json"
    ),
    "utf8"
  )
);

function buildFixtureVisionResult() {
  return parseVisionResult({
    ...FIXTURE_VISION,
    rawText: FIXTURE_LINES.join("\n"),
    lines: FIXTURE_LINES,
  });
}

vi.mock("@/lib/receipt-engine-v2/vision/openAiVisionOcrProvider", () => ({
  readReceiptWithVisionOcr: vi.fn(async () => {
    const result = buildFixtureVisionResult();
    return {
      result,
      rawVisionResponse: JSON.stringify(result),
      openAiRequestMs: 12,
      jsonParseMs: 1,
    };
  }),
}));

vi.mock("@/lib/receipt-engine-sdk", () => ({
  analyzeReceipt: vi.fn(async () => ({
    success: true,
    purchase: {
      merchant: "LEZZET RESTORAN A.S.",
      purchaseDate: { raw: "29.07.2026", normalized: "29.07.2026" },
      purchaseTime: null,
      receiptNumber: null,
      currency: { raw: "TRY", normalized: "TRY" },
      products: [
        {
          name: "Corba",
          quantity: 1,
          lineTotal: 85,
          vatRate: 10,
          confidence: 0.9,
          provenance: {
            productBlockId: "v1:0",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["Corba %10 85,00"],
            ocrTexts: ["Corba %10 85,00"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
      ],
      charges: [],
      discounts: [],
      payments: [{ label: "Nakit", amount: 405, confidence: 0.9, provenance: { footerBlockId: "f", graphNodeIds: [], semanticKind: "payment", confidence: 0.9 } }],
      vatSummary: [],
      subtotal: null,
      total: { label: "TOPLAM", amount: 405, confidence: 0.9, provenance: { footerBlockId: "f", graphNodeIds: [], semanticKind: "total", confidence: 0.9 } },
      confidence: 0.9,
      provenance: {
        metadataBlockId: "m",
        footerBlockId: "f",
        blockDocumentConfidence: 0.9,
        rawTexts: FIXTURE_LINES,
      },
    },
    validation: {
      isValid: true,
      consistent: true,
      score: 92,
      errors: [],
      warnings: [],
      info: [],
      confidenceAdjustment: 0,
      overallConfidence: 0.92,
      provenance: {
        purchaseConfidence: 0.9,
        structuralValidators: [],
        businessValidators: [],
        issueCount: 0,
      },
      blocking: false,
    },
    rawOcr: { rawText: FIXTURE_LINES.join("\n"), lines: FIXTURE_LINES },
    performance: { ocrMs: 20, engine: "v1" },
  })),
}));

describe("receipt engine production integration", () => {
  const originalFlag = process.env.USE_RECEIPT_ENGINE_V2;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.USE_RECEIPT_ENGINE_V2;
    } else {
      process.env.USE_RECEIPT_ENGINE_V2 = originalFlag;
    }
  });

  it("converts V2 purchase into expense draft for the UI flow", () => {
    const vision = buildFixtureVisionResult();
    const engineResult = runReceiptEngineV2(vision);
    const purchase = v2PurchaseToPurchaseDraft(engineResult.purchase, vision);
    const expense = purchaseDraftToExpenseDraft(purchase, {
      ocrRawText: vision.rawText,
      categories: [],
    });

    expect(purchase.merchant?.toLowerCase()).toContain("lezzet");
    expect(purchase.products).toHaveLength(2);
    expect(purchase.total?.amount).toBe(405);
    expect(expense.parseStatus).toBeUndefined();
    expect(expense.merchantName).toBeTruthy();
    expect(expense.totalAmount).toBe(405);
    expect(expense.items.length).toBeGreaterThan(0);
    expect(expense.payments.length).toBeGreaterThan(0);
  });

  it("routes through V1 when feature flag is disabled", async () => {
    delete process.env.USE_RECEIPT_ENGINE_V2;

    const result = await routeReceiptEngineAnalysis({
      imageDataUrl: "data:image/jpeg;base64,abc",
      apiKey: "test-key",
      sourceHint: "receipt",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.engineUsed).toBe("v1");
    expect(result.engineFallback).toBe(false);
    expect(result.purchase.merchant?.toLowerCase()).toContain("lezzet");
    expect(result.validation.isValid).toBe(true);

    const expense = purchaseDraftToExpenseDraft(result.purchase, {
      ocrRawText: result.ocrRawText,
      categories: [],
    });
    expect(expense.totalAmount).toBe(405);
  });

  it("routes through V2 when feature flag is enabled", async () => {
    process.env.USE_RECEIPT_ENGINE_V2 = "true";

    const result = await routeReceiptEngineAnalysis({
      imageDataUrl: "data:image/jpeg;base64,abc",
      apiKey: "test-key",
      sourceHint: "receipt",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.engineUsed).toBe("v2");
    expect(result.engineFallback).toBe(false);
    expect(result.performance.engine).toBe("v2");
    expect(result.purchase.products.length).toBe(2);
    expect(result.purchase.total?.amount).toBe(405);

    const expense = purchaseDraftToExpenseDraft(result.purchase, {
      ocrRawText: result.ocrRawText,
      categories: [],
    });
    expect(expense.totalAmount).toBe(405);
    expect(expense.items.length).toBe(2);
    expect(expense.merchantName.toLowerCase()).toContain("lezzet");
  });

  it("falls back to V1 when V2 throws", async () => {
    process.env.USE_RECEIPT_ENGINE_V2 = "true";

    const { readReceiptWithVisionOcr } = await import(
      "@/lib/receipt-engine-v2/vision/openAiVisionOcrProvider"
    );
    vi.mocked(readReceiptWithVisionOcr).mockRejectedValueOnce(
      new Error("Vision OCR unavailable")
    );

    const result = await routeReceiptEngineAnalysis({
      imageDataUrl: "data:image/jpeg;base64,abc",
      apiKey: "test-key",
      sourceHint: "receipt",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.engineUsed).toBe("v1");
    expect(result.engineFallback).toBe(true);

    const expense = purchaseDraftToExpenseDraft(result.purchase, {
      ocrRawText: result.ocrRawText,
      categories: [],
    });
    expect(expense.totalAmount).toBe(405);
  });
});
