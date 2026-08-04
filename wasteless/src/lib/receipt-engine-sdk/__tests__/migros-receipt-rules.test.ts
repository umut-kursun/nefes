import { describe, expect, it } from "vitest";
import {
  finalizeVisionParsedReceipt,
  type ParsedReceipt,
} from "../types/ParsedReceipt";
import {
  dedupeMigrosPlasticBag,
  findExplicitQuantityForProduct,
  isMigrosReceipt,
  recoverSplitMigrosProducts,
} from "../vision/migrosReceiptRules";
import { isStandaloneMultiplierProduct } from "../vision/mergeStandaloneMultiplierProducts";
import { sumParsedReceiptLineTotals } from "../vision/parsedReceiptValidation";

const migrosBase = {
  merchant: { title: "MİGROS TİCARET A.Ş.", category: "MARKET" as const },
  metadata: { purchaseDate: "2026-07-15", currency: "TRY" },
  discounts: [] as ParsedReceipt["discounts"],
  payments: [] as ParsedReceipt["payments"],
};

describe("Migros receipt rules", () => {
  it("detects Migros merchant", () => {
    expect(isMigrosReceipt({ ...migrosBase, products: [], financials: { totalAmount: 0 } } as ParsedReceipt)).toBe(true);
  });

  it("parses explicit *1 quantity from product line", () => {
    const raw =
      "ALGIDA FRIGOLA 60ML *1 *360,00\n9 AD x 40,00 TL/AD";
    expect(findExplicitQuantityForProduct(raw, "ALGIDA FRIGOLA")).toBe(1);
  });

  it("preserves *1 quantity for ALGIDA with multiplier metadata", () => {
    const finalized = finalizeVisionParsedReceipt({
      ...migrosBase,
      products: [
        {
          name: "ALGIDA FRIGOLA 60ML",
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
      financials: { totalAmount: 360 },
      rawText:
        "ALGIDA FRIGOLA 60ML *1 *360,00\n9 AD x 40,00 TL/AD",
    });

    expect(finalized.products).toHaveLength(1);
    const algida = finalized.products[0]!;
    expect(algida.quantity).toBe(1);
    expect(algida.unitPrice).toBe(360);
    expect(algida.lineTotal).toBe(360);
    expect(finalized.products.some((p) => /9 AD/i.test(p.name))).toBe(false);
  });

  it("preserves *1 quantity for cigarette multiplier lines", () => {
    const finalized = finalizeVisionParsedReceipt({
      ...migrosBase,
      products: [
        {
          name: "MARLBORO TBLUE PAKET",
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
      financials: { totalAmount: 460 },
      rawText:
        "MARLBORO TBLUE PAKET *1 *460,00\n4 AD x 115,00 TL/AD",
    });

    const marlboro = finalized.products.find((p) => /MARLBORO/i.test(p.name))!;
    expect(marlboro.quantity).toBe(1);
    expect(marlboro.unitPrice).toBe(460);
    expect(finalized.products.some((p) => isStandaloneMultiplierProduct(p))).toBe(
      false
    );
  });

  it("recovers split product name when vision only extracted multiplier", () => {
    const recovered = recoverSplitMigrosProducts({
      ...migrosBase,
      products: [
        {
          name: "4 AD x 115,00 TL/AD",
          quantity: 4,
          unit: "ad",
          unitPrice: 115,
          lineTotal: 460,
        },
      ],
      financials: { totalAmount: 460 },
      rawText:
        "MARLBORO TBLUE PAKET *1 *460,00\n4 AD x 115,00 TL/AD",
    });

    expect(recovered.products).toHaveLength(1);
    expect(recovered.products[0]!.name).toMatch(/MARLBORO TBLUE/i);
    expect(recovered.products[0]!.quantity).toBe(1);
    expect(recovered.products[0]!.lineTotal).toBe(460);
  });

  it("keeps MIGROS PLASTIK POSET exactly once — product not charge", () => {
    const deduped = dedupeMigrosPlasticBag({
      ...migrosBase,
      products: [
        {
          name: "MIGROS PLASTIK POSET",
          quantity: 1,
          unitPrice: 0.5,
          lineTotal: 0.5,
        },
        {
          name: "SÜT",
          quantity: 1,
          unitPrice: 45,
          lineTotal: 45,
        },
      ],
      platformCharges: [{ name: "MIGROS PLASTIK POSET", amount: 0.5 }],
      financials: { totalAmount: 45.5 },
      rawText: "",
    });

    expect(deduped.products.filter((p) => /POSET|POŞET/i.test(p.name))).toHaveLength(
      1
    );
    expect(deduped.platformCharges ?? []).toHaveLength(0);
  });

  it("keeps linked discounts in discounts[] without phantom duplicates", () => {
    const finalized = finalizeVisionParsedReceipt({
      ...migrosBase,
      products: [
        {
          name: "MARLBORO EDGE SLIMS",
          quantity: 1,
          unitPrice: 460,
          lineTotal: 460,
        },
        {
          name: "% 25 % İNDİRİM",
          quantity: 1,
          lineTotal: -57.49,
        },
      ],
      discounts: [],
      financials: { totalAmount: 402.51 },
      rawText:
        "MARLBORO EDGE SLIMS *1 *460,00\n4 AD x 115,00 TL/AD\n% 25 % İNDİRİM %20 *-57,49",
    });

    expect(finalized.products.every((p) => !/İNDİRİM/i.test(p.name))).toBe(true);
    expect(finalized.discounts).toHaveLength(1);
    expect(finalized.discounts![0]!.linkedProductName).toBeNull();
    expect(finalized.discounts![0]!.amount).toBeCloseTo(-57.49, 2);
  });

  it("reconciles total with products + charges - discounts", () => {
    const finalized = finalizeVisionParsedReceipt({
      ...migrosBase,
      products: [
        {
          name: "ALGIDA FRIGOLA 60ML",
          quantity: 1,
          unitPrice: 360,
          lineTotal: 360,
          vatRatePercentage: 1,
        },
        {
          name: "MARLBORO EDGE SLIMS",
          quantity: 1,
          unitPrice: 460,
          lineTotal: 460,
          vatRatePercentage: 20,
        },
        {
          name: "COLA TURKA 1,5 LT",
          quantity: 1,
          unitPrice: 55,
          lineTotal: 55,
          vatRatePercentage: 10,
        },
      ],
      discounts: [
        {
          name: "% 25 % İNDİRİM",
          amount: -57.49,
          vatRatePercentage: 20,
          linkedProductName: "MARLBORO EDGE SLIMS",
        },
      ],
      payments: [{ type: "CREDIT_CARD", amount: 817.51 }],
      financials: { vatTotal: 45.2, totalAmount: 817.51 },
      rawText:
        "ALGIDA FRIGOLA 60ML *1 *360,00\n9 AD x 40,00 TL/AD\nMARLBORO EDGE SLIMS *1 *460,00\n4 AD x 115,00 TL/AD\n% 25 % İNDİRİM %20 *-57,49\nCOLA TURKA 1,5 LT  %10.  *55,00\nTOPLAM  *817,51",
    });

    expect(sumParsedReceiptLineTotals(finalized)).toBeCloseTo(817.51, 2);
    expect(finalized.mathConsistent).toBe(true);
  });

  it("handles multiple multiplier lines in one receipt", () => {
    const finalized = finalizeVisionParsedReceipt({
      ...migrosBase,
      products: [
        {
          name: "ALGIDA FRIGOLA 60ML",
          quantity: 1,
          unitPrice: 360,
          lineTotal: 360,
        },
        { name: "9 AD x 40,00 TL/AD", quantity: 9, unitPrice: 40, lineTotal: 360 },
        {
          name: "MARLBORO EDGE SLIMS",
          quantity: 1,
          unitPrice: 460,
          lineTotal: 460,
        },
        { name: "4 AD x 115,00 TL/AD", quantity: 4, unitPrice: 115, lineTotal: 460 },
        {
          name: "12 AD x 10,00 TL/AD",
          quantity: 12,
          unitPrice: 10,
          lineTotal: 120,
        },
      ],
      financials: { totalAmount: 940 },
      rawText:
        "ALGIDA FRIGOLA 60ML *1 *360,00\n9 AD x 40,00 TL/AD\nMARLBORO EDGE SLIMS *1 *460,00\n4 AD x 115,00 TL/AD\nEKMEK *1 *120,00\n12 AD x 10,00 TL/AD",
    });

    expect(finalized.products.filter((p) => isStandaloneMultiplierProduct(p))).toHaveLength(
      0
    );
    expect(finalized.products.find((p) => /FRIGOLA/i.test(p.name))!.quantity).toBe(1);
    expect(finalized.products.find((p) => /MARLBORO/i.test(p.name))!.quantity).toBe(1);
    expect(finalized.products.find((p) => /EKMEK/i.test(p.name))!.quantity).toBe(1);
  });

  it("does not apply Migros multiplier rules to Shell fuel receipts", () => {
    const finalized = finalizeVisionParsedReceipt({
      merchant: { title: "SHELL", category: "FUEL" },
      metadata: { purchaseDate: "2026-07-15", currency: "TRY" },
      products: [
        {
          name: "MOTORIN",
          quantity: 1,
          unit: "L",
          unitPrice: 1500,
          lineTotal: 1500,
        },
      ],
      discounts: [],
      payments: [],
      financials: { totalAmount: 1500 },
      rawText: "MOTORIN *1500,00",
    });

    expect(finalized.products[0]!.quantity).toBe(1);
  });
});
