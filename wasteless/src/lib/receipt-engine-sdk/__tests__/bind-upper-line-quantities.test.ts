import { describe, expect, it } from "vitest";
import {
  bindUpperLineQuantities,
  extractUpperLineBindings,
} from "../vision/bindUpperLineQuantities";
import {
  finalizeParsedReceipt,
  parseParsedReceiptJson,
  type ParsedReceipt,
} from "../types/ParsedReceipt";

const fileMarketRawText = `
FİLE MARKET
5 ad X 18.90
SKRPR.KAYISI 500G  *94.50
5 ad X 19.90
LAKTOSUZ SÜT 200ML  *99.50
3 ad X 1.00
ALISVERIS POSETI    *3.00
5.59 kg X 19.50
ÇEKİRDEKSİZ KARPUZ  *109.01
2 ad X 37.50
SADE BAGET 250G  *75.00
`.trim();

const misboundParsed: ParsedReceipt = {
  merchant: {
    title: "FİLE MARKET",
    category: "MARKET",
  },
  metadata: {
    purchaseDate: "2023-07-27",
    currency: "TRY",
  },
  products: [
    {
      name: "SKRPR.KAYISI 500G",
      quantity: 1,
      unit: "ad",
      unitPrice: 94.5,
      lineTotal: 94.5,
    },
    {
      name: "LAKTOSUZSUT200MLSUT",
      quantity: 1,
      unit: "ad",
      unitPrice: 99.9,
      lineTotal: 99.9,
    },
    {
      name: "ALIŞVERİŞ POŞETİ",
      quantity: 1,
      unit: "ad",
      unitPrice: 3,
      lineTotal: 3,
    },
    {
      name: "ÇEKİRDEKSİZ KARPUZ",
      quantity: 1,
      unit: "kg",
      unitPrice: 109.01,
      lineTotal: 109.01,
    },
    {
      name: "SADE BAGET 250G",
      quantity: 1,
      unit: "ad",
      unitPrice: 75,
      lineTotal: 75,
    },
  ],
  payments: [],
  financials: { totalAmount: 381.91 },
  rawText: fileMarketRawText,
};

describe("extractUpperLineBindings", () => {
  it("parses ad and kg multiplier lines directly above product rows", () => {
    const bindings = extractUpperLineBindings(fileMarketRawText);
    expect(bindings).toHaveLength(5);

    const sut = bindings.find((b) => /LAKTOSUZ/i.test(b.nameHint))!;
    expect(sut.quantity).toBe(5);
    expect(sut.unit).toBe("ad");
    expect(sut.unitPrice).toBe(19.9);
    expect(sut.lineTotal).toBe(99.5);

    const bag = bindings.find((b) => /POSET|POŞET/i.test(b.nameHint))!;
    expect(bag.quantity).toBe(3);
    expect(bag.unit).toBe("ad");
    expect(bag.unitPrice).toBe(1);
    expect(bag.lineTotal).toBe(3);

    const karpuz = bindings.find((b) => /KARPUZ/i.test(b.nameHint))!;
    expect(karpuz.quantity).toBe(5.59);
    expect(karpuz.unit).toBe("kg");
    expect(karpuz.unitPrice).toBe(19.5);
    expect(karpuz.lineTotal).toBe(109.01);
  });

  it("parses multiplier lines directly below product rows (Migros layout)", () => {
    const rawText = `
ALGIDA FRIGOLA  *360,00
9 AD x 40,00 TL/AD
MARLBORO EDGE  *460,00
4 AD x 115,00 TL/AD
`.trim();
    const bindings = extractUpperLineBindings(rawText);
    expect(bindings).toHaveLength(2);

    const algida = bindings.find((b) => /FRIGOLA/i.test(b.nameHint))!;
    expect(algida.quantity).toBe(9);
    expect(algida.unitPrice).toBe(40);
    expect(algida.lineTotal).toBe(360);

    const marlboro = bindings.find((b) => /MARLBORO/i.test(b.nameHint))!;
    expect(marlboro.quantity).toBe(4);
    expect(marlboro.unitPrice).toBe(115);
    expect(marlboro.lineTotal).toBe(460);
  });

  it("parses *1 *360 product rows with multiplier above (migros-2125 Frigola)", () => {
    const rawText =
      "9 AD x 40,00 TL/AD\nALGIDA FRIGOLA 60ML *1 *360,00";
    const bindings = extractUpperLineBindings(rawText);
    expect(bindings).toHaveLength(1);
    expect(bindings[0]!.nameHint).toMatch(/FRIGOLA/i);
    expect(bindings[0]!.quantity).toBe(9);
    expect(bindings[0]!.unitPrice).toBe(40);
    expect(bindings[0]!.lineTotal).toBe(360);
  });
});

describe("bindUpperLineQuantities", () => {
  it("rebinds mis-parsed File Market lines from rawText", () => {
    const bound = bindUpperLineQuantities(misboundParsed);

    const sut = bound.products.find((p) => /LAKTOSUZ/i.test(p.name))!;
    expect(sut.quantity).toBe(5);
    expect(sut.unit).toBe("ad");
    expect(sut.unitPrice).toBe(19.9);
    expect(sut.lineTotal).toBe(99.5);

    const bag = bound.products.find((p) => /POŞET|POSET/i.test(p.name))!;
    expect(bag.quantity).toBe(3);
    expect(bag.unitPrice).toBe(1);
    expect(bag.lineTotal).toBe(3);

    const baget = bound.products.find((p) => /BAGET/i.test(p.name))!;
    expect(baget.quantity).toBe(2);
    expect(baget.unitPrice).toBe(37.5);
    expect(baget.lineTotal).toBe(75);
  });

  it("runs inside finalizeParsedReceipt pipeline", () => {
    const finalized = finalizeParsedReceipt(
      parseParsedReceiptJson({
        ...misboundParsed,
        products: misboundParsed.products.slice(0, 2),
        financials: { totalAmount: 194.0 },
      })
    );
    const sut = finalized.products.find((p) => /LAKTOSUZ/i.test(p.name))!;
    expect(sut.quantity).toBe(5);
    expect(sut.unitPrice).toBe(19.9);
  });
});
