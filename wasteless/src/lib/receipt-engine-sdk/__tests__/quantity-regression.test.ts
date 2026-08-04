import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  finalizeVisionParsedReceipt,
  parseParsedReceiptJson,
  type ParsedReceipt,
} from "../types/ParsedReceipt";
import { bindUpperLineQuantities } from "../vision/bindUpperLineQuantities";

function loadFixture(name: string): ParsedReceipt {
  return parseParsedReceiptJson(
    JSON.parse(
      readFileSync(join(process.cwd(), "fixtures/vision", name), "utf8")
    )
  );
}

describe("quantity regression — Birinci Profiterol", () => {
  it("corrects LLM misread of %10 as quantity 10", () => {
    const raw = loadFixture("birinci-profiterol-pos.json");
    const misread: ParsedReceipt = {
      ...raw,
      products: [
        {
          name: "TATLI %10",
          quantity: 10,
          unit: "ad",
          unitPrice: 625,
          lineTotal: 625,
        },
      ],
      payments: [{ type: "CREDIT_CARD", amount: 56.82 }],
      financials: { vatTotal: 56.82, totalAmount: 56.82 },
    };

    const finalized = finalizeVisionParsedReceipt(misread);
    const tatli = finalized.products[0]!;

    expect(tatli.name).toBe("TATLI");
    expect(tatli.quantity).toBe(1);
    expect(tatli.vatRatePercentage).toBe(10);
    expect(tatli.unitPrice).toBe(625);
    expect(finalized.financials.totalAmount).toBe(625);
    expect(finalized.payments[0]!.amount).toBe(625);
  });

  it("preserves correct fixture quantities", () => {
    const finalized = finalizeVisionParsedReceipt(
      loadFixture("birinci-profiterol-pos.json")
    );
    expect(finalized.products[0]!.quantity).toBe(1);
    expect(finalized.products[0]!.vatRatePercentage).toBe(10);
    expect(finalized.mathConsistent).toBe(true);
  });
});

