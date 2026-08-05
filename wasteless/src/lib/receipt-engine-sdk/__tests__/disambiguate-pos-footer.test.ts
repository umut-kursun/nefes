import { describe, expect, it } from "vitest";
import {
  disambiguatePosFooter,
  isMisclassifiedFooterProduct,
} from "../vision/disambiguatePosFooter";
import { finalizeParsedReceipt, type ParsedReceipt } from "../types/ParsedReceipt";

const birinciRawText = `
TATLI %10 *625,00
TOPKDV *56,82
TOPLAM *625,00
Kredi Kartı *625,00
`.trim();

describe("disambiguatePosFooter (OCR fallback path)", () => {
  it("fixes TOPKDV mistaken as payment on Birinci Profiterol receipt", () => {
    const parsed: ParsedReceipt = {
      merchant: { title: "BİRİNCİ PROFİTEROL", category: "RESTAURANT" },
      metadata: { purchaseDate: "2026-07-30", currency: "TRY" },
      products: [
        {
          name: "TATLI",
          quantity: 1,
          unit: "ad",
          unitPrice: 625,
          lineTotal: 625,
        },
      ],
      discounts: [],
      payments: [{ type: "CREDIT_CARD", amount: 56.82 }],
      financials: { vatTotal: null, totalAmount: 56.82 },
      rawText: birinciRawText,
    };

    const fixed = disambiguatePosFooter(parsed);
    expect(fixed.financials.totalAmount).toBe(625);
    expect(fixed.payments[0]!.amount).toBe(625);
    expect(fixed.financials.vatTotal).toBeCloseTo(56.82, 2);
    expect(fixed.products[0]!.vatRatePercentage).toBe(10);
  });

  it("runs inside finalizeParsedReceipt for OCR text path", () => {
    const parsed: ParsedReceipt = {
      merchant: { title: "BİRİNCİ PROFİTEROL", category: "RESTAURANT" },
      metadata: { purchaseDate: "2026-07-30", currency: "TRY" },
      products: [
        {
          name: "TATLI",
          quantity: 1,
          unit: "ad",
          unitPrice: 625,
          lineTotal: 625,
        },
      ],
      discounts: [],
      payments: [{ type: "CREDIT_CARD", amount: 56.82 }],
      financials: { vatTotal: null, totalAmount: 56.82 },
      rawText: birinciRawText,
    };

    const finalized = finalizeParsedReceipt(parsed);
    expect(finalized.financials.totalAmount).toBe(625);
    expect(finalized.payments[0]!.amount).toBe(625);
  });

  it("strips TOPKDV / TOPKD footer rows misclassified as products on fuel receipts", () => {
    const parsed: ParsedReceipt = {
      merchant: { title: "SHELL PETROL A.Ş", category: "FUEL" },
      metadata: { purchaseDate: "2026-07-27", currency: "TRY" },
      products: [
        {
          name: "MOTORİN SVİD",
          quantity: 29.766,
          unit: "LT",
          unitPrice: 79.17,
          lineTotal: 2356.1,
        },
        {
          name: "TOPKD: 892,68",
          quantity: 1,
          unitPrice: 892.68,
          lineTotal: 892.68,
        },
        {
          name: "TOPLAM: *2.356,10",
          quantity: 1,
          unitPrice: 2356.1,
          lineTotal: 2356.1,
        },
      ],
      discounts: [],
      payments: [{ type: "CREDIT_CARD", amount: 2356.1 }],
      financials: { vatTotal: 892.68, totalAmount: 2356.1 },
      rawText:
        "TOPKD: 892,68\nTOPLAM: *2.356,10\nK. KARTI/B. KARTI\n*2.356,10",
    };

    expect(isMisclassifiedFooterProduct(parsed.products[1]!)).toBe(true);
    expect(isMisclassifiedFooterProduct(parsed.products[2]!)).toBe(true);

    const fixed = disambiguatePosFooter(parsed);
    expect(fixed.products).toHaveLength(1);
    expect(fixed.products[0]!.name).toMatch(/MOTORİN/i);
    expect(fixed.financials.vatTotal).toBeCloseTo(892.68, 2);
  });

  it("strips KDV summary rows from Opet market vision output", () => {
    const parsed: ParsedReceipt = {
      merchant: { title: "OPET MARKET", category: "FUEL" },
      metadata: { purchaseDate: "2026-07-27", currency: "TRY" },
      products: [
        {
          name: "NESCAFE XPRESS Choco 24",
          quantity: 1,
          unitPrice: 90,
          lineTotal: 90,
        },
        {
          name: "%10 *31,82",
          quantity: 1,
          unitPrice: 31.82,
          lineTotal: 31.82,
        },
        {
          name: "TOPKDV *31,82",
          quantity: 1,
          unitPrice: 31.82,
          lineTotal: 31.82,
        },
      ],
      discounts: [],
      payments: [{ type: "CASH", amount: 580 }],
      financials: { totalAmount: 580 },
      rawText: "TOPLAM *580,00\nTOPKDV *31,82\n%10 *31,82",
    };

    const fixed = disambiguatePosFooter(parsed);
    expect(fixed.products).toHaveLength(1);
    expect(fixed.products.some((p) => /TOPKDV|TOPKD|%10/i.test(p.name))).toBe(
      false
    );
  });
});
