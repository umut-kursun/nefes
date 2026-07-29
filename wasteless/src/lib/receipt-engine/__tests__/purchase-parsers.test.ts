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

  it("returns raw only for unparseable text", () => {
    expect(parseQuantity("n/a")).toEqual({ raw: "n/a" });
  });

  it("does not fabricate quantity when missing", () => {
    expect(parseQuantity("")).toEqual({ raw: "" });
  });
});

describe("UnitParser", () => {
  it("normalizes known units", () => {
    expect(parseUnit("kg")).toEqual({ raw: "kg", normalized: "kg" });
    expect(parseUnit("gr")).toEqual({ raw: "gr", normalized: "g" });
    expect(parseUnit("lt")).toEqual({ raw: "lt", normalized: "L" });
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