describe("quantity regression — Migros multipliers", () => {
  it("binds multiplier-below lines from rawText on vision path", () => {
    const raw = loadFixture("migros-multipliers.json");
    const finalized = finalizeVisionParsedReceipt(raw);

    const algida = finalized.products.find((p) => /FRIGOLA/i.test(p.name))!;
    expect(algida.quantity).toBe(9);
    expect(algida.unitPrice).toBe(40);
    expect(algida.lineTotal).toBe(360);

    const marlboro = finalized.products.find((p) => /MARLBORO/i.test(p.name))!;
    expect(marlboro.quantity).toBe(4);
    expect(marlboro.unitPrice).toBe(115);
    expect(marlboro.lineTotal).toBe(460);

    const cola = finalized.products.find((p) => /COLA/i.test(p.name))!;
    expect(cola.quantity).toBe(1);
    expect(cola.unitPrice).toBe(55);
  });

  it("preserves discounts[] without regex Migros pass", () => {
    const finalized = finalizeVisionParsedReceipt(
      loadFixture("migros-multipliers.json")
    );
    expect(finalized.discounts).toHaveLength(1);
    expect(finalized.discounts![0]!.amount).toBeCloseTo(-57.49, 2);
    expect(finalized.discounts![0]!.linkedProductName).toBe("MARLBORO EDGE SLIMS");
    expect(finalized.mathConsistent).toBe(true);
  });

  it("does not duplicate discount when vision already populated discounts[]", () => {
    const raw = loadFixture("migros-multipliers.json");
    const withDupProduct: ParsedReceipt = {
      ...raw,
      products: [
        ...raw.products,
        {
          name: "% 25 % İNDİRİM",
          quantity: 1,
          lineTotal: -57.49,
        } as ParsedReceipt["products"][number],
      ],
    };
    const finalized = finalizeVisionParsedReceipt(withDupProduct);
    expect(finalized.discounts).toHaveLength(1);
    expect(finalized.products.every((p) => !/İNDİRİM/i.test(p.name))).toBe(true);
  });

  it("binds İÇİM multiplier-above from rawText on collapsed vision row", () => {
    const finalized = finalizeVisionParsedReceipt({
      merchant: { title: "MIGROS", category: "MARKET" },
      metadata: { purchaseDate: "2026-07-15", currency: "TRY" },
      products: [
        {
          name: "İÇİM RAHAT LAKTOZSUZ",
          quantity: 1,
          unit: null,
          unitPrice: 77.7,
          lineTotal: 77.7,
        },
      ],
      discounts: [],
      payments: [],
      financials: { totalAmount: 77.7 },
      rawText: "3 AD x 25,90 TL/AD\nİÇİM RAHAT LAKTOZSUZ *77,70",
    });

    const icim = finalized.products[0]!;
    expect(icim.quantity).toBe(3);
    expect(icim.unitPrice).toBeCloseTo(25.9, 2);
    expect(icim.lineTotal).toBeCloseTo(77.7, 2);
  });

  it("binds misplaced multiplier row by lineTotal math, not adjacency only", () => {
    const finalized = finalizeVisionParsedReceipt({
      merchant: { title: "MIGROS", category: "MARKET" },
      metadata: { purchaseDate: "2026-07-15", currency: "TRY" },
      products: [
        {
          name: "ALGIDA FRIGOLA",
          quantity: 1,
          unitPrice: 360,
          lineTotal: 360,
        },
        {
          name: "3 AD x 25,90 TL/AD",
          quantity: 1,
          unitPrice: 25.9,
          lineTotal: 25.9,
        },
        {
          name: "MARLBORO EDGE SLIMS",
          quantity: 1,
          unitPrice: 460,
          lineTotal: 460,
        },
        {
          name: "İÇİM RAHAT LAKTOZSUZ",
          quantity: 1,
          unitPrice: 77.7,
          lineTotal: 77.7,
        },
      ],
      discounts: [],
      payments: [],
      financials: { totalAmount: 897.7 },
      rawText: "",
    });

    const icim = finalized.products.find((p) => /İÇİM/i.test(p.name))!;
    expect(icim.quantity).toBe(3);
    expect(icim.unitPrice).toBeCloseTo(25.9, 2);
    expect(finalized.products.some((p) => /3 AD/i.test(p.name))).toBe(false);
  });

  it("does not synthesize phantom -0.01 discounts", () => {
    const finalized = finalizeVisionParsedReceipt({
      merchant: { title: "MIGROS", category: "MARKET" },
      metadata: { purchaseDate: "2026-07-15", currency: "TRY" },
      products: [
        {
          name: "ÜRÜN",
          quantity: 1,
          unitPrice: 50,
          lineTotal: 50,
        },
      ],
      discounts: [{ name: "İndirim", amount: 0, linkedProductName: null }],
      payments: [],
      financials: { totalAmount: 50 },
      rawText: "",
    });
    expect(finalized.discounts).toHaveLength(0);
  });

  it("binds multiplier only to preceding product (SOFRA EKMEK layout)", () => {
    const parsed: ParsedReceipt = {
      merchant: { title: "MIGROS", category: "MARKET" },
      metadata: { purchaseDate: "2026-07-15", currency: "TRY" },
      products: [
        {
          name: "SOFRA EKMEK ADET",
          quantity: 1,
          unit: null,
          unitPrice: 77.7,
          lineTotal: 77.7,
        },
        {
          name: "3 AD x 25,90 TL/AD",
          quantity: 3,
          unit: "ad",
          unitPrice: 25.9,
          lineTotal: 77.7,
        },
        {
          name: "VIVIDENT",
          quantity: 1,
          unit: "ad",
          unitPrice: 149.95,
          lineTotal: 149.95,
        },
        {
          name: "MLIFE",
          quantity: 1,
          unit: "ad",
          unitPrice: 89.9,
          lineTotal: 89.9,
        },
        {
          name: "JOHNSONS",
          quantity: 1,
          unit: "ad",
          unitPrice: 45,
          lineTotal: 45,
        },
      ],
      discounts: [],
      payments: [],
      financials: { totalAmount: 362.55 },
      rawText:
        "SOFRA EKMEK  *77,70\n3 AD x 25,90 TL/AD\nVIVIDENT  *149,95\nMLIFE  *89,90\nJOHNSONS  *45,00",
    };

    const finalized = finalizeVisionParsedReceipt(parsed);
    expect(finalized.products).toHaveLength(4);

    const sofra = finalized.products.find((p) => /SOFRA/i.test(p.name))!;
    expect(sofra.name).toBe("SOFRA EKMEK");
    expect(sofra.unit).toBe("adet");
    expect(sofra.quantity).toBe(3);
    expect(sofra.unitPrice).toBeCloseTo(25.9, 2);

    const vivident = finalized.products.find((p) => /VIVIDENT/i.test(p.name))!;
    expect(vivident.quantity).toBe(1);
    expect(vivident.lineTotal).toBeCloseTo(149.95, 2);
  });

  it("parses TL/AD suffix on multiplier lines", () => {
    const rawText = `
3 AD X 25,90 TL/AD
ÜRÜN ADI  *77,70
`.trim();
    const bindings = bindUpperLineQuantities({
      merchant: { title: "M", category: "MARKET" },
      metadata: { purchaseDate: "2026-01-01", currency: "TRY" },
      products: [
        {
          name: "ÜRÜN ADI",
          quantity: 1,
          unit: "ad",
          unitPrice: 77.7,
          lineTotal: 77.7,
        },
      ],
      discounts: [],
      payments: [],
      financials: { totalAmount: 77.7 },
      rawText,
    });
    expect(bindings.products[0]!.quantity).toBe(3);
    expect(bindings.products[0]!.unitPrice).toBe(25.9);
  });
});
