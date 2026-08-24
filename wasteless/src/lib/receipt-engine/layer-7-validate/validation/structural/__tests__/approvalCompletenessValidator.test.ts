import { describe, expect, it } from "vitest";
import type { PurchaseDraft } from "../../../../types/models/purchase";
import { buildValidationReport } from "../../../buildValidationReport";
import { validateApprovalCompleteness } from "../approvalCompletenessValidator";

function minimalPurchase(
  overrides: Partial<PurchaseDraft> = {}
): PurchaseDraft {
  return {
    merchant: "TEST",
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
      rawTexts: ["TOPKDV", "ORTAK POS", "KREDİ KARTI"],
    },
    ...overrides,
  };
}

describe("validateApprovalCompleteness — expense-first policy", () => {
  it("approves reconciled expense data without payment or VAT metadata", () => {
    const purchase = minimalPurchase();
    const result = validateApprovalCompleteness(purchase);
    expect(result.issues).toHaveLength(0);

    const report = buildValidationReport(purchase);
    expect(report.analysisStatus).toBe("approved");
  });

  it("does not error when OCR shows payment section but payments are empty", () => {
    const purchase = minimalPurchase({
      payments: [],
      provenance: {
        metadataBlockId: "meta",
        footerBlockId: "footer",
        blockDocumentConfidence: 0.9,
        rawTexts: ["ORTAK POS", "454360******4421", "TOPKDV *10,00"],
      },
    });
    const result = validateApprovalCompleteness(purchase);
    expect(result.issues.some((i) => i.code.includes("PAYMENT"))).toBe(false);
    expect(result.issues.some((i) => i.code.includes("VAT"))).toBe(false);
  });

  it("allows metadata lines without prices when purchased items have line totals", () => {
    const purchase = minimalPurchase({
      products: [
        {
          name: "MERCHANT HEADER",
          quantity: 1,
          lineTotal: undefined,
          confidence: 0.7,
          provenance: {
            productBlockId: "p:0",
            graphNodeIds: [],
            layoutLineIndices: [0],
            rawTexts: ["MERCHANT HEADER"],
            ocrTexts: ["MERCHANT HEADER"],
            classificationRules: [],
            confidence: 0.7,
          },
        },
        {
          name: "Burger",
          quantity: 1,
          unitPrice: 1049,
          lineTotal: 1049,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [2],
            rawTexts: ["Burger *1049,00"],
            ocrTexts: ["Burger *1049,00"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
      ],
      total: {
        label: "TOPLAM",
        amount: 1049,
        confidence: 0.9,
        provenance: {
          footerBlockId: "footer",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
    });
    const result = validateApprovalCompleteness(purchase);
    expect(result.issues.some((i) => i.code === "APPROVAL_PRODUCT_PRICE_MISSING")).toBe(
      false
    );
  });

  it("blocks approval when meaningful products lack line totals", () => {
    const purchase = minimalPurchase({
      products: [
        {
          name: "COCA-COLA",
          quantity: 1,
          lineTotal: undefined,
          confidence: 0.7,
          provenance: {
            productBlockId: "p:0",
            graphNodeIds: [],
            layoutLineIndices: [10],
            rawTexts: ["COCA-COLA 1.5 L"],
            ocrTexts: ["COCA-COLA 1.5 L"],
            classificationRules: [],
            confidence: 0.7,
          },
        },
      ],
    });
    const result = validateApprovalCompleteness(purchase);
    expect(result.issues.some((i) => i.code === "APPROVAL_PRODUCT_PRICE_MISSING")).toBe(
      true
    );
    expect(buildValidationReport(purchase).analysisStatus).toBe("needs_review");
  });

  it("blocks approval when total is missing", () => {
    const purchase = minimalPurchase({ total: null });
    const result = validateApprovalCompleteness(purchase);
    expect(result.issues.some((i) => i.code === "APPROVAL_TOTAL_MISSING")).toBe(true);
  });

  it("requires fuel type and quantity on fuel receipts", () => {
    const purchase = minimalPurchase({
      fuel: {
        fuelType: null,
        liters: null,
        unitPrice: null,
        plate: null,
        confidence: 0.8,
        provenance: {
          footerBlockId: "fuel",
          graphNodeIds: [],
          semanticKind: "charge",
          confidence: 0.8,
        },
      },
    });
    const result = validateApprovalCompleteness(purchase);
    expect(result.issues.some((i) => i.code === "APPROVAL_FUEL_TYPE_MISSING")).toBe(
      true
    );
    expect(result.issues.some((i) => i.code === "APPROVAL_FUEL_QTY_MISSING")).toBe(
      true
    );
  });
});

describe("validateApprovalCompleteness — payment contradiction via FinancialSafety", () => {
  it("needs_review when extracted payments contradict total (not missing payment)", () => {
    const purchase = minimalPurchase({
      total: {
        label: "TOPLAM",
        amount: 477.9,
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
          label: "NAKIT",
          method: null,
          amount: 20,
          confidence: 0.5,
          provenance: {
            footerBlockId: "footer",
            graphNodeIds: [],
            semanticKind: "payment",
            confidence: 0.5,
          },
        },
        {
          label: "TOPLAM",
          method: null,
          amount: 477.9,
          confidence: 0.5,
          provenance: {
            footerBlockId: "footer",
            graphNodeIds: [],
            semanticKind: "payment",
            confidence: 0.5,
          },
        },
      ],
    });
    const report = buildValidationReport(purchase);
    expect(report.analysisStatus).toBe("needs_review");
    expect(report.errors.some((e) => e.code === "PAYMENT_TOTAL_INCOHERENT")).toBe(true);
    expect(
      report.errors.some((e) => e.code === "APPROVAL_PAYMENT_MISSING")
    ).toBe(false);
  });
});
