import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFooter } from "../footer/parseFooter";
import { LineKind } from "../tokenizer/LineKind";
import type { TokenizedLine } from "../tokenizer/TokenizedLine";
import { tokenizeReceiptLinesFlat } from "../tokenizer/tokenizeReceiptLines";

function tok(kind: TokenizedLine["kind"], raw: string): TokenizedLine {
  return { kind, raw };
}

function loadOcrLines(relativePath: string): string[] {
  const text = readFileSync(join(process.cwd(), relativePath), "utf8");
  return text.split(/\r?\n/).filter((line) => line.length > 0);
}

describe("parseFooter", () => {
  it("parses VAT total from TOPKDV line", () => {
    expect(parseFooter([tok(LineKind.VatTotal, "TOPKDV *52,85")])).toEqual({
      subtotal: null,
      total: null,
      vatTotal: 52.85,
      payments: [],
    });
  });

  it("parses subtotal from ARA TOPLAM line", () => {
    expect(parseFooter([tok(LineKind.Subtotal, "ARA TOPLAM *1200,00")])).toEqual({
      subtotal: 1200,
      total: null,
      vatTotal: null,
      payments: [],
    });
  });

  it("parses grand total from TOPLAM line", () => {
    expect(parseFooter([tok(LineKind.GrandTotal, "TOPLAM *2125,57")])).toEqual({
      subtotal: null,
      total: 2125.57,
      vatTotal: null,
      payments: [],
    });
  });

  it("parses credit card payment header followed by amount line", () => {
    expect(
      parseFooter([
        tok(LineKind.PaymentHeader, "BANKA/KREDİ KARTI"),
        tok(LineKind.PaymentAmount, "*2125,57"),
      ])
    ).toEqual({
      subtotal: null,
      total: null,
      vatTotal: null,
      payments: [
        {
          type: "credit_card",
          amount: 2125.57,
          rawLabel: "BANKA/KREDİ KARTI",
        },
      ],
    });
  });

  it("parses cash payment with star amount", () => {
    expect(
      parseFooter([
        tok(LineKind.PaymentHeader, "NAKİT"),
        tok(LineKind.PaymentAmount, "*250"),
      ])
    ).toEqual({
      subtotal: null,
      total: null,
      vatTotal: null,
      payments: [
        {
          type: "cash",
          amount: 250,
          rawLabel: "NAKİT",
        },
      ],
    });
  });

  it("classifies meal card payment labels", () => {
    expect(parseFooter([tok(LineKind.PaymentHeader, "MULTINET")])).toMatchObject({
      payments: [{ type: "meal_card", amount: null, rawLabel: "MULTINET" }],
    });

    expect(parseFooter([tok(LineKind.PaymentHeader, "Ticket")])).toMatchObject({
      payments: [{ type: "meal_card", amount: null, rawLabel: "Ticket" }],
    });

    expect(parseFooter([tok(LineKind.PaymentHeader, "Sodexo")])).toMatchObject({
      payments: [{ type: "meal_card", amount: null, rawLabel: "Sodexo" }],
    });
  });

  it("ignores product, quantity, discount, and metadata lines", () => {
    expect(
      parseFooter([
        tok(LineKind.ProductCandidate, "BURCU NAPOLITEN SOS %1 *74,95"),
        tok(LineKind.QuantityDetail, "3 AD x 25,90 TL/AD"),
        tok(LineKind.DiscountCandidate, "%25 İNDİRİM *-57,49"),
        tok(LineKind.Metadata, "FIS NO:0220"),
        tok(LineKind.GrandTotal, "TOPLAM *100,00"),
      ])
    ).toEqual({
      subtotal: null,
      total: 100,
      vatTotal: null,
      payments: [],
    });
  });

  it("parses Migros footer totals", () => {
    const lines: TokenizedLine[] = [
      tok(LineKind.Subtotal, "ARA TOPLAM  *2.125,57"),
      tok(LineKind.VatTotal, "TOPKDV  *52,85"),
      tok(LineKind.GrandTotal, "TOPLAM  *2.125,57"),
    ];

    expect(parseFooter(lines)).toEqual({
      subtotal: 2125.57,
      total: 2125.57,
      vatTotal: 52.85,
      payments: [],
    });
  });

  it("parses restaurant cash payment on one line", () => {
    expect(
      parseFooter([
        tok(LineKind.GrandTotal, "TOPLAM 405,00"),
        tok(LineKind.PaymentHeader, "Nakit 405,00"),
      ])
    ).toEqual({
      subtotal: null,
      total: 405,
      vatTotal: null,
      payments: [
        {
          type: "cash",
          amount: 405,
          rawLabel: "Nakit",
        },
      ],
    });
  });

  it("parses fuel receipt credit card payment", () => {
    expect(
      parseFooter([
        tok(LineKind.GrandTotal, "TOPLAM 1917,82"),
        tok(LineKind.PaymentHeader, "Kredi Kart 2356,10"),
      ])
    ).toEqual({
      subtotal: null,
      total: 1917.82,
      vatTotal: null,
      payments: [
        {
          type: "credit_card",
          amount: 2356.1,
          rawLabel: "Kredi Kart",
        },
      ],
    });
  });

  it("parses inline credit card payment from cafe POS", () => {
    expect(
      parseFooter([
        tok(LineKind.VatTotal, "TOPKDV  *56,82"),
        tok(LineKind.GrandTotal, "TOPLAM  *625,00"),
        tok(LineKind.PaymentHeader, "Kredi Kartı  *625,00"),
      ])
    ).toEqual({
      subtotal: null,
      total: 625,
      vatTotal: 56.82,
      payments: [
        {
          type: "credit_card",
          amount: 625,
          rawLabel: "Kredi Kartı",
        },
      ],
    });
  });

  it("parses meal card receipt with header and amount", () => {
    expect(
      parseFooter([
        tok(LineKind.GrandTotal, "TOPLAM *120,00"),
        tok(LineKind.PaymentHeader, "MULTINET"),
        tok(LineKind.PaymentAmount, "*120,00"),
      ])
    ).toEqual({
      subtotal: null,
      total: 120,
      vatTotal: null,
      payments: [
        {
          type: "meal_card",
          amount: 120,
          rawLabel: "MULTINET",
        },
      ],
    });
  });
});

