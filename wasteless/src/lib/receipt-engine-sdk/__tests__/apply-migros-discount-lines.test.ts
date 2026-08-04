import { describe, expect, it } from "vitest";
import {
  applyMigrosDiscountLines,
  extractMigrosDiscountBindings,
} from "../vision/applyMigrosDiscountLines";
import { finalizeParsedReceipt, type ParsedReceipt } from "../types/ParsedReceipt";

const migrosRawText = `
MIGROS TÜRK A.Ş.
MARLBORO EDGE SLIMS  *229,96
% 25 % İNDİRİM %1 *-57,49
COLA TURKA 1,5 LT  *55,00
TOPLAM  *2.125,57
`.trim();

describe("extractMigrosDiscountBindings", () => {
  it("detects discount line directly under product row", () => {
    const bindings = extractMigrosDiscountBindings(migrosRawText);
    expect(bindings).toHaveLength(1);
    expect(bindings[0]!.nameHint).toMatch(/MARLBORO/i);
    expect(bindings[0]!.grossTotal).toBeCloseTo(229.96, 2);
    expect(bindings[0]!.discountAmount).toBeCloseTo(57.49, 2);
    expect(bindings[0]!.netTotal).toBeCloseTo(172.47, 2);
  });
});

describe("applyMigrosDiscountLines", () => {
  const parsed: ParsedReceipt = {
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
        name: "COLA TURKA 1,5 LT",
        quantity: 1,
        unit: "ad",
        unitPrice: 55,
        lineTotal: 55,
      },
    ],
    payments: [],
    financials: { totalAmount: 2125.57 },
    rawText: migrosRawText,
  };

  it("deducts inline discount from matching product line total", () => {
    const adjusted = applyMigrosDiscountLines(parsed);
    const marlboro = adjusted.products.find((p) => /MARLBORO/i.test(p.name))!;
    expect(marlboro.lineTotal).toBeCloseTo(172.47, 2);
    expect(marlboro.unitPrice).toBeCloseTo(172.47, 2);
  });

  it("runs inside finalizeParsedReceipt", () => {
    const finalized = finalizeParsedReceipt(parsed);
    const marlboro = finalized.products.find((p) => /MARLBORO/i.test(p.name))!;
    expect(marlboro.lineTotal).toBeCloseTo(172.47, 2);
  });

  it("moves İNDİRİM product rows to discounts[]", () => {
    const withDiscountProduct: ParsedReceipt = {
      ...parsed,
      products: [
        ...parsed.products,
        {
          name: "% 25 % İNDİRİM %1",
          quantity: 1,
          unit: "ad",
          unitPrice: 57.49,
          lineTotal: 57.49,
        },
      ],
    };
    const adjusted = applyMigrosDiscountLines(withDiscountProduct);
    expect(adjusted.products.some((p) => /İNDİRİM/i.test(p.name))).toBe(false);
    expect(adjusted.discounts.length).toBeGreaterThan(0);
    expect(adjusted.discounts.some((d) => /İNDİRİM/i.test(d.name))).toBe(true);
  });
});
