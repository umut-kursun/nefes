import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import {
  isReconciliationEligibleProduct,
  reconciliationProducts,
} from "@/lib/receipt-engine/layer-7-validate/validation/reconciliationProducts";

const BASELINE = path.join(process.cwd(), "baselines", "corpus-v0", "receipts");

function loadPurchase(id: string): PurchaseDraft {
  return JSON.parse(
    fs.readFileSync(path.join(BASELINE, id, "purchase-draft.json"), "utf8")
  ) as PurchaseDraft;
}

describe("Step 1.5 — reconciliation product selection", () => {
  it("I — Özyıldız: excludes duplicate fuel-merge merchant row from reconciliation sum", () => {
    const purchase = loadPurchase("I");
    const eligible = reconciliationProducts(purchase);

    expect(eligible.some((p) => p.name.includes("MOTOR"))).toBe(true);
    expect(
      eligible.some(
        (p) =>
          p.name.includes("ÖZYILDIZ") &&
          p.provenance.classificationRules?.[0] === "semantic:fuel-merge"
      )
    ).toBe(false);

    const eligibleSum = eligible.reduce((s, p) => s + (p.lineTotal ?? 0), 0);
    expect(eligibleSum).toBe(1000);
    expect(purchase.total?.amount).toBe(1000);
  });

  it("I — Özyıldız: approves after excluding noisy duplicate lines", () => {
    const purchase = loadPurchase("I");
    const report = buildValidationReport(purchase);

    expect(report.errors.some((e) => e.code === "MISSING_CHARGE")).toBe(false);
    expect(report.errors.some((e) => e.code === "TOTAL_MISMATCH")).toBe(false);
    expect(report.consistent).toBe(true);
    expect(report.analysisStatus).toBe("approved");
    expect(report.isValid).toBe(true);
  });

  it("I — fuel line qty×unit price reconciles with total under commercial rounding", () => {
    const purchase = loadPurchase("I");
    const fuelLine =
      reconciliationProducts(purchase).find((p) => /MOTOR/i.test(p.name)) ??
      purchase.products.find((p) => p.provenance.classificationRules?.[0] === "semantic:fuel-merge");

    expect(fuelLine).toBeDefined();
    expect(purchase.fuel?.liters).toBeCloseTo(12.5, 2);
    expect(purchase.fuel?.pricePerLiter).toBeCloseTo(79.99, 2);

    const fuelMerge = purchase.products.find(
      (p) => p.provenance.classificationRules?.[0] === "semantic:fuel-merge"
    );
    if (fuelMerge?.quantity != null && fuelMerge.unitPrice != null) {
      expect(fuelMerge.quantity * fuelMerge.unitPrice).toBeCloseTo(999.875, 2);
    }
  });

  it("excludes metadata name-only product rows from reconciliation", () => {
    const purchase = loadPurchase("I");
    const tel = purchase.products.find((p) => p.name.startsWith("TEL:"));
    expect(tel).toBeDefined();
    expect(isReconciliationEligibleProduct(tel!, purchase)).toBe(false);
  });
});

describe("Step 1.5 — needs_review classification A/B/C (baseline drafts)", () => {
  it("A — justified needs_review (payment incoherence / total mismatch)", () => {
    const report = buildValidationReport(loadPurchase("A"));
    expect(report.analysisStatus).toBe("needs_review");
    expect(
      report.errors.some((e) =>
        ["PAYMENT_TOTAL_INCOHERENT", "TOTAL_MISMATCH", "MISSING_CHARGE"].includes(
          e.code
        )
      )
    ).toBe(true);
  });

  it("B — justified needs_review (product sum ≠ total)", () => {
    const report = buildValidationReport(loadPurchase("B"));
    expect(report.analysisStatus).toBe("needs_review");
    expect(
      report.errors.some((e) =>
        ["TOTAL_MISMATCH", "MISSING_CHARGE", "PRODUCT_ALIGNMENT"].includes(e.code)
      )
    ).toBe(true);
  });

  it("C — justified needs_review (reconciliation uncertain)", () => {
    const report = buildValidationReport(loadPurchase("C"));
    expect(report.analysisStatus).toBe("needs_review");
    expect(report.errors.length).toBeGreaterThan(0);
  });
});

describe("Step 1.5 — approved receipts stay approved (baseline drafts)", () => {
  for (const id of ["D", "E", "G", "H"] as const) {
    it(`${id} remains approved`, () => {
      const report = buildValidationReport(loadPurchase(id));
      expect(report.analysisStatus).toBe("approved");
      expect(report.isValid).toBe(true);
    });
  }

  it("F — single-line fuel purchase (V1-style) remains approved", () => {
    const purchase = loadPurchase("F");
    const singleLine: PurchaseDraft = {
      ...purchase,
      products: [
        {
          name: "30,800 LT V/MAX DIESEL",
          quantity: 30.8,
          unit: "LT",
          unitPrice: 71.45,
          lineTotal: 2200.66,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:0",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["30,800 LT V/MAX DIESEL"],
            ocrTexts: ["30,800 LT V/MAX DIESEL"],
            classificationRules: ["semantic:product-line"],
            confidence: 0.9,
          },
        },
      ],
      fuel: {
        fuelType: "Diesel",
        liters: 30.8,
        pricePerLiter: 71.45,
        plateNumber: "34",
        stationName: "Petrol Ofisi",
      },
    };
    const report = buildValidationReport(singleLine);
    expect(report.analysisStatus).toBe("approved");
  });
});
