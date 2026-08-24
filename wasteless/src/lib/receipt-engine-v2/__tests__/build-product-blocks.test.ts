import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductBlocks } from "../parser/buildProductBlocks";
import { LineKind } from "../tokenizer/LineKind";
import type { TokenizedLine } from "../tokenizer/TokenizedLine";
import { tokenizeReceiptLinesFlat } from "../tokenizer/tokenizeReceiptLines";
import { parseVisionResult } from "../vision/parseVisionResult";

function tok(kind: TokenizedLine["kind"], raw: string): TokenizedLine {
  return { kind, raw };
}

function blocksOf(lines: readonly TokenizedLine[]) {
  return buildProductBlocks(lines).blocks;
}

describe("buildProductBlocks tokenizer verification (migros-644)", () => {
  it("classifies SALATA and its weight line as product then quantity", () => {
    const fixturePath = join(
      process.cwd(),
      "fixtures/vision/ocr-golden/migros-644-ocr.json"
    );
    const data = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      rawText: string;
    };
    const ocrLines = data.rawText.split(/\r?\n/).filter((line) => line.length > 0);
    const tokens = tokenizeReceiptLinesFlat(ocrLines);

    const salataIndex = ocrLines.findIndex((line) => line.includes("SALATA ATOM ADET"));
    expect(salataIndex).toBeGreaterThanOrEqual(0);
    expect(tokens[salataIndex]).toEqual({
      kind: LineKind.ProductCandidate,
      raw: ocrLines[salataIndex],
    });
    expect(tokens[salataIndex + 1]).toEqual({
      kind: LineKind.QuantityDetail,
      raw: ocrLines[salataIndex + 1],
    });
    expect(ocrLines[salataIndex + 1]).toContain("0.900 KG");
  });
});

