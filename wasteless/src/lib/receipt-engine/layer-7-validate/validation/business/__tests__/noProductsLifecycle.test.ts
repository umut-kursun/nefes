import { describe, expect, it } from "vitest";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";

function purchaseWithTotalOnly(total: number): PurchaseDraft {
  return {
    merchant: null,
    purchaseDate: null,
    purchaseTime: null,
    receiptNumber: null,
    currency: { raw: "TRY", normalized: "TRY" },
    products: [],
    charges: [],
    discounts: [],
    payments: [],
    vatSummary: [],
    subtotal: null,
    total: {
      label: "TOPLAM",
      amount: total,
      confidence: 0.9,
      provenance: {
        footerBlockId: "footer",
        graphNodeIds: [],
        semanticKind: "total",
        confidence: 0.9,
      },
    },
    confidence: 0.7,
    fuel: null,
  } as PurchaseDraft;
}

describe("NO_PRODUCTS lifecycle (Phase 1.5)", () => {
  it("valid total with empty products → needs_review, not failed", () => {
    const report = buildValidationReport(purchaseWithTotalOnly(477.9));
    expect(report.errors.some((e) => e.code === "NO_PRODUCTS")).toBe(true);
    expect(report.errors.find((e) => e.code === "NO_PRODUCTS")?.severity).toBe(
      "ERROR"
    );
    expect(report.analysisStatus).toBe("needs_review");
  });

  it("no total and no products → failed", () => {
    const purchase = { ...purchaseWithTotalOnly(0), total: undefined } as PurchaseDraft;
    const report = buildValidationReport(purchase);
    expect(report.errors.find((e) => e.code === "NO_PRODUCTS")?.severity).toBe(
      "CRITICAL"
    );
    expect(report.analysisStatus).toBe("failed");
  });

  it("does not approve incomplete product extraction", () => {
    const report = buildValidationReport(purchaseWithTotalOnly(2200.66));
    expect(report.analysisStatus).not.toBe("approved");
    expect(report.isValid).toBe(false);
  });
});
