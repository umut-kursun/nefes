import { describe, expect, it } from "vitest";
import { purchaseDraftToExpenseDraft } from "@/lib/expense-factory";
import { emptyPurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";

function samplePurchase(): PurchaseDraft {
  return {
    ...emptyPurchaseDraft(),
    merchant: "MIGROS",
    purchaseDate: { raw: "24.07.2026", normalized: "2026-07-24" },
    purchaseTime: { raw: "14:30", normalized: "14:30" },
    currency: { raw: "TL", normalized: "TRY" },
    total: {
      label: "TOPLAM",
      amount: 61.4,
      confidence: 0.9,
      provenance: {
        footerBlockId: "footer:1",
        graphNodeIds: [],
        semanticKind: "total",
        confidence: 0.9,
      },
    },
    products: [
      {
        name: "Sut 1L",
        quantity: 1,
        unit: "adet",
        unitPrice: 45.9,
        lineTotal: 45.9,
        confidence: 0.85,
        provenance: {
          productBlockId: "p:1",
          graphNodeIds: ["n1"],
          layoutLineIndices: [2],
          rawTexts: ["Sut 1 L %1 45,90"],
          ocrTexts: ["Sut 1 L %1 45,90"],
          classificationRules: ["product"],
          confidence: 0.85,
        },
      },
      {
        name: "Ekmek",
        quantity: 1,
        lineTotal: 15.0,
        confidence: 0.8,
        provenance: {
          productBlockId: "p:2",
          graphNodeIds: ["n2"],
          layoutLineIndices: [3],
          rawTexts: ["Ekmek %1 15,00"],
          ocrTexts: ["Ekmek %1 15,00"],
          classificationRules: ["product"],
          confidence: 0.8,
        },
      },
    ],
    provenance: {
      metadataBlockId: "meta:1",
      footerBlockId: "footer:1",
      blockDocumentConfidence: 0.9,
      rawTexts: [
        "MIGROS A.S.",
        "Sut 1 L %1 45,90",
        "Ekmek %1 15,00",
        "TOPLAM 61,40",
      ],
    },
    confidence: 0.88,
  };
}

describe("purchaseDraftToExpenseDraft", () => {
  it("preserves OCR raw text on the expense and line items", () => {
    const expense = purchaseDraftToExpenseDraft(samplePurchase(), {
      imageDataUrl: "data:image/jpeg;base64,abc",
      ocrRawText: "FULL OCR\nLINE 2",
    });

    expect(expense.sourceType).toBe("receipt");
    expect(expense.rawText).toBe("FULL OCR\nLINE 2");
    expect(expense.merchantName).toBeTruthy();
    expect(expense.totalAmount).toBe(61.4);
    expect(expense.date).toBe("2026-07-24");
    expect(expense.time).toBe("14:30");
    expect(expense.imageDataUrl).toBe("data:image/jpeg;base64,abc");
    expect(expense.items).toHaveLength(2);
    expect(expense.items[0]?.rawText).toContain("Sut");
    expect(expense.items[1]?.rawText).toContain("Ekmek");
    expect(expense.aiResponseJson).toContain("MIGROS");
  });

  it("stores explicit parserJson when provided", () => {
    const expense = purchaseDraftToExpenseDraft(samplePurchase(), {
      parserJson: '{"ok":true}',
    });
    expect(expense.aiResponseJson).toBe('{"ok":true}');
  });

  it("falls back to purchase provenance rawTexts when ocrRawText omitted", () => {
    const expense = purchaseDraftToExpenseDraft(samplePurchase());
    expect(expense.rawText).toContain("MIGROS");
    expect(expense.rawText).toContain("TOPLAM");
  });
});
