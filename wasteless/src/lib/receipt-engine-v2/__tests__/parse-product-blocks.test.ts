import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductBlocks } from "../parser/buildProductBlocks";
import type { ProductBlock } from "../parser/ProductBlock";
import { parseProductBlock, parseProductBlocks } from "../parser/parseProductBlocks";
import { tokenizeReceiptLinesFlat } from "../tokenizer/tokenizeReceiptLines";

function block(
  productLine: string,
  quantityLine: string | null = null,
  discountLines: string[] = []
): ProductBlock {
  return { productLine, quantityLine, discountLines };
}

function parseOne(
  productLine: string,
  quantityLine: string | null = null,
  discountLines: string[] = []
) {
  return parseProductBlock(block(productLine, quantityLine, discountLines));
}

function loadOcrLines(relativePath: string): string[] {
  const text = readFileSync(join(process.cwd(), relativePath), "utf8");
  return text.split(/\r?\n/).filter((line) => line.length > 0);
}

describe("parseProductBlock", () => {
  it("parses BURCU SOS with default quantity 1 and line total as unit price", () => {
    expect(parseOne("BURCU NAPOLITEN SOS %1 *74,95")).toEqual({
      rawName: "BURCU NAPOLITEN SOS",
      quantity: 1,
      unit: "ad",
      unitPrice: 74.95,
      lineTotal: 74.95,
      vatRate: 1,
      discounts: [],
    });
  });

  it("parses quantity line bound to İÇİM product", () => {
    expect(
      parseOne("İÇİM RAHAAT LAKTOZSUZ %1 *77,70", "3 AD x 25,90 TL/AD")
    ).toEqual({
      rawName: "İÇİM RAHAAT LAKTOZSUZ",
      quantity: 3,
      unit: "ad",
      unitPrice: 25.9,
      lineTotal: 77.7,
      vatRate: 1,
      discounts: [],
    });
  });

  it("parses MARLBORO with multiplier quantity line", () => {
    expect(
      parseOne("MARLBORO TBLUE PAKET %0 *460,00", "4 AD x 115,00 TL/AD")
    ).toEqual({
      rawName: "MARLBORO TBLUE PAKET",
      quantity: 4,
      unit: "ad",
      unitPrice: 115,
      lineTotal: 460,
      vatRate: 0,
      discounts: [],
    });
  });

  it("parses embedded 1 KG quantity from product line", () => {
    expect(parseOne("FRESH PATATES 1 KG %1 *229,95")).toEqual({
      rawName: "FRESH PATATES",
      quantity: 1,
      unit: "kg",
      unitPrice: 229.95,
      lineTotal: 229.95,
      vatRate: 1,
      discounts: [],
    });
  });

  it("parses Migros discount lines on the same block", () => {
    expect(
      parseOne("SFRESH PATAIES 1 KG  %1  *229,95", null, [
        "% 25 % INDIRIM  %1  *-57,49",
      ])
    ).toEqual({
      rawName: "SFRESH PATAIES",
      quantity: 1,
      unit: "kg",
      unitPrice: 229.95,
      lineTotal: 229.95,
      vatRate: 1,
      discounts: [{ rawText: "% 25 % INDIRIM  %1  *-57,49", amount: -57.49 }],
    });
  });

  it("parses simple discount amount", () => {
    const parsed = parseOne("ITEM %10 *100,00", null, ["%25 İNDİRİM *-57,49"]);
    expect(parsed.discounts).toEqual([
      { rawText: "%25 İNDİRİM *-57,49", amount: -57.49 },
    ]);
  });

  it("parses weighted KG quantity line", () => {
    expect(
      parseOne("BIBER SIVRI(1) KG  %1  *17,49", "0.900 KG x 59,95 TL/KG")
    ).toEqual({
      rawName: "BIBER SIVRI(1) KG",
      quantity: 0.9,
      unit: "kg",
      unitPrice: 59.95,
      lineTotal: 17.49,
      vatRate: 1,
      discounts: [],
    });
  });

  it("parses HIYAR block without quantity line as single unit", () => {
    expect(parseOne("HIYAR BADEM PKT KG.  %1  *53,96")).toEqual({
      rawName: "HIYAR BADEM PKT KG.",
      quantity: 1,
      unit: "ad",
      unitPrice: 53.96,
      lineTotal: 53.96,
      vatRate: 1,
      discounts: [],
    });
  });

  it("parses ALGIDA with 9 AD multiplier line", () => {
    expect(
      parseOne("ALGIDA FRIGOLA 60ML *1 *360,00", "9 AD x 40,00 TL/AD")
    ).toEqual({
      rawName: "ALGIDA FRIGOLA 60ML",
      quantity: 9,
      unit: "ad",
      unitPrice: 40,
      lineTotal: 360,
      vatRate: null,
      discounts: [],
    });
  });

  it("parses restaurant lines without asterisk totals", () => {
    expect(parseOne("Corba %10 85,00")).toEqual({
      rawName: "Corba",
      quantity: 1,
      unit: "ad",
      unitPrice: 85,
      lineTotal: 85,
      vatRate: 10,
      discounts: [],
    });

    expect(parseOne("Izgara %10 320,00")).toEqual({
      rawName: "Izgara",
      quantity: 1,
      unit: "ad",
      unitPrice: 320,
      lineTotal: 320,
      vatRate: 10,
      discounts: [],
    });
  });

  it("parses multiple discounts on one block", () => {
    const parsed = parseOne("ITEM A %10 *100,00", null, [
      "INDIRIM %10 *-10,00",
      "KUPON %10 *-5,00",
    ]);
    expect(parsed.discounts).toEqual([
      { rawText: "INDIRIM %10 *-10,00", amount: -10 },
      { rawText: "KUPON %10 *-5,00", amount: -5 },
    ]);
  });

  it("strips leading promo markers from product name", () => {
    expect(parseOne("** VIVIDENT 45DK CUZ  %1  *39,95").rawName).toBe(
      "VIVIDENT 45DK CUZ"
    );
  });
});

