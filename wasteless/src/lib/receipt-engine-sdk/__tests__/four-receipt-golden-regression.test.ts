/**
 * Run on every Vision/parser change — 4 golden receipts.
 *
 * Loads OCR golden fixtures and exercises each pipeline step explicitly:
 * coerceVisionOcrExtract → visionOcrToParsedReceipt → normalizeVisionReceipt
 * → finalizeVisionParsedReceipt → parsedReceiptToPurchaseDraft → validateReceiptTotal
 */
import { describe, expect, it } from "vitest";
import { validateReceiptTotal } from "@/lib/receipt-engine/layer-7-validate/validation/structural/receiptTotalValidator";
import { parsedReceiptToPurchaseDraft } from "../adapters/parsedReceiptToPurchaseDraft";
import { finalizeVisionParsedReceipt } from "../types/ParsedReceipt";
import { isStandaloneMultiplierProduct } from "../vision/mergeStandaloneMultiplierProducts";
import { normalizeVisionReceipt } from "../vision/normalizeVisionReceipt";
import { coerceVisionOcrExtract } from "../vision/visionOcrExtract";
import { visionOcrToParsedReceipt } from "../vision/visionOcrToParsedReceipt";
import {
  GOLDEN_OCR_CATALOG,
  loadGoldenOcrFixture,
  type GoldenOcrFixtureEntry,
} from "../../../../fixtures/vision/ocr-golden/catalog";

function runPipeline(entry: GoldenOcrFixtureEntry) {
  const raw = loadGoldenOcrFixture(entry);
  const extract = coerceVisionOcrExtract(raw);
  const parsed = visionOcrToParsedReceipt(extract);
  const normalized = normalizeVisionReceipt(parsed);
  const finalized = finalizeVisionParsedReceipt(normalized);
  return { extract, parsed, normalized, finalized };
}

describe.each(GOLDEN_OCR_CATALOG)("$id — $label", (entry) => {
  it("a) coerceVisionOcrExtract validates slim OCR schema", () => {
    const raw = loadGoldenOcrFixture(entry);
    const extract = coerceVisionOcrExtract(raw);

    expect(extract.merchant.title).toBeTruthy();
    expect(extract.productLines.length).toBeGreaterThan(0);
    expect(extract.footerLines.length).toBeGreaterThan(0);
    expect(extract.metadata.purchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    for (const line of extract.productLines) {
      expect(line.text.trim()).not.toBe("");
      expect(["product", "quantity", "discount", "charge", "component"]).toContain(
        line.kind
      );
    }
  });

  it("b) visionOcrToParsedReceipt produces ParsedReceipt without multiplier rows", () => {
    const { parsed } = runPipeline(entry);

    expect(parsed.products.length).toBeGreaterThan(0);
    expect(parsed.financials.totalAmount).toBeCloseTo(entry.expected.totalAmount, 2);

    for (const pattern of entry.expected.forbiddenProductPatterns) {
      expect(parsed.products.some((p) => pattern.test(p.name))).toBe(false);
    }

    if (entry.expected.discountCount != null) {
      expect(parsed.discounts?.length ?? 0).toBe(entry.expected.discountCount);
    }
  });

  it("c) normalizeVisionReceipt applies Migros rules and binds quantities", () => {
    const { normalized } = runPipeline(entry);

    expect(normalized.products.some((p) => isStandaloneMultiplierProduct(p))).toBe(
      false
    );

    for (const check of entry.expected.productChecks ?? []) {
      const product = normalized.products.find((p) =>
        p.name.includes(check.nameMatch)
      );
      expect(product, `missing product: ${check.nameMatch}`).toBeDefined();
      if (check.quantity != null) {
        expect(product!.quantity).toBe(check.quantity);
      }
      if (check.unitPrice != null) {
        expect(product!.unitPrice).toBeCloseTo(check.unitPrice, 2);
      }
      if (check.lineTotal != null) {
        expect(product!.lineTotal).toBeCloseTo(check.lineTotal, 2);
      }
    }

    if (entry.expected.bagCount != null) {
      const bags = normalized.products.filter((p) => /POSET|POŞET/i.test(p.name));
      expect(bags).toHaveLength(entry.expected.bagCount);
    }
  });

  it("d) finalizeVisionParsedReceipt reconciles math", () => {
    const { finalized } = runPipeline(entry);

    expect(finalized.financials.totalAmount).toBeCloseTo(entry.expected.totalAmount, 2);

    for (const key of entry.expected.keyProducts) {
      expect(
        finalized.products.some((p) => p.name.toUpperCase().includes(key.toUpperCase())),
        `expected product containing "${key}"`
      ).toBe(true);
    }

    if (entry.expected.minProductCount != null) {
      expect(finalized.products.length).toBeGreaterThanOrEqual(
        entry.expected.minProductCount
      );
    }
    if (entry.expected.maxProductCount != null) {
      expect(finalized.products.length).toBeLessThanOrEqual(
        entry.expected.maxProductCount
      );
    }
  });

  it("e) parsedReceiptToPurchaseDraft exports purchase draft", async () => {
    const { finalized } = runPipeline(entry);
    const purchase = await parsedReceiptToPurchaseDraft(finalized);

    expect(purchase.total?.amount).toBeCloseTo(entry.expected.totalAmount, 2);
    expect(purchase.products.length).toBeGreaterThan(0);
  });

  it("f) validateReceiptTotal — total must match expected", async () => {
    const { finalized } = runPipeline(entry);
    const purchase = await parsedReceiptToPurchaseDraft(finalized);
    const validation = validateReceiptTotal(purchase);

    expect(
      validation.issues.some((i) => i.code === "TOTAL_MISMATCH"),
      validation.issues.map((i) => i.message).join("; ")
    ).toBe(false);

    expect(purchase.total?.amount).toBeCloseTo(entry.expected.totalAmount, 2);
  });
});

describe("golden OCR catalog completeness", () => {
  it("includes all 4 receipt fixtures", () => {
    expect(GOLDEN_OCR_CATALOG).toHaveLength(4);
    expect(GOLDEN_OCR_CATALOG.map((e) => e.id)).toEqual([
      "migros-644",
      "migros-2125",
      "mcdonalds-1295",
      "birinci-profiterol-625",
    ]);
  });
});
