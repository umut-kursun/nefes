import { describe, expect, it } from "vitest";
import { finalizeVisionParsedReceipt, type ParsedReceipt } from "../types/ParsedReceipt";
import {
  isStandaloneMultiplierProduct,
  mergeStandaloneMultiplierProducts,
  parseMultiplierText,
} from "../vision/mergeStandaloneMultiplierProducts";

const baseReceipt = {
  merchant: { title: "MIGROS", category: "MARKET" as const },
  metadata: { purchaseDate: "2026-07-15", currency: "TRY" },
  discounts: [],
  payments: [],
  financials: { totalAmount: 360 },
  rawText: "",
};

describe("parseMultiplierText", () => {
  it("parses full Migros multiplier with TL/AD suffix", () => {
    expect(parseMultiplierText("9 AD x 40,00 TL/AD")).toEqual({
      quantity: 9,
      unit: "ad",
      unitPrice: 40,
    });
  });

  it("parses loose AD-only multiplier names", () => {
    expect(parseMultiplierText("3 AD")).toEqual({
      quantity: 3,
      unit: "ad",
      unitPrice: NaN,
    });
  });
});

describe("isStandaloneMultiplierProduct", () => {
  it("detects multiplier rows and rejects real products", () => {
    expect(
      isStandaloneMultiplierProduct({
        name: "9 AD x 40,00 TL/AD",
        lineTotal: 40,
      })
    ).toBe(true);
    expect(
      isStandaloneMultiplierProduct({
        name: "3 AD",
        lineTotal: 25.9,
      })
    ).toBe(true);
    expect(
      isStandaloneMultiplierProduct({
        name: "ALGIDA FRIGOLA",
        lineTotal: 360,
      })
    ).toBe(false);
  });
});

describe("mergeStandaloneMultiplierProducts", () => {
  it("merges multiplier-below row into preceding product without overwriting *1 quantity", () => {
    const parsed: ParsedReceipt = {
      ...baseReceipt,
      rawText: "ALGIDA FRIGOLA 60ML *1 *360,00\n9 AD x 40,00 TL/AD",
      products: [
        {
          name: "ALGIDA FRIGOLA",
          quantity: 1,
          unit: "ad",
          unitPrice: 360,
          lineTotal: 360,
        },
        {
          name: "9 AD x 40,00 TL/AD",
          quantity: 9,
          unit: "ad",
          unitPrice: 40,
          lineTotal: 360,
        },
      ],
    };

    const merged = mergeStandaloneMultiplierProducts(parsed);
    expect(merged.products).toHaveLength(1);
    expect(merged.products[0]!.name).toBe("ALGIDA FRIGOLA");
    expect(merged.products[0]!.quantity).toBe(1);
    expect(merged.products[0]!.unitPrice).toBe(360);
    expect(merged.products[0]!.lineTotal).toBe(360);
    expect(merged.products[0]!.normalizedUnitPrice).toBe(360);
  });

  it("merges multiplier-above row into following product (File layout)", () => {
    const parsed: ParsedReceipt = {
      ...baseReceipt,
      financials: { totalAmount: 99.5 },
      products: [
        {
          name: "5 ad X 19.90",
          quantity: 5,
          unit: "ad",
          unitPrice: 19.9,
          lineTotal: 99.5,
        },
        {
          name: "LAKTOSUZ SÜT 200ML",
          quantity: 1,
          unit: "ad",
          unitPrice: 99.5,
          lineTotal: 99.5,
        },
      ],
    };

    const merged = mergeStandaloneMultiplierProducts(parsed);
    expect(merged.products).toHaveLength(1);
    expect(merged.products[0]!.name).toBe("LAKTOSUZ SÜT 200ML");
    expect(merged.products[0]!.quantity).toBe(5);
    expect(merged.products[0]!.unitPrice).toBe(19.9);
  });

  it("merges loose 3 AD row using item unitPrice", () => {
    const parsed: ParsedReceipt = {
      ...baseReceipt,
      financials: { totalAmount: 77.7 },
      products: [
        {
          name: "ÜRÜN ADI",
          quantity: 1,
          unit: "ad",
          unitPrice: 77.7,
          lineTotal: 77.7,
        },
        {
          name: "3 AD",
          quantity: 3,
          unit: "ad",
          unitPrice: 25.9,
          lineTotal: 25.9,
        },
      ],
    };

    const merged = mergeStandaloneMultiplierProducts(parsed);
    expect(merged.products).toHaveLength(1);
    expect(merged.products[0]!.quantity).toBe(3);
    expect(merged.products[0]!.unitPrice).toBe(25.9);
    expect(merged.products[0]!.lineTotal).toBe(77.7);
  });

  it("runs automatically in finalizeVisionParsedReceipt", () => {
    const parsed: ParsedReceipt = {
      ...baseReceipt,
      rawText: "MARLBORO EDGE SLIMS *1 *460,00\n4 AD x 115,00 TL/AD",
      products: [
        {
          name: "MARLBORO EDGE SLIMS",
          quantity: 1,
          unit: "ad",
          unitPrice: 460,
          lineTotal: 460,
        },
        {
          name: "4 AD x 115,00 TL/AD",
          quantity: 4,
          unit: "ad",
          unitPrice: 115,
          lineTotal: 460,
        },
      ],
    };

    const finalized = finalizeVisionParsedReceipt(parsed);
    expect(finalized.products).toHaveLength(1);
    expect(finalized.products[0]!.quantity).toBe(1);
    expect(finalized.products[0]!.unitPrice).toBe(460);
  });
});
