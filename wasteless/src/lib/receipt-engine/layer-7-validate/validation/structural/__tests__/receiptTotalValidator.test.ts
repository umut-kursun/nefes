import { describe, expect, it } from "vitest";
import type { PurchaseDraft } from "../../../types/models/purchase";
import { validateReceiptTotal } from "../receiptTotalValidator";

function minimalPurchase(
  overrides: Partial<PurchaseDraft> = {}
): PurchaseDraft {
  return {
    merchant: "MIGROS",
    purchaseDate: { raw: "2026-07-15", normalized: "2026-07-15" },
    purchaseTime: null,
    receiptNumber: null,
    currency: { raw: "TRY", normalized: "TRY" },
    products: [
      {
        name: "ÜRÜN",
        quantity: 1,
        unit: "ad",
        unitPrice: 100,
        lineTotal: 100,
        confidence: 0.9,
        provenance: {
          productBlockId: "p:0",
          graphNodeIds: [],
          layoutLineIndices: [],
          rawTexts: ["ÜRÜN"],
          ocrTexts: ["ÜRÜN"],
          classificationRules: [],
          confidence: 0.9,
        },
      },
    ],
    charges: [],
    discounts: [],
    payments: [],
    vatSummary: [],
    subtotal: null,
    total: {
      label: "TOPLAM",
      amount: 100,
      confidence: 0.9,
      provenance: {
        footerBlockId: "footer",
        graphNodeIds: [],
        semanticKind: "total",
        confidence: 0.9,
      },
    },
    confidence: 0.9,
    fuel: null,
    provenance: {
      metadataBlockId: "meta",
      footerBlockId: "footer",
      blockDocumentConfidence: 0.9,
      rawTexts: [],
    },
    ...overrides,
  };
}

describe("validateReceiptTotal diagnostics", () => {
  it("reports duplicate discount as root cause", () => {
    const purchase = minimalPurchase({
      total: {
        label: "TOPLAM",
        amount: 42.51,
        confidence: 0.9,
        provenance: {
          footerBlockId: "footer",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      discounts: [
        {
          label: "% 25 % İNDİRİM",
          amount: -57.49,
          confidence: 0.9,
          provenance: {
            footerBlockId: "footer",
            graphNodeIds: [],
            semanticKind: "discount",
            confidence: 0.9,
          },
        },
        {
          label: "% 25 % İNDİRİM",
          amount: -57.49,
          confidence: 0.9,
          provenance: {
            footerBlockId: "footer",
            graphNodeIds: [],
            semanticKind: "discount",
            confidence: 0.9,
          },
        },
      ],
    });

    const result = validateReceiptTotal(purchase);
    expect(result.issues.some((i) => i.code === "DUPLICATE_DISCOUNT")).toBe(true);
    const issue = result.issues.find((i) => i.code === "DUPLICATE_DISCOUNT");
    expect(issue?.message).toMatch(/indirim/i);
    expect(issue?.suggestedFix).toBeTruthy();
  });

  it("reports product alignment when qty × unitPrice ≠ lineTotal", () => {
    const purchase = minimalPurchase({
      products: [
        {
          name: "SOFRA EKMEK",
          quantity: 3,
          unit: "ad",
          unitPrice: 25.9,
          lineTotal: 149.95,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:0",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["SOFRA EKMEK"],
            ocrTexts: ["SOFRA EKMEK"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
      ],
      total: {
        label: "TOPLAM",
        amount: 149.95,
        confidence: 0.9,
        provenance: {
          footerBlockId: "footer",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
    });

    const result = validateReceiptTotal(purchase);
    expect(result.issues.some((i) => i.code === "PRODUCT_ALIGNMENT")).toBe(true);
  });
});
