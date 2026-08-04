import { describe, expect, it } from "vitest";
import {
  finalizeParsedReceipt,
  finalizeVisionParsedReceipt,
  type ParsedReceipt,
  type ReceiptItem,
} from "../types/ParsedReceipt";
import { stripMisclassifiedDiscountProducts } from "../vision/stripMisclassifiedDiscountProducts";

const fileMarketRawText = `
5 ad X 19.90
LAKTOSUZ SÜT 200ML  *99.50
`.trim();

const misboundVisionOutput: ParsedReceipt = {
  merchant: { title: "FİLE MARKET", category: "MARKET" },
  metadata: { purchaseDate: "2026-07-01", currency: "TRY" },
  products: [
    {
      name: "LAKTOSUZSUT200ML",
      quantity: 1,
      unit: "ad",
      unitPrice: 99.5,
      lineTotal: 99.5,
    },
  ],
  discounts: [],
  payments: [],
  financials: { totalAmount: 99.5 },
  rawText: fileMarketRawText,
};

const migrosVisionOutput: ParsedReceipt = {
  merchant: { title: "MIGROS", category: "MARKET" },
  metadata: { purchaseDate: "2026-07-01", currency: "TRY" },
  products: [
    {
      name: "MARLBORO EDGE SLIMS",
      quantity: 1,
      unit: "ad",
      unitPrice: 229.96,
      lineTotal: 229.96,
    },
  ],
  discounts: [
    {
      name: "% 25 % İNDİRİM",
      amount: 57.49,
      linkedProductName: "MARLBORO EDGE SLIMS",
    },
  ],
  payments: [],
  financials: { totalAmount: 172.47 },
  rawText: "",
};

const birinciProfiterolVision: ParsedReceipt = {
  merchant: { title: "BİRİNCİ PROFİTEROL", category: "RESTAURANT" },
  metadata: { purchaseDate: "2026-07-30", currency: "TRY" },
  products: [
    {
      name: "TATLI",
      quantity: 1,
      unit: "ad",
      unitPrice: 625,
      lineTotal: 625,
      vatRatePercentage: 10,
    },
  ],
  discounts: [],
  payments: [
    {
      type: "CREDIT_CARD",
      bankName: "YapıKredi",
      cardLastFour: null,
      approvalCode: null,
      amount: 625,
    },
  ],
  financials: { vatTotal: 56.82, totalAmount: 625 },
  rawText:
    "TATLI %10 *625,00\nTOPKDV *56,82\nTOPLAM *625,00\nKredi Kartı *625,00",
};

describe("finalizeVisionParsedReceipt", () => {
  it("binds upper-line multipliers from rawText on vision path", () => {
    const vision = finalizeVisionParsedReceipt(misboundVisionOutput);
    expect(vision.products[0]!.quantity).toBe(5);
    expect(vision.products[0]!.unitPrice).toBe(19.9);

    const ocr = finalizeParsedReceipt(misboundVisionOutput);
    expect(ocr.products[0]!.quantity).toBe(5);
  });

  it("preserves vision discounts[] without Migros regex pass", () => {
    const vision = finalizeVisionParsedReceipt(migrosVisionOutput);
    expect(vision.discounts).toHaveLength(1);
    expect(vision.discounts![0]!.amount).toBeCloseTo(-57.49, 2);
    expect(vision.products[0]!.lineTotal).toBeCloseTo(229.96, 2);
    expect(vision.mathConsistent).toBe(true);
  });

  it("preserves POS payment amount and does not swap TOPKDV into payments", () => {
    const vision = finalizeVisionParsedReceipt(birinciProfiterolVision);
    expect(vision.payments[0]!.amount).toBe(625);
    expect(vision.financials.vatTotal).toBeCloseTo(56.82, 2);
    expect(vision.financials.totalAmount).toBe(625);
    expect(vision.products[0]!.vatRatePercentage).toBe(10);
  });

  it("flags mathConsistent false when totals mismatch without mutating lines", () => {
    const inconsistent: ParsedReceipt = {
      ...birinciProfiterolVision,
      financials: { totalAmount: 700 },
      rawText: "",
    };
    const vision = finalizeVisionParsedReceipt(inconsistent);
    expect(vision.mathConsistent).toBe(false);
    expect(vision.products[0]!.lineTotal).toBe(625);
  });
});

describe("stripMisclassifiedDiscountProducts", () => {
  it("moves İNDİRİM product with negative lineTotal to discounts[]", () => {
    const input: ParsedReceipt = {
      merchant: { title: "MIGROS", category: "MARKET" },
      metadata: { purchaseDate: "2026-07-01", currency: "TRY" },
      products: [
        {
          name: "MARLBORO EDGE SLIMS",
          quantity: 1,
          unit: "ad",
          unitPrice: 229.96,
          lineTotal: 229.96,
        },
        {
          name: "% 25 % İNDİRİM",
          quantity: 1,
          lineTotal: -57.49,
        } as ReceiptItem,
      ],
      discounts: [],
      payments: [],
      financials: { totalAmount: 172.47 },
      rawText: "",
    };

    const stripped = stripMisclassifiedDiscountProducts(input);
    expect(stripped.products).toHaveLength(1);
    expect(stripped.products[0]!.name).toBe("MARLBORO EDGE SLIMS");
    expect(stripped.discounts).toHaveLength(1);
    expect(stripped.discounts![0]!.name).toBe("% 25 % İNDİRİM");
    expect(stripped.discounts![0]!.amount).toBeCloseTo(-57.49, 2);
    expect(stripped.discounts![0]!.linkedProductName).toBeNull();

    const vision = finalizeVisionParsedReceipt(input);
    expect(vision.products).toHaveLength(1);
    expect(vision.discounts).toHaveLength(1);
    expect(vision.mathConsistent).toBe(true);
  });
});
