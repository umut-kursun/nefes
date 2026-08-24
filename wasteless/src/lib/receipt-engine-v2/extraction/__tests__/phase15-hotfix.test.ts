import { describe, expect, it } from "vitest";
import { extractFooterFirst } from "../footerFirstPass";
import {
  parseAmountFromOcrLine,
  repairOcrAmountToken,
  stripOcrControlChars,
} from "../ocrParseNormalize";

const RECEIPT_B_FOOTER = [
  "MARVEL SPIDEY ÇOKLU %0",
  "MERAKLI MINIK - AYLI %0",
  "*127,22",
  "*1.978,99",
  "*454360********4421",
  "ORTAK POS 1.978,99",
];

describe("label-less footer total (receipt B shape)", () => {
  it("resolves total from bare amount matching explicit payment", () => {
    const { footer } = extractFooterFirst(RECEIPT_B_FOOTER);
    expect(footer.total).toBe(1978.99);
  });

  it("assigns smaller preceding bare amount as VAT when consistent", () => {
    const { footer } = extractFooterFirst(RECEIPT_B_FOOTER);
    expect(footer.vatTotal).toBe(127.22);
  });

  it("does not treat VAT-sized bare amount as total without payment agreement", () => {
    const lines = ["*18,67", "*1118,83", "NAKİT 1118,83"];
    const { footer } = extractFooterFirst(lines);
    expect(footer.total).toBe(1118.83);
    expect(footer.vatTotal).toBe(18.67);
  });

  it("does not pick largest bare amount when payment disagrees", () => {
    const lines = ["*50,00", "*999,00", "ORTAK POS 50,00"];
    const { footer } = extractFooterFirst(lines);
    expect(footer.total).toBe(50);
    expect(footer.total).not.toBe(999);
  });
});

describe("OCR control-character amount normalization (receipt C shape)", () => {
  it("parses VAT line with leading control char", () => {
    expect(parseAmountFromOcrLine("TOPLAM KDV \u00018.67")).toBe(18.67);
  });

  it("parses ÖDENECEK total with control char and duplicated digit glitch", () => {
    expect(parseAmountFromOcrLine("ÖDENECEK KDV Dahil Tutar \u000111,118.83")).toBe(
      1118.83
    );
  });

  it("strips control chars without mutating visible digits", () => {
    expect(stripOcrControlChars("TOPLAM KDV \u00018.67")).toBe("TOPLAM KDV 8.67");
  });

  it("repairs duplicated leading digit only for footer-scale pattern", () => {
    expect(repairOcrAmountToken("x \u000111,118.83", "11,118.83")).toBe("1.118,83");
  });

  it("extracts receipt C footer total end-to-end", () => {
    const lines = [
      "*GLUTENSIZ URUN",
      "TOPLAM KDV \u00018.67",
      "ÖDENECEK KDV Dahil Tutar \u000111,118.83",
      "Ippos Kredi Kartı (1)",
    ];
    const { footer } = extractFooterFirst(lines);
    expect(footer.vatTotal).toBe(18.67);
    expect(footer.total).toBe(1118.83);
  });
});
