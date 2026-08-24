import { describe, expect, it } from "vitest";
import { classifyLayout } from "../../core/classifyLayout";
import { defaultParserRegistry } from "../../core/ParserRegistry";
import { tokenizeReceiptLinesFlat } from "../../tokenizer/tokenizeReceiptLines";
import { parseVisionResult } from "../../vision/parseVisionResult";

function visionFromLines(lines: string[], merchant?: string) {
  return parseVisionResult({
    rawText: lines.join("\n"),
    lines,
    merchant: merchant ? { rawName: merchant } : undefined,
  });
}

describe("classifyLayout", () => {
  it("classifies Migros as supermarket", () => {
    const lines = [
      "MIGROS TICARET A.S.",
      "SALATA ATOM ADET  %1  *42,95",
      "0.900 KG x 59,95 TL/KG",
      "TOPLAM  *644,05",
    ];
    const vision = visionFromLines(lines, "MIGROS TICARET A.S.");
    const tokens = tokenizeReceiptLinesFlat(lines);
    const result = classifyLayout(vision, tokens);

    expect(result.family).toBe("supermarket");
    expect(result.confidence).toBeGreaterThanOrEqual(0.35);
    expect(result.signals.some((s) => s.includes("migros"))).toBe(true);
  });

  it("classifies fuel receipts", () => {
    const lines = [
      "3-KARDEŞ AKARYAKIT",
      "35,85 LT X 77,21",
      "MOTORİN EURO",
      "TOPLAM",
      "*2.767,98",
    ];
    const vision = visionFromLines(lines, "3-KARDEŞ AKARYAKIT");
    const tokens = tokenizeReceiptLinesFlat(lines);
    const result = classifyLayout(vision, tokens);

    expect(result.family).toBe("fuel");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("classifies McDonald's as fast_food", () => {
    const lines = [
      "ANADOLU RESTORAN ISL. LTD. STI.",
      "McD SILIVRI DT",
      "McCrispy Deluxe M3 %10 *545,00",
      "(McCrispy Deluxe)",
      "TOPLAM *1.295,00",
    ];
    const vision = visionFromLines(lines);
    const tokens = tokenizeReceiptLinesFlat(lines);
    const result = classifyLayout(vision, tokens);

    expect(result.family).toBe("fast_food");
  });
});

describe("defaultParserRegistry", () => {
  it("selects supermarket parser for Migros", () => {
    const lines = [
      "MIGROS TICARET A.S.",
      "EKMEK 750 GR  %1  *15,00",
      "ARA TOPLAM  *15,00",
      "TOPLAM  *15,00",
    ];
    const vision = visionFromLines(lines, "MIGROS TICARET A.S.");
    const tokens = tokenizeReceiptLinesFlat(lines);
    const classification = classifyLayout(vision, tokens);

    const outcome = defaultParserRegistry.classifyAndParse({
      vision,
      tokens,
      classification,
    });

    expect(outcome.parserId).toBe("supermarket-v1");
    expect(outcome.parsePath).toMatch(/rule|hybrid/);
  });

  it("falls back to generic for unknown layout", () => {
    const lines = ["UNKNOWN SHOP", "ITEM  %10  *50,00", "TOPLAM  *50,00"];
    const vision = visionFromLines(lines);
    const tokens = tokenizeReceiptLinesFlat(lines);
    const classification = classifyLayout(vision, tokens);

    const outcome = defaultParserRegistry.classifyAndParse({
      vision,
      tokens,
      classification,
    });

    expect(outcome.parserId).toBe("generic-v1");
    expect(outcome.parsePath).toBe("generic");
  });
});