describe("parseFooter integration", () => {
  it("extracts Migros footer from tokenized OCR excerpt", () => {
    const ocrLines = [
      "MARLBORO TBLUE PAKET *1 *460,00",
      "ARA TOPLAM  *2.125,57",
      "TOPKDV  *52,85",
      "TOPLAM  *2.125,57",
    ];
    const footer = parseFooter(tokenizeReceiptLinesFlat(ocrLines));

    expect(footer).toEqual({
      subtotal: 2125.57,
      total: 2125.57,
      vatTotal: 52.85,
      payments: [],
    });
  });

  it("extracts restaurant footer from fixture OCR", () => {
    const ocrLines = loadOcrLines(
      "src/lib/receipt-engine/fixtures/corpus/lezzet-restaurant/ocr.txt"
    );
    const footer = parseFooter(tokenizeReceiptLinesFlat(ocrLines));

    expect(footer.total).toBe(405);
    expect(footer.payments).toEqual([
      { type: "cash", amount: 405, rawLabel: "Nakit" },
    ]);
  });

  it("extracts fuel footer from fixture OCR", () => {
    const ocrLines = loadOcrLines(
      "src/lib/receipt-engine/fixtures/corpus/opet-benzin/ocr.txt"
    );
    const footer = parseFooter(tokenizeReceiptLinesFlat(ocrLines));

    expect(footer.total).toBe(1917.82);
    expect(footer.payments[0]).toMatchObject({
      type: "unknown",
      amount: 1917.82,
    });
  });
});
