import { describe, expect, it } from "vitest";
import { normalizeVisionReceipt } from "../vision/normalizeVisionReceipt";
import type { ParsedReceipt } from "../types/ParsedReceipt";

const migrosBase = {
  merchant: { title: "MİGROS TİCARET A.Ş.", category: "MARKET" as const },
  metadata: { purchaseDate: "2026-07-31", currency: "TRY" },
  discounts: [] as ParsedReceipt["discounts"],
  payments: [] as ParsedReceipt["payments"],
  financials: { totalAmount: 820 },
};

describe("normalizeVisionReceipt — Migros multiplier regression", () => {
  it("binds 9 AD x 40 to ALGIDA FRIGOLA from Vision-style ParsedReceipt", () => {
    const visionLike: ParsedReceipt = {
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
          name: "MARLBORO TBLUE PAKET",
          quantity: 1,
          unit: "ad",
          unitPrice: 460,
          lineTotal: 460,
        },
      ],
      rawText:
        "9 AD x 40,00 TL/AD\nALGIDA FRIGOLA 60ML *1 *360,00\n4 AD x 115,00 TL/AD\nMARLBORO TBLUE PAKET *1 *460,00",
      confidence: 0.9,
    };

    const normalized = normalizeVisionReceipt(visionLike);
    const algida = normalized.products.find((p) => /FRIGOLA/i.test(p.name))!;
    const marlboro = normalized.products.find((p) => /MARLBORO/i.test(p.name))!;

    expect(algida.quantity).toBe(9);
    expect(algida.unitPrice).toBeCloseTo(40, 2);
    expect(algida.lineTotal).toBeCloseTo(360, 2);

    expect(marlboro.quantity).toBe(4);
    expect(marlboro.unitPrice).toBeCloseTo(115, 2);
    expect(marlboro.lineTotal).toBeCloseTo(460, 2);

    expect(normalized.mathConsistent).toBe(true);
  });
});
