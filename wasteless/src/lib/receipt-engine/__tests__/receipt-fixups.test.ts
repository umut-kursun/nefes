import { describe, expect, it } from "vitest";
import {
  classifyEcommerceLine,
  computeReconciledSubtotal,
  enforceLineTotal,
  isStandaloneVatToken,
  parseDiscountAmount,
  parseMultiplierLine,
  reconcilesToTotal,
  round2,
  stripVatPercentTokens,
} from "@/lib/receipt-engine/analysis/receiptFixups";

describe("multi-line quantity multipliers", () => {
  it("parses 'N AD x PRICE' and enforces lineTotal = qty * unitPrice", () => {
    expect(parseMultiplierLine("9 AD x 40,00 TL/AD")).toEqual({
      quantity: 9,
      unit: "adet",
      unitPrice: 40,
      lineTotal: 360,
    });
    expect(parseMultiplierLine("4 AD x 115,00 TL/AD")).toEqual({
      quantity: 4,
      unit: "adet",
      unitPrice: 115,
      lineTotal: 460,
    });
    expect(parseMultiplierLine("3 AD x 25,90 TL/AD")).toEqual({
      quantity: 3,
      unit: "adet",
      unitPrice: 25.9,
      lineTotal: 77.7,
    });
  });

  it("parses a weighted 'kg x PRICE' multiplier", () => {
    expect(parseMultiplierLine("0,744 kg x 89,90")).toEqual({
      quantity: 0.744,
      unit: "kg",
      unitPrice: 89.9,
      lineTotal: 66.89,
    });
  });

  it("returns null for lines without a multiplier", () => {
    expect(parseMultiplierLine("Ekmek")).toBeNull();
  });

  it("derives lineTotal only when it is missing", () => {
    expect(enforceLineTotal({ quantity: 9, unitPrice: 40 })).toBe(360);
    expect(enforceLineTotal({ quantity: 9, unitPrice: 40, lineTotal: 355 })).toBe(
      355
    );
    expect(enforceLineTotal({ quantity: 0, unitPrice: 40 })).toBeUndefined();
  });
});

describe("Migros discount deduction", () => {
  it("parses a negative discount amount from a percentage discount line", () => {
    expect(parseDiscountAmount("% 25 % İNDİRİM %1 *-57,49")).toBe(-57.49);
    expect(parseDiscountAmount("KAMPANYA İNDİRİMİ -12,50")).toBe(-12.5);
    expect(parseDiscountAmount("İSKONTO 8,00")).toBe(-8);
  });

  it("ignores non-discount lines", () => {
    expect(parseDiscountAmount("Ekmek 15,00")).toBeUndefined();
    expect(parseDiscountAmount("TOPLAM 2125,57")).toBeUndefined();
  });

  it("reconciles the subtotal to the printed total (2125.57 TL)", () => {
    // Products include AD-multiplier lines; a Migros discount is deducted.
    const receipt = {
      products: [
        { quantity: 9, unitPrice: 40.0 }, // Algida Frigola  → 360.00
        { quantity: 4, unitPrice: 115.0 }, // Marlboro        → 460.00
        { quantity: 3, unitPrice: 25.9 }, // Laktozsuz Süt   →  77.70
        { lineTotal: 1285.36 }, // remaining basket
      ],
      discounts: [{ amount: parseDiscountAmount("% 25 İNDİRİM *-57,49")! }],
    };

    // 360 + 460 + 77.70 + 1285.36 - 57.49 = 2125.57
    expect(computeReconciledSubtotal(receipt)).toBe(2125.57);
    expect(reconcilesToTotal(receipt, 2125.57)).toBe(true);
    expect(reconcilesToTotal(receipt, 2183.06)).toBe(false);
  });

  it("includes charges in the reconciliation", () => {
    const receipt = {
      products: [{ lineTotal: 100 }],
      charges: [{ amount: 4.9 }],
      discounts: [{ amount: -10 }],
    };
    expect(computeReconciledSubtotal(receipt)).toBe(94.9);
  });
});

describe("online e-commerce table parsing", () => {
  it("maps delivery fees to charges and retail bags to products", () => {
    expect(classifyEcommerceLine("Nakliye Ücreti")).toBe("charge");
    expect(classifyEcommerceLine("Kargo Bedeli")).toBe("charge");
    expect(classifyEcommerceLine("Hemen Poşet")).toBe("product");
    expect(classifyEcommerceLine("Uludağ Limonata")).toBe("product");
  });

  it("recognizes standalone VAT-rate cells so they don't leak as items", () => {
    expect(isStandaloneVatToken("1")).toBe(true);
    expect(isStandaloneVatToken("%10")).toBe(true);
    expect(isStandaloneVatToken("20%")).toBe(true);
    expect(isStandaloneVatToken("% 20")).toBe(true);
    expect(isStandaloneVatToken("330")).toBe(false); // not a VAT rate
    expect(isStandaloneVatToken("Ekmek")).toBe(false);
    expect(classifyEcommerceLine("%1")).toBe("vat");
  });

  it("strips VAT-percent tokens leaking into product names", () => {
    expect(stripVatPercentTokens("Hemen Poşet %20")).toBe("Hemen Poşet");
    expect(stripVatPercentTokens("Cola %10 330 ml")).toBe("Cola 330 ml");
    expect(stripVatPercentTokens("Süt 1 L")).toBe("Süt 1 L");
  });
});

describe("round2", () => {
  it("avoids binary float drift", () => {
    expect(round2(0.744 * 89.9)).toBe(66.89);
    expect(round2(1285.36 + 360 + 460 + 77.7 - 57.49)).toBe(2125.57);
  });
});
