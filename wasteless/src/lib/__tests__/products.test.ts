import { describe, expect, it } from "vitest";
import {
  computeUnitPrice,
  normalizeMeasureForPricing,
  resolvePurchaseQuantity,
} from "@/lib/products";

describe("resolvePurchaseQuantity", () => {
  it("defaults to 1 adet when only pack size is in the name", () => {
    expect(
      resolvePurchaseQuantity({
        quantity: undefined,
        unit: undefined,
        name: "ETİ KARAM GURME 50GR",
      })
    ).toEqual({ quantity: 1, unit: "adet" });
  });

  it("keeps fuel litres from receipt", () => {
    expect(
      resolvePurchaseQuantity({
        quantity: 29.766,
        unit: "LT",
        name: "Motorin",
      })
    ).toEqual({ quantity: 29.766, unit: "LT" });
  });
});

describe("normalizeMeasureForPricing", () => {
  it("converts g to kg", () => {
    expect(normalizeMeasureForPricing(50, "g")).toEqual({
      amount: 0.05,
      unit: "kg",
      unitLabel: "₺/kg",
    });
  });

  it("converts ml/cc to L", () => {
    expect(normalizeMeasureForPricing(330, "ml")).toEqual({
      amount: 0.33,
      unit: "l",
      unitLabel: "₺/L",
    });
  });
});

describe("computeUnitPrice", () => {
  it("uses kg for 50 g pack in name", () => {
    const info = computeUnitPrice({
      totalPrice: 75,
      quantity: 1,
      unit: "adet",
      name: "ETİ KARAM GURME 50GR",
    });
    expect(info.unitLabel).toBe("₺/kg");
    expect(info.unitPrice).toBeCloseTo(75 / 0.05, 2);
  });

  it("uses L for 330 ml pack in name", () => {
    const info = computeUnitPrice({
      totalPrice: 35,
      quantity: 1,
      unit: "adet",
      name: "Coca-Cola 330 ml",
    });
    expect(info.unitLabel).toBe("₺/L");
    expect(info.unitPrice).toBeCloseTo(35 / 0.33, 2);
  });
});
