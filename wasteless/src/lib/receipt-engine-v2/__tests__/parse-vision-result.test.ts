import { describe, expect, it } from "vitest";
import { parseVisionResult } from "../vision/parseVisionResult";

describe("parseVisionResult", () => {
  it("normalizes OCR-only fields and ignores purchase semantics", () => {
    const result = parseVisionResult({
      merchant: {
        rawName: "MIGROS TÜRK",
        rawAddress: "İSTANBUL",
        rawTaxNumber: "1234567890",
      },
      metadata: {
        receiptNumber: "0042",
        purchaseDate: "2026-08-05",
        purchaseTime: "14:30:00",
        currency: "TL",
      },
      rawText: "MIGROS TÜRK\nTOPLAM 120,00",
      lines: ["MIGROS TÜRK", "TOPLAM 120,00"],
      confidence: 0.91,
      products: [{ name: "should be ignored", lineTotal: 120 }],
      financials: { totalAmount: 120 },
    });

    expect(result.merchant?.rawName).toBe("MIGROS TÜRK");
    expect(result.metadata?.currency).toBe("TRY");
    expect(result.lines).toEqual(["MIGROS TÜRK", "TOPLAM 120,00"]);
    expect(result.confidence).toBe(0.91);
    expect(result).not.toHaveProperty("products");
    expect(result).not.toHaveProperty("financials");
  });

  it("derives lines from rawText when lines array is missing", () => {
    const result = parseVisionResult({
      rawText: "LINE A\nLINE B\n",
    });

    expect(result.lines).toEqual(["LINE A", "LINE B"]);
    expect(result.rawText).toBe("LINE A\nLINE B\n");
  });

  it("accepts legacy merchant field aliases without parsing products", () => {
    const result = parseVisionResult({
      merchant: { title: "OPET", address: "ANKARA", vknTckn: "999" },
      rawText: "OPET",
      lines: ["OPET"],
    });

    expect(result.merchant?.rawName).toBe("OPET");
    expect(result.merchant?.rawAddress).toBe("ANKARA");
    expect(result.merchant?.rawTaxNumber).toBe("999");
  });
});