describe("parseProductBlocks", () => {
  it("maps each ProductBlock to exactly one ParsedProduct", () => {
    const blocks = [
      block("A %1 *1,00"),
      block("B %1 *2,00", "2 AD x 1,00 TL/AD"),
    ];
    const { products } = parseProductBlocks(blocks);
    expect(products).toHaveLength(2);
  });
});

describe("parseProductBlocks Migros integration", () => {
  it("parses Migros 2125 excerpt through tokenizer and block builder", () => {
    const ocrLines = [
      "BURCU NAPOLITEN SOS  %1  *74,95",
      "3 AD x 25,90 TL/AD",
      "ICIM RAHAT LAKTOZSUZ  %1  *77,70",
      "SFRESH PATAIES 1 KG  %1  *229,95",
      "% 25 % INDIRIM  %1  *-57,49",
      "UZMAN KASAP KLASIK K  %1  *275,95",
      "9 AD x 40,00 TL/AD",
      "ALGIDA FRIGOLA 60ML *1 *360,00",
      "4 AD x 115,00 TL/AD",
      "MARLBORO TBLUE PAKET *1 *460,00",
      "TOPLAM  *2.125,57",
    ];

    const tokens = tokenizeReceiptLinesFlat(ocrLines);
    const { blocks } = buildProductBlocks(tokens);
    const { products } = parseProductBlocks(blocks);

    expect(products).toHaveLength(6);

    expect(products[0]).toMatchObject({
      rawName: "BURCU NAPOLITEN SOS",
      quantity: 3,
      unitPrice: 25.9,
      lineTotal: 74.95,
    });

    expect(products[1]).toMatchObject({
      rawName: "ICIM RAHAT LAKTOZSUZ",
      quantity: 1,
      lineTotal: 77.7,
    });

    expect(products[2]).toMatchObject({
      rawName: "SFRESH PATAIES",
      quantity: 1,
      unit: "kg",
      discounts: [{ amount: -57.49 }],
    });

    expect(products[4]).toMatchObject({
      rawName: "ALGIDA FRIGOLA 60ML",
      quantity: 4,
      unitPrice: 115,
      lineTotal: 360,
    });

    expect(products[5]).toMatchObject({
      rawName: "MARLBORO TBLUE PAKET",
      quantity: 1,
      lineTotal: 460,
    });
  });

  it("parses Migros weighted products from 644-style OCR excerpt", () => {
    const ocrLines = [
      "HIYAR BADEM PKT KG.  %1  *53,96",
      "0.900 KG x 59,95 TL/KG",
      "BIBER SIVRI(1) KG  %1  *17,49",
      "2 AD x 20,00 TL/AD",
      "SOFRA EKMEK ADET  %1  *40,00",
      "TOPLAM  *644,05",
    ];

    const tokens = tokenizeReceiptLinesFlat(ocrLines);
    const { blocks } = buildProductBlocks(tokens);
    const { products } = parseProductBlocks(blocks);

    expect(products).toHaveLength(3);

    expect(products[0]).toMatchObject({
      rawName: "HIYAR BADEM PKT KG.",
      quantity: 0.9,
      unit: "kg",
      unitPrice: 59.95,
      lineTotal: 53.96,
    });

    expect(products[1]).toMatchObject({
      rawName: "BIBER SIVRI(1) KG",
      quantity: 2,
      unit: "ad",
      unitPrice: 20,
      lineTotal: 17.49,
    });

    expect(products[2]).toMatchObject({
      rawName: "SOFRA EKMEK ADET",
      quantity: 1,
      lineTotal: 40,
    });
  });

  it("parses restaurant fixture OCR end-to-end", () => {
    const ocrLines = loadOcrLines(
      "src/lib/receipt-engine/fixtures/corpus/lezzet-restaurant/ocr.txt"
    );
    const tokens = tokenizeReceiptLinesFlat(ocrLines);
    const { blocks } = buildProductBlocks(tokens);
    const { products } = parseProductBlocks(blocks);

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      rawName: "Corba",
      lineTotal: 85,
      vatRate: 10,
    });
    expect(products[1]).toMatchObject({
      rawName: "Izgara",
      lineTotal: 320,
      vatRate: 10,
    });
  });
});
