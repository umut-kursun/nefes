import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsedReceiptToPurchaseDraft } from "../adapters/parsedReceiptToPurchaseDraft";
import {
  finalizeParsedReceipt,
  parseParsedReceiptJson,
} from "../types/ParsedReceipt";
import {
  inferReceiptItemUnit,
  reconcileParsedReceiptTotals,
  sanitizeHallucinatedQuantities,
  sumProductLineTotals,
} from "../vision/parsedReceiptReconcile";

const fixturePath = join(
  process.cwd(),
  "fixtures/vision/file-market-e-arsiv.json"
);

function loadFixture() {
  return finalizeParsedReceipt(
    parseParsedReceiptJson(JSON.parse(readFileSync(fixturePath, "utf8")))
  );
}

describe("inferReceiptItemUnit", () => {
  it("detects kg for weighted produce", () => {
    const parsed = loadFixture();
    const nektarin = parsed.products.find((p) => /NEKTARIN/i.test(p.name))!;
    expect(inferReceiptItemUnit(nektarin)).toBe("kg");
    const baget = parsed.products.find((p) => /BAGET/i.test(p.name))!;
    expect(inferReceiptItemUnit(baget)).toBe("ad");
  });
});

describe("sanitizeHallucinatedQuantities", () => {
  it("fixes COLA invented 10 ad × 6.50 → 1 ad × 55.00", () => {
    const fixed = sanitizeHallucinatedQuantities({
      name: "COLA TURKA 1,5 LT",
      quantity: 10,
      unit: "ad",
      unitPrice: 6.5,
      lineTotal: 55,
      vatRatePercentage: 10,
    });
    expect(fixed.quantity).toBe(1);
    expect(fixed.unitPrice).toBe(55);
    expect(fixed.lineTotal).toBe(55);
  });

  it("fixes DUŞ JELİ invented 20 ad × 7.20 → 1 ad × 144.00", () => {
    const fixed = sanitizeHallucinatedQuantities({
      name: "DUŞ JELİ FRESH DURU",
      quantity: 20,
      unit: "ad",
      unitPrice: 7.2,
      lineTotal: 144,
      vatRatePercentage: 20,
    });
    expect(fixed.quantity).toBe(1);
    expect(fixed.unitPrice).toBe(144);
    expect(fixed.lineTotal).toBe(144);
  });

  it("re-derives KARPUZ weight from lineTotal ÷ unitPrice", () => {
    const fixed = sanitizeHallucinatedQuantities({
      name: "ÇEKİRDEKSİZ KARPUZ",
      quantity: 10,
      unit: "kg",
      unitPrice: 19.5,
      lineTotal: 109.01,
      vatRatePercentage: 1,
    });
    expect(fixed.quantity).toBe(5.59);
    expect(fixed.unitPrice).toBe(19.5);
    expect(fixed.lineTotal).toBe(109.01);
  });
});

describe("reconcileParsedReceiptTotals", () => {
  it("keeps FİLE MARKET sum at exactly 817.02 without forcing adjustments", () => {
    const parsed = loadFixture();
    const reconciled = reconcileParsedReceiptTotals(parsed);
    expect(sumProductLineTotals(reconciled.products)).toBe(817.02);
    expect(reconciled.financials.totalAmount).toBe(817.02);
    expect(reconciled.mathConsistent).toBe(true);
  });

  it("does not mutate line totals to fix a grand-total mismatch", () => {
    const parsed = loadFixture();
    const broken = {
      ...parsed,
      products: parsed.products.filter((p) => !/KARPUZ|NEKTARIN/i.test(p.name)),
    };
    const reconciled = reconcileParsedReceiptTotals(broken);
    expect(reconciled.products.length).toBe(8);
    expect(reconciled.mathConsistent).toBe(false);
  });
});

describe("parsedReceiptToPurchaseDraft units", () => {
  it("maps kg/ad units on weighted vs piece items", async () => {
    const draft = await parsedReceiptToPurchaseDraft(loadFixture());
    const nektarin = draft.products.find((p) => /NEKTARIN/i.test(p.name));
    const baget = draft.products.find((p) => /BAGET/i.test(p.name));
    const karpuz = draft.products.find((p) => /KARPUZ/i.test(p.name));
    expect(nektarin?.unit).toBe("kg");
    expect(nektarin?.quantity).toBe(0.744);
    expect(karpuz?.quantity).toBe(5.59);
    expect(karpuz?.unitPrice).toBe(19.5);
    expect(baget?.unit).toBe("ad");
    expect(baget?.quantity).toBe(2);
    expect(baget?.lineTotal).toBe(75);
  });
});
