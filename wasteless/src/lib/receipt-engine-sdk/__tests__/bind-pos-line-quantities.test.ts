import { describe, expect, it } from "vitest";
import {
  bindPosLineQuantities,
  extractPosLineBindings,
} from "../vision/bindPosLineQuantities";
import { finalizeVisionParsedReceipt, type ParsedReceipt } from "../types/ParsedReceipt";

describe("extractPosLineBindings", () => {
  it("parses POS *QTY *TOTAL lines", () => {
    const bindings = extractPosLineBindings(
      "BİSKÜVİ *5 *125,00\n*10 *625,00"
    );
    expect(bindings).toHaveLength(2);
    expect(bindings[0]).toMatchObject({
      nameHint: "BİSKÜVİ",
      quantity: 5,
      unitPrice: 25,
      lineTotal: 125,
    });
    expect(bindings[1]).toMatchObject({
      nameHint: "",
      quantity: 10,
      unitPrice: 62.5,
      lineTotal: 625,
    });
  });

  it("ignores VAT lines with % prefix (Birinci Profiterol)", () => {
    const bindings = extractPosLineBindings("TATLI %10 *625,00");
    expect(bindings).toHaveLength(0);
  });
});

describe("bindPosLineQuantities", () => {
  it("binds *10 *625,00 to product with matching lineTotal", () => {
    const parsed: ParsedReceipt = {
      merchant: { title: "POS", category: "RESTAURANT" },
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
      payments: [],
      financials: { totalAmount: 625 },
      rawText: "*10 *625,00",
    };

    const bound = bindPosLineQuantities(parsed);
    expect(bound.products[0]!.quantity).toBe(10);
    expect(bound.products[0]!.unitPrice).toBe(62.5);
    expect(bound.products[0]!.lineTotal).toBe(625);
  });

  it("does not override Birinci Profiterol TATLI %10 single-item line", () => {
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
          vatRatePercentage: 10,
        },
      ],
      discounts: [],
      payments: [],
      financials: { totalAmount: 625 },
      rawText:
        "TATLI %10 *625,00\nTOPKDV *56,82\nTOPLAM *625,00\nKredi Kartı *625,00",
    };

    const finalized = finalizeVisionParsedReceipt(parsed);
    expect(finalized.products[0]!.quantity).toBe(1);
    expect(finalized.products[0]!.vatRatePercentage).toBe(10);
    expect(finalized.financials.totalAmount).toBe(625);
  });
});
