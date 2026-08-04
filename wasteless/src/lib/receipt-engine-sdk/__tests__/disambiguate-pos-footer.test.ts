import { describe, expect, it } from "vitest";
import { disambiguatePosFooter } from "../vision/disambiguatePosFooter";
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
});
