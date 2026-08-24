import { describe, expect, it } from "vitest";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { validateSemanticIntegrity } from "../semanticIntegrityValidator";

function minimalPurchase(overrides: Partial<PurchaseDraft> = {}): PurchaseDraft {
  return {
    merchant: "Test Merchant",
    purchaseDate: { raw: "2026-08-01", normalized: "2026-08-01" },
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
          rawTexts: ["ÜRÜN *100,00"],
          ocrTexts: ["ÜRÜN *100,00"],
          classificationRules: ["semantic:product-line"],
          confidence: 0.9,
        },
      },
    ],
    charges: [],
    discounts: [],
    payments: [
      {
        label: "cash",
        amount: 100,
        confidence: 0.9,
        provenance: {
          footerBlockId: "footer",
          graphNodeIds: [],
          semanticKind: "payment",
          confidence: 0.9,
        },
      },
    ],
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
    ...overrides,
  } as PurchaseDraft;
}

describe("SemanticIntegrityValidator", () => {
  it("flags polluted product names as ERROR", () => {
    const purchase = minimalPurchase({
      products: [
        {
          name: "BODRUM/MUĞLA",
          quantity: 1,
          unit: "ad",
          unitPrice: 365,
          lineTotal: 365,
          confidence: 0.5,
          provenance: {
            productBlockId: "p:0",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["BODRUM/MUĞLA"],
            ocrTexts: ["BODRUM/MUĞLA"],
            classificationRules: ["semantic:product-line"],
            confidence: 0.5,
          },
        },
      ],
      total: {
        label: "TOPLAM",
        amount: 365,
        confidence: 0.9,
        provenance: {
          footerBlockId: "footer",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      payments: [
        {
          label: "card",
          amount: 365,
          confidence: 0.9,
          provenance: {
            footerBlockId: "footer",
            graphNodeIds: [],
            semanticKind: "payment",
            confidence: 0.9,
          },
        },
      ],
    });
    const result = validateSemanticIntegrity(purchase);
    expect(result.issues.some((i) => i.code === "SEMANTIC_PRODUCT_POLLUTION")).toBe(true);
    expect(buildValidationReport(purchase).analysisStatus).toBe("needs_review");
  });

  it("flags VAT token and bare amount product names", () => {
    for (const name of ["%20", "*215,00"]) {
      const purchase = minimalPurchase({
        products: [
          {
            name,
            quantity: 1,
            unit: "ad",
            unitPrice: 100,
            lineTotal: 100,
            confidence: 0.5,
            provenance: {
              productBlockId: "p:0",
              graphNodeIds: [],
              layoutLineIndices: [],
              rawTexts: [name],
              ocrTexts: [name],
              classificationRules: ["semantic:product-line"],
              confidence: 0.5,
            },
          },
        ],
      });
      const result = validateSemanticIntegrity(purchase);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(buildValidationReport(purchase).analysisStatus).not.toBe("approved");
    }
  });

  it("flags category subtotal when other products exist", () => {
    const purchase = minimalPurchase({
      total: {
        label: "TOPLAM",
        amount: 280,
        confidence: 0.9,
        provenance: {
          footerBlockId: "footer",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      payments: [
        {
          label: "card",
          amount: 280,
          confidence: 0.9,
          provenance: {
            footerBlockId: "footer",
            graphNodeIds: [],
            semanticKind: "payment",
            confidence: 0.9,
          },
        },
      ],
      products: [
        {
          name: "Akali Burger",
          quantity: 1,
          unit: "ad",
          unitPrice: 185,
          lineTotal: 185,
          confidence: 0.8,
          provenance: {
            productBlockId: "p:0",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["Akali Burger"],
            ocrTexts: ["Akali Burger"],
            classificationRules: ["semantic:product-line"],
            confidence: 0.8,
          },
        },
        {
          name: "YİYECEK",
          quantity: 1,
          unit: "ad",
          unitPrice: 95,
          lineTotal: 95,
          confidence: 0.8,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["YİYECEK"],
            ocrTexts: ["YİYECEK"],
            classificationRules: ["semantic:product-line"],
            confidence: 0.8,
          },
        },
      ],
    });
    const result = validateSemanticIntegrity(purchase);
    expect(result.issues.some((i) => i.code === "SEMANTIC_CATEGORY_SUBTOTAL_AS_PRODUCT")).toBe(
      true
    );
  });

  it("allows clean priced products when totals reconcile", () => {
    const purchase = minimalPurchase({
      products: [
        {
          name: "Espresso Double",
          quantity: 1,
          unit: "ad",
          unitPrice: 365,
          lineTotal: 365,
          confidence: 0.85,
          provenance: {
            productBlockId: "p:0",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["Espresso Double *365,00"],
            ocrTexts: ["Espresso Double *365,00"],
            classificationRules: ["semantic:product-line"],
            confidence: 0.85,
          },
        },
      ],
      total: {
        label: "TOPLAM",
        amount: 365,
        confidence: 0.9,
        provenance: {
          footerBlockId: "footer",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      payments: [
        {
          label: "card",
          amount: 365,
          confidence: 0.9,
          provenance: {
            footerBlockId: "footer",
            graphNodeIds: [],
            semanticKind: "payment",
            confidence: 0.9,
          },
        },
      ],
    });
    const report = buildValidationReport(purchase);
    expect(report.errors.filter((e) => e.code.startsWith("SEMANTIC_"))).toHaveLength(0);
  });
});
