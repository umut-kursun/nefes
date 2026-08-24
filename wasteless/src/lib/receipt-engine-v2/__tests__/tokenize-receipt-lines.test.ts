import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LineKind } from "../tokenizer/LineKind";
import { tokenizeReceiptLinesFlat } from "../tokenizer/tokenizeReceiptLines";

function expectKinds(lines: readonly string[], expected: string[]): void {
  const result = tokenizeReceiptLinesFlat(lines);
  expect(result).toHaveLength(lines.length);
  expect(result.map((t) => t.kind)).toEqual(expected);
  for (let i = 0; i < lines.length; i++) {
    expect(result[i]!.raw).toBe(lines[i]);
  }
}

function loadFixture(relativePath: string): string[] {
  const text = readFileSync(
    join(process.cwd(), relativePath),
    "utf8"
  );
  return text.split(/\r?\n/).filter((line) => line.length > 0);
}

describe("tokenizeReceiptLines", () => {
  it("labels Migros footer example lines from sprint spec", () => {
    expectKinds(
      [
        "BURCU NAPOLITEN SOS %1 *74,95",
        "3 AD x 25,90 TL/AD",
        "%25 İNDİRİM *-57,49",
        "TOPKDV *52,85",
        "TOPLAM *2.125,57",
        "BANKA/KREDİ KARTI",
        "*2125,57",
      ],
      [
        LineKind.ProductCandidate,
        LineKind.QuantityDetail,
        LineKind.DiscountCandidate,
        LineKind.VatTotal,
        LineKind.GrandTotal,
        LineKind.PaymentHeader,
        LineKind.OrphanAmount,
      ]
    );
  });

  it("tokenizes Migros 2125 receipt lines without merging or skipping", () => {
    const lines = [
      "MIGROS TICARET A.S.",
      "INONU CD SILIVRI ISTANBUL M JET SIS MGZ.",
      "TARIH:31/07/2026 SAAT:19:26",
      "FIS NO:0220",
      "#6002080104801290",
      "BURCU NAPOLITEN SOS  %1  *74,95",
      "MIGROS PLASTIK POSET  %20  *1,00",
      "3 AD x 25,90 TL/AD",
      "% 25 % INDIRIM  %1  *-57,49",
      "9 AD x 40,00 TL/AD",
      "ALGIDA FRIGOLA 60ML *1 *360,00",
      "ARA TOPLAM  *2.125,57",
      "TOPKDV  *52,85",
      "TOPLAM  *2.125,57",
    ];

    expectKinds(lines, [
      LineKind.MerchantHeader,
      LineKind.MerchantHeader,
      LineKind.Metadata,
      LineKind.Metadata,
      LineKind.Metadata,
      LineKind.ProductCandidate,
      LineKind.ChargeCandidate,
      LineKind.QuantityDetail,
      LineKind.DiscountCandidate,
      LineKind.QuantityDetail,
      LineKind.ProductCandidate,
      LineKind.Subtotal,
      LineKind.VatTotal,
      LineKind.GrandTotal,
    ]);
  });

  it("tokenizes Migros weighted and discount variants", () => {
    expectKinds(
      [
        "0.900 KG x 59,95 TL/KG",
        "2 AD x 20,00 TL/AD",
        "iNDiRiM  %10  *-50,00",
        "2 AD x 1,00 TL/AD",
      ],
      [
        LineKind.QuantityDetail,
        LineKind.QuantityDetail,
        LineKind.DiscountCandidate,
        LineKind.QuantityDetail,
      ]
    );
  });

  it("tokenizes restaurant receipt lines", () => {
    const fixtureLines = loadFixture(
      "src/lib/receipt-engine/fixtures/corpus/lezzet-restaurant/ocr.txt"
    );

    expectKinds(fixtureLines, [
      LineKind.MerchantHeader,
      LineKind.Metadata,
      LineKind.ProductCandidate,
      LineKind.ProductCandidate,
      LineKind.GrandTotal,
      LineKind.PaymentHeader,
    ]);
  });

  it("tokenizes cafe POS receipt with VAT and payment", () => {
    expectKinds(
      [
        "BİRİNCİ PROFİTEROL",
        "TARİH: 30-07-2026",
        "FİŞ NO: 0013",
        "TATLI  %10  *625,00",
        "TOPKDV  *56,82",
        "TOPLAM  *625,00",
        "Kredi Kartı  *625,00",
      ],
      [
        LineKind.Unknown,
        LineKind.Metadata,
        LineKind.Metadata,
        LineKind.ProductCandidate,
        LineKind.VatTotal,
        LineKind.GrandTotal,
        LineKind.PaymentHeader,
      ]
    );
  });

  it("tokenizes McDonald's combo modifier lines as unknown", () => {
    expectKinds(
      ["(McCrispy Deluxe)", "(Super Coca Cola)", "McCrispy Deluxe M3 %10 *545,00"],
      [LineKind.Unknown, LineKind.Unknown, LineKind.ProductCandidate]
    );
  });

  it("tokenizes fuel station receipt lines", () => {
    const fixtureLines = loadFixture(
      "src/lib/receipt-engine/fixtures/corpus/opet-benzin/ocr.txt"
    );

    expectKinds(fixtureLines, [
      LineKind.MerchantHeader,
      LineKind.Metadata,
      LineKind.Metadata,
      LineKind.ProductCandidate,
      LineKind.PaymentAmount,
      LineKind.GrandTotal,
    ]);
  });

  it("tokenizes shell fuel receipt patterns", () => {
    const lines = loadFixture(
      "src/lib/receipt-engine/fixtures/corpus/shell-motorin/ocr.txt"
    );
    const result = tokenizeReceiptLinesFlat(lines);
    expect(result.length).toBe(lines.length);
    expect(result.some((l) => l.kind === LineKind.MerchantHeader)).toBe(true);
    expect(result.some((l) => l.kind === LineKind.GrandTotal)).toBe(true);
  });

  it("tokenizes e-Arşiv / Mavi-style invoice lines", () => {
    const fixtureLines = loadFixture(
      "src/lib/receipt-engine-v3/fixtures/golden/cases/e-arsiv/ocr.txt"
    );

    expectKinds(fixtureLines, [
      LineKind.MerchantHeader,
      LineKind.Metadata,
      LineKind.Metadata,
      LineKind.Metadata,
      LineKind.ProductCandidate,
      LineKind.GrandTotal,
      LineKind.PaymentHeader,
      LineKind.Unknown,
    ]);
  });

  it("tokenizes a simple single-line product receipt", () => {
    expectKinds(["SU 0,5L  %1  *15,00"], [LineKind.ProductCandidate]);
  });

  it("returns empty for blank OCR lines", () => {
    expectKinds(["", "   ", "SU *10,00"], [LineKind.Empty, LineKind.Empty, LineKind.ProductCandidate]);
  });

  it("produces exactly one TokenizedLine per OCR line", () => {
    const lines = ["A", "B", "C"];
    const result = tokenizeReceiptLinesFlat(lines);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.raw)).toEqual(lines);
  });

  it("never assigns purchase-level kinds outside the LineKind enum", () => {
    const lines = loadFixture(
      "src/lib/receipt-engine/fixtures/corpus/migros-ortak-pos/ocr.txt"
    );
    const allowed = new Set(Object.values(LineKind));
    for (const token of tokenizeReceiptLinesFlat(lines)) {
      expect(allowed.has(token.kind)).toBe(true);
    }
  });
});
