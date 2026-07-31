import { describe, expect, it } from "vitest";
import {
  parseQuantity,
  parseUnit,
  parseVatRate,
  parseCurrency,
  parseDate,
  parseTime,
  parseReceiptNumber,
} from "@/lib/receipt-engine/layer-6-purchase/parsers";
import {
  QTY_TOKEN,
  WEIGHTED_PATTERN,
} from "@/lib/receipt-engine/patterns/neutral";

describe("QuantityParser", () => {
  it("parses quantity with unit token", () => {
    expect(parseQuantity("1 L")).toEqual({
      raw: "1 L",
      normalized: 1,
      unitRaw: "L",
      unitNormalized: "L",
    });
  });

  it("parses weighted kg quantity", () => {
    expect(parseQuantity("0,744 kg")).toEqual({
      raw: "0,744 kg",
      normalized: 0.744,
      unitRaw: "kg",
      unitNormalized: "kg",
    });
  });

  it("parses the AD abbreviation used on Migros multiplier lines", () => {
    expect(parseQuantity("9 AD")).toEqual({
      raw: "9 AD",
      normalized: 9,
      unitRaw: "AD",
      unitNormalized: "adet",
    });
  });

  it("returns raw only for unparseable text", () => {
    expect(parseQuantity("n/a")).toEqual({ raw: "n/a" });
  });

  it("does not fabricate quantity when missing", () => {
    expect(parseQuantity("")).toEqual({ raw: "" });
  });

  it("does not treat words starting with 'ad' as an adet quantity", () => {
    // "3 ADANA" must not be read as 3 adet.
    expect(parseQuantity("3 ADANA").unitNormalized).toBeUndefined();
  });
});

describe("Quantity multiplier patterns", () => {
  it("captures qty, unit and unit price from a 'N AD x PRICE' line", () => {
    const m = "9 AD x 40,00 TL/AD".match(WEIGHTED_PATTERN);
    expect(m?.[1]).toBe("9");
    expect(m?.[2]?.toLowerCase()).toBe("ad");
    expect(m?.[3]).toBe("40,00");
  });

  it("captures qty, unit and unit price from a 'N kg x PRICE' line", () => {
    const m = "0,744 kg x 89,90".match(WEIGHTED_PATTERN);
    expect(m?.[1]).toBe("0,744");
    expect(m?.[2]?.toLowerCase()).toBe("kg");
    expect(m?.[3]).toBe("89,90");
  });

  it("matches an adet token spelled out in full", () => {
    expect("4 adet".match(QTY_TOKEN)?.[2]?.toLowerCase()).toBe("adet");
  });
});

describe("UnitParser", () => {
  it("normalizes known units", () => {
    expect(parseUnit("kg")).toEqual({ raw: "kg", normalized: "kg" });
    expect(parseUnit("gr")).toEqual({ raw: "gr", normalized: "g" });
    expect(parseUnit("lt")).toEqual({ raw: "lt", normalized: "L" });
  });

  it("normalizes the AD abbreviation to adet", () => {
    expect(parseUnit("AD")).toEqual({ raw: "AD", normalized: "adet" });
    expect(parseUnit("ad")).toEqual({ raw: "ad", normalized: "adet" });
  });

  it("returns raw only for unknown unit", () => {
    expect(parseUnit("box")).toEqual({ raw: "box" });
  });
});

describe("VatRateParser", () => {
  it("parses inline VAT token", () => {
    expect(parseVatRate("%1")).toEqual({ raw: "%1", normalized: 1 });
  });

  it("leaves missing VAT undefined", () => {
    expect(parseVatRate("")).toEqual({ raw: "" });
    expect(parseVatRate("no vat").normalized).toBeUndefined();
  });
});

describe("CurrencyParser", () => {
  it("parses explicit TL marker", () => {
    expect(parseCurrency("45,90 TL")).toEqual({
      raw: "45,90 TL",
      normalized: "TRY",
    });
  });

  it("returns null when currency absent", () => {
    expect(parseCurrency("Ekmek")).toBeNull();
  });
});

describe("DateParser", () => {
  it("normalizes DD.MM.YYYY deterministically", () => {
    expect(parseDate("28.07.2026")).toEqual({
      raw: "28.07.2026",
      normalized: "2026-07-28",
    });
  });

  it("does not repair malformed dates", () => {
    expect(parseDate("32.13.2026").normalized).toBeUndefined();
    expect(parseDate("28.07.26").normalized).toBeUndefined();
  });
});

describe("TimeParser", () => {
  it("normalizes HH:MM", () => {
    expect(parseTime("14:05")).toEqual({
      raw: "14:05",
      normalized: "14:05",
    });
  });

  it("normalizes dot separator", () => {
    expect(parseTime("9.30")).toEqual({
      raw: "9.30",
      normalized: "09:30",
    });
  });
});

describe("ReceiptNumberParser", () => {
  it("extracts receipt number after label", () => {
    expect(parseReceiptNumber("Fiş No: 12345")).toEqual({
      raw: "12345",
      normalized: "12345",
    });
  });

  it("passes through digits-only values", () => {
    expect(parseReceiptNumber("9876")).toEqual({
      raw: "9876",
      normalized: "9876",
    });
  });
});
