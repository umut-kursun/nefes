import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import { emptyPurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import {
  FIXTURE_CATALOG,
  fixtureExpectedDir,
  loadFixturePurchase,
} from "@/lib/receipt-engine/fixtures/fixtureRegistry";

function stripPurchase(report: ReturnType<typeof buildValidationReport>) {
  return stripValidatedPurchase(report);
}

describe("Layer 7 — golden ValidationReport fixtures", () => {
  for (const ref of FIXTURE_CATALOG) {
    it(`matches golden validation for ${ref.category}/${ref.name}`, () => {
      const purchase = loadFixturePurchase(ref);
      const actual = stripPurchase(buildValidationReport(purchase));
      const goldenPath = path.join(
        fixtureExpectedDir(ref),
        `${ref.name}.validation.json`
      );
      const expected = JSON.parse(
        fs.readFileSync(goldenPath, "utf8")
      ) as typeof actual;
      expect(actual).toEqual(expected);
    });
  }
});

function draftWith(patch: Partial<PurchaseDraft>): PurchaseDraft {
  return { ...emptyPurchaseDraft(), ...patch };
}

describe("Layer 7 — structural validation scenarios", () => {
  it("flags incorrect totals", () => {
    const purchase = loadFixturePurchase({
      category: "supermarket",
      name: "with-bag",
    });
    const bad: PurchaseDraft = {
      ...purchase,
      total: purchase.total
        ? { ...purchase.total, amount: 999 }
        : null,
    };
    const report = buildValidationReport(bad);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.code === "TOTAL_MISMATCH")).toBe(true);
  });

  it("flags payment sum mismatch as warning when overpaid (cash change)", () => {
    const purchase = loadFixturePurchase({
      category: "multi-payment",
      name: "footer-payments",
    });
    const report = buildValidationReport(purchase);
    expect(report.warnings.some((e) => e.code === "PAYMENT_SUM_MISMATCH")).toBe(
      true
    );
  });

  it("flags missing payments only when payments absent and total exists", () => {
    const purchase = loadFixturePurchase({
      category: "supermarket",
      name: "with-bag",
    });
    const report = buildValidationReport(purchase);
    expect(report.errors.some((e) => e.code === "PAYMENT_SUM_MISMATCH")).toBe(
      false
    );
  });

  it("flags VAT summary exceeding total", () => {
    const base = loadFixturePurchase({
      category: "supermarket",
      name: "products-only",
    });
    const purchase: PurchaseDraft = {
      ...base,
      vatSummary: [
        {
          label: "KDV",
          amount: 999,
          confidence: 0.7,
          provenance: {
            footerBlockId: "footer:test",
            graphNodeIds: ["amt:test"],
            semanticKind: "vat_summary",
            confidence: 0.7,
          },
        },
      ],
    };
    const report = buildValidationReport(purchase);
    expect(report.errors.some((e) => e.code === "VAT_EXCEEDS_TOTAL")).toBe(true);
  });

  it("flags invalid quantity", () => {
    const base = loadFixturePurchase({
      category: "supermarket",
      name: "with-bag",
    });
    const products = base.products.map((p, i) =>
      i === 0 ? { ...p, quantity: -1 } : p
    );
    const report = buildValidationReport({ ...base, products });
    expect(report.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(true);
  });

  it("flags positive discount", () => {
    const base = loadFixturePurchase({
      category: "supermarket",
      name: "with-bag",
    });
    const report = buildValidationReport({
      ...base,
      discounts: [
        {
          label: "Indirim",
          amount: 5,
          confidence: 0.7,
          provenance: {
            footerBlockId: "footer:test",
            graphNodeIds: ["amt:test"],
            semanticKind: "discount",
            confidence: 0.7,
          },
        },
      ],
    });
    expect(report.errors.some((e) => e.code === "POSITIVE_DISCOUNT")).toBe(true);
  });
});

describe("Layer 7 — business validation scenarios", () => {
  it("warns on missing merchant", () => {
    const report = buildValidationReport(
      draftWith({
        products: loadFixturePurchase({
          category: "supermarket",
          name: "with-bag",
        }).products,
        total: loadFixturePurchase({
          category: "supermarket",
          name: "with-bag",
        }).total,
      })
    );
    expect(report.warnings.some((e) => e.code === "MERCHANT_MISSING")).toBe(true);
  });

  it("warns on missing date", () => {
    const purchase = loadFixturePurchase({
      category: "supermarket",
      name: "with-bag",
    });
    const report = buildValidationReport(purchase);
    expect(report.warnings.some((e) => e.code === "DATE_MISSING")).toBe(true);
  });

  it("warns on unknown currency", () => {
    const report = buildValidationReport(
      draftWith({
        currency: { raw: "FOO" },
      })
    );
    expect(report.warnings.some((e) => e.code === "CURRENCY_UNKNOWN")).toBe(true);
  });

  it("warns on duplicate payment labels", () => {
    const base = loadFixturePurchase({
      category: "multi-payment",
      name: "footer-payments",
    });
    const report = buildValidationReport({
      ...base,
      payments: [
        base.payments[0]!,
        { ...base.payments[0]!, label: "Nakit" },
      ],
    });
    expect(report.warnings.some((e) => e.code === "DUPLICATE_PAYMENT")).toBe(
      true
    );
  });

  it("does not mutate PurchaseDraft", () => {
    const purchase = loadFixturePurchase({
      category: "supermarket",
      name: "with-bag",
    });
    const before = JSON.stringify(purchase);
    buildValidationReport(purchase);
    expect(JSON.stringify(purchase)).toBe(before);
  });
});

describe("Layer 7 — debug and wiring", () => {
  it("exposes inspectValidation and formatValidationDebug", async () => {
    const purchase = loadFixturePurchase({
      category: "supermarket",
      name: "with-bag",
    });
    const report = buildValidationReport(purchase);
    const { inspectValidation, formatValidationDebug, validationReportToJson } =
      await import("@/lib/receipt-engine");
    const issue = report.warnings[0] ?? report.info[0];
    if (issue) {
      expect(inspectValidation(report, issue.id)?.issue.code).toBe(issue.code);
    }
    expect(formatValidationDebug(report)).toContain("ValidationReport");
    expect(validationReportToJson(report)).toContain("validatedPurchaseRef");
  });

  it("layer7Validate produces no LAYER_NOT_IMPLEMENTED issue", async () => {
    const { layer7Validate, createEngineDependencies, resolveEngineConfig } =
      await import("@/lib/receipt-engine");
    const purchase = loadFixturePurchase({
      category: "supermarket",
      name: "with-bag",
    });
    const result = await layer7Validate.run(purchase, {
      deps: createEngineDependencies({ config: resolveEngineConfig({}) }),
      config: resolveEngineConfig({}),
    });
    expect(result.issues).toEqual([]);
    expect(result.output.score).toBeGreaterThan(0);
  });
});