describe("buildProductBlocks", () => {
  it("binds quantity_detail to the current product block", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "BURCU NAPOLITEN SOS %1 *74,95"),
      tok(LineKind.QuantityDetail, "3 AD x 25,90 TL/AD"),
      tok(LineKind.ProductCandidate, "İÇİM RAHAAT LAKTOSUZ %1 *77,70"),
      tok(LineKind.GrandTotal, "TOPLAM *2.125,57"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "BURCU NAPOLITEN SOS %1 *74,95",
        quantityLine: "3 AD x 25,90 TL/AD",
        discountLines: [],
      },
      {
        productLine: "İÇİM RAHAAT LAKTOSUZ %1 *77,70",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("binds Migros weighted quantity to the current product", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "SALATA ATOM ADET  %1  *42,95"),
      tok(LineKind.QuantityDetail, "0.900 KG x 59,95 TL/KG"),
      tok(LineKind.ProductCandidate, "HIYAR BADEM PKT KG.  %1  *53,96"),
      tok(LineKind.QuantityDetail, "0.125 KG x 139,95 TL/KG"),
      tok(LineKind.Subtotal, "ARA TOPLAM  *644,05"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "SALATA ATOM ADET  %1  *42,95",
        quantityLine: "0.900 KG x 59,95 TL/KG",
        discountLines: [],
      },
      {
        productLine: "HIYAR BADEM PKT KG.  %1  *53,96",
        quantityLine: "0.125 KG x 139,95 TL/KG",
        discountLines: [],
      },
    ]);
  });

  it("binds multiple consecutive weighted products independently", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "SALATA ATOM ADET  %1  *42,95"),
      tok(LineKind.QuantityDetail, "0.900 KG x 59,95 TL/KG"),
      tok(LineKind.ProductCandidate, "HIYAR BADEM PKT KG.  %1  *53,96"),
      tok(LineKind.QuantityDetail, "0.125 KG x 139,95 TL/KG"),
      tok(LineKind.ProductCandidate, "BIBER SIVRI(1) KG  %1  *17,49"),
      tok(LineKind.QuantityDetail, "2 AD x 20,00 TL/AD"),
      tok(LineKind.GrandTotal, "TOPLAM  *644,05"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "SALATA ATOM ADET  %1  *42,95",
        quantityLine: "0.900 KG x 59,95 TL/KG",
        discountLines: [],
      },
      {
        productLine: "HIYAR BADEM PKT KG.  %1  *53,96",
        quantityLine: "0.125 KG x 139,95 TL/KG",
        discountLines: [],
      },
      {
        productLine: "BIBER SIVRI(1) KG  %1  *17,49",
        quantityLine: "2 AD x 20,00 TL/AD",
        discountLines: [],
      },
    ]);
  });

  it("attaches Migros discounts that follow their product line", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "SFRESH PATAIES 1 KG  %1  *229,95"),
      tok(LineKind.DiscountCandidate, "% 25 % INDIRIM  %1  *-57,49"),
      tok(LineKind.ProductCandidate, "UZMAN KASAP KLASIK K  %1  *275,95"),
      tok(LineKind.DiscountCandidate, "% 20 % INDIRIM  %1  *-55,19"),
      tok(LineKind.GrandTotal, "TOPLAM  *2.125,57"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "SFRESH PATAIES 1 KG  %1  *229,95",
        quantityLine: null,
        discountLines: ["% 25 % INDIRIM  %1  *-57,49"],
      },
      {
        productLine: "UZMAN KASAP KLASIK K  %1  *275,95",
        quantityLine: null,
        discountLines: ["% 20 % INDIRIM  %1  *-55,19"],
      },
    ]);
  });

  it("groups restaurant products without quantities or discounts", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.MerchantHeader, "LEZZET RESTORAN A.S."),
      tok(LineKind.Metadata, "29.07.2026 21:30"),
      tok(LineKind.ProductCandidate, "Corba %10 85,00"),
      tok(LineKind.ProductCandidate, "Izgara %10 320,00"),
      tok(LineKind.GrandTotal, "TOPLAM 405,00"),
      tok(LineKind.PaymentHeader, "Nakit 405,00"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "Corba %10 85,00",
        quantityLine: null,
        discountLines: [],
      },
      {
        productLine: "Izgara %10 320,00",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("handles a simple single-product receipt", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "SU 0,5L  %1  *15,00"),
      tok(LineKind.GrandTotal, "TOPLAM *15,00"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "SU 0,5L  %1  *15,00",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("keeps product without quantity when no quantity_detail follows it", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "MARLBORO TBLUE PAKET *1 *460,00"),
      tok(LineKind.GrandTotal, "TOPLAM *460,00"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "MARLBORO TBLUE PAKET *1 *460,00",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("accumulates multiple discount lines on one product", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "ITEM A %10 *100,00"),
      tok(LineKind.DiscountCandidate, "INDIRIM %10 *-10,00"),
      tok(LineKind.DiscountCandidate, "KUPON %10 *-5,00"),
      tok(LineKind.ProductCandidate, "ITEM B %10 *50,00"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "ITEM A %10 *100,00",
        quantityLine: null,
        discountLines: ["INDIRIM %10 *-10,00", "KUPON %10 *-5,00"],
      },
      {
        productLine: "ITEM B %10 *50,00",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("uses the latest quantity_detail when multiple follow one product", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "ITEM A %10 *100,00"),
      tok(LineKind.QuantityDetail, "2 AD x 20,00 TL/AD"),
      tok(LineKind.QuantityDetail, "4 AD x 115,00 TL/AD"),
      tok(LineKind.ProductCandidate, "ITEM B %10 *50,00"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "ITEM A %10 *100,00",
        quantityLine: "4 AD x 115,00 TL/AD",
        discountLines: [],
      },
      {
        productLine: "ITEM B %10 *50,00",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("ignores quantity_detail lines that appear before the first product", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.QuantityDetail, "2 AD x 20,00 TL/AD"),
      tok(LineKind.ProductCandidate, "MARLBORO TBLUE PAKET *1 *460,00"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "MARLBORO TBLUE PAKET *1 *460,00",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("stops at subtotal, VAT, payment, and footer lines", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.ProductCandidate, "ITEM %10 *10,00"),
      tok(LineKind.Subtotal, "ARA TOPLAM *10,00"),
      tok(LineKind.VatTotal, "TOPKDV *1,00"),
      tok(LineKind.ProductCandidate, "SHOULD NOT APPEAR"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "ITEM %10 *10,00",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("preserves original raw text verbatim in output", () => {
    const raw = "  ALGIDA FRIGOLA 60ML *1 *360,00  ";
    const lines: TokenizedLine[] = [tok(LineKind.ProductCandidate, raw)];

    expect(blocksOf(lines)[0]?.productLine).toBe(raw);
  });

  it("ignores charge, metadata, and unknown lines without creating blocks", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.Metadata, "FIS NO:0220"),
      tok(LineKind.ChargeCandidate, "MIGROS PLASTIK POSET  %20  *1,00"),
      tok(LineKind.Unknown, "(modifier line)"),
      tok(LineKind.ProductCandidate, "SOFRA EKMEK ADET  %1  *20,00"),
      tok(LineKind.GrandTotal, "TOPLAM *20,00"),
    ];

    expect(blocksOf(lines)).toEqual([
      {
        productLine: "SOFRA EKMEK ADET  %1  *20,00",
        quantityLine: null,
        discountLines: [],
      },
    ]);
  });

  it("groups full migros-644 receipt blocks from real tokenizer output", () => {
    const fixturePath = join(
      process.cwd(),
      "fixtures/vision/ocr-golden/migros-644-ocr.json"
    );
    const data = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      rawText: string;
    };
    const ocrLines = data.rawText.split(/\r?\n/).filter((line) => line.length > 0);
    const vision = parseVisionResult({
      rawText: data.rawText,
      lines: ocrLines,
      merchant: { rawName: "MIGROS TICARET A.S." },
    });
    const tokens = tokenizeReceiptLinesFlat(vision.lines);
    const blocks = blocksOf(tokens);

    expect(blocks[0]).toEqual({
      productLine: "SALATA ATOM ADET  %1  *42,95",
      quantityLine: "0.900 KG x 59,95 TL/KG",
      discountLines: [],
    });
    expect(blocks[1]).toEqual({
      productLine: "HIYAR BADEM PKT KG.  %1  *53,96",
      quantityLine: "0.125 KG x 139,95 TL/KG",
      discountLines: [],
    });
    expect(blocks[blocks.length - 1]?.discountLines).toEqual([
      "iNDiRiM  %10  *-50,00",
    ]);
  });
});
