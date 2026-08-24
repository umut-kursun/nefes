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

function normalizeMerchantTitle(title: string): string {
  return title
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .toLocaleUpperCase("en-US")
    .replace(/\s+/g, " ")
    .trim();
}

function assertProductChecks(
  products: readonly { name: string; quantity?: number; unitPrice?: number; lineTotal: number }[],
  checks: GoldenOcrFixtureEntry["expected"]["productChecks"]
) {
  for (const check of checks ?? []) {
    const product = products.find((p) => p.name.includes(check.nameMatch));
    expect(product, `missing product: ${check.nameMatch}`).toBeDefined();
    if (check.quantity != null) {
      expect(product!.quantity).toBeCloseTo(check.quantity, 2);
    }
    if (check.unitPrice != null) {
      expect(product!.unitPrice).toBeCloseTo(check.unitPrice, 2);
    }
    if (check.lineTotal != null) {
      expect(product!.lineTotal).toBeCloseTo(check.lineTotal, 2);
    }
  }
}

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

    expect(
      normalizeMerchantTitle(extract.merchant.title)
    ).toBe(normalizeMerchantTitle(entry.expected.merchantTitle));
    expect(extract.merchant.category).toBe(entry.expected.merchantCategory);
    expect(extract.metadata.purchaseDate).toBe(entry.expected.purchaseDate);
    expect(extract.productLines.length).toBeGreaterThan(0);
    expect(extract.footerLines.length).toBeGreaterThan(0);

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
    expect(parsed.metadata.purchaseDate).toBe(entry.expected.purchaseDate);
    expect(parsed.financials.totalAmount).toBeCloseTo(entry.expected.totalAmount, 2);
    expect(
      normalizeMerchantTitle(parsed.merchant.title)
    ).toBe(normalizeMerchantTitle(entry.expected.merchantTitle));
    expect(parsed.merchant.category).toBe(entry.expected.merchantCategory);

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
    assertProductChecks(normalized.products, entry.expected.productChecks);

    if (entry.expected.bagCount != null) {
      const bags = normalized.products.filter((p) => /POSET|POŞET/i.test(p.name));
      expect(bags).toHaveLength(entry.expected.bagCount);
    }
  });

  it("d) finalizeVisionParsedReceipt reconciles math", () => {
    const { finalized } = runPipeline(entry);

    expect(finalized.financials.totalAmount).toBeCloseTo(entry.expected.totalAmount, 2);
    expect(finalized.metadata.purchaseDate).toBe(entry.expected.purchaseDate);
    expect(
      normalizeMerchantTitle(finalized.merchant.title)
    ).toBe(normalizeMerchantTitle(entry.expected.merchantTitle));
    expect(finalized.merchant.category).toBe(entry.expected.merchantCategory);

    for (const key of entry.expected.keyProducts) {
      expect(
        finalized.products.some((p) => p.name.toUpperCase().includes(key.toUpperCase())),
        `expected product containing "${key}"`
      ).toBe(true);
    }

    assertProductChecks(finalized.products, entry.expected.productChecks);

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

    if (entry.expected.discountCount != null) {
      expect(finalized.discounts?.length ?? 0).toBe(entry.expected.discountCount);
    }

    if (entry.expected.paymentAmount != null) {
      const paymentTotal = (finalized.payments ?? []).reduce(
        (sum, p) => sum + p.amount,
        0
      );
      expect(paymentTotal).toBeCloseTo(entry.expected.paymentAmount, 2);
    }
  });

  it("e) parsedReceiptToPurchaseDraft exports purchase draft", async () => {
    const { finalized } = runPipeline(entry);
    const purchase = await parsedReceiptToPurchaseDraft(finalized);

    expect(purchase.total?.amount).toBeCloseTo(entry.expected.totalAmount, 2);
    expect(purchase.products.length).toBeGreaterThan(0);
    expect(
      normalizeMerchantTitle(purchase.merchant ?? "")
    ).toContain(normalizeMerchantTitle(entry.expected.merchantTitle.split(" ")[0]!));
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
