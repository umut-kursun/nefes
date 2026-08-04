import { describe, expect, it } from "vitest";
import {
  applyPlatformOrderSanitization,
  isStandaloneVatToken,
  sanitizePlatformOrderItems,
  stripVatPercentTokens,
} from "../vision/sanitizePlatformOrderItems";
import type { ParsedReceipt } from "../types/ParsedReceipt";

describe("isStandaloneVatToken", () => {
  it("recognizes VAT column tokens", () => {
    expect(isStandaloneVatToken("10")).toBe(true);
    expect(isStandaloneVatToken("1")).toBe(true);
    expect(isStandaloneVatToken("20")).toBe(true);
    expect(isStandaloneVatToken("Marlboro")).toBe(false);
    expect(isStandaloneVatToken("10 ad")).toBe(false);
  });
});

describe("stripVatPercentTokens", () => {
  it("removes standalone VAT tokens from digital order item names", () => {
    expect(stripVatPercentTokens("Marlboro Edge 10 2 229,96")).toBe(
      "Marlboro Edge 2 229,96"
    );
    expect(stripVatPercentTokens("Hemen Poşet 20 1 0,25")).toBe(
      "Hemen Poşet 1 0,25"
    );
  });
});

describe("sanitizePlatformOrderItems", () => {
  const parsed: ParsedReceipt = {
    merchant: { title: "Migros Hemen", category: "MARKET" },
    metadata: { purchaseDate: "2026-07-01", currency: "TRY" },
    products: [
      {
        name: "Marlboro Edge 10 2",
        quantity: 2,
        unit: "ad",
        unitPrice: 114.98,
        lineTotal: 229.96,
      },
      {
        name: "Nakliye Ücreti 20 1",
        quantity: 1,
        unit: "ad",
        unitPrice: 29.9,
        lineTotal: 29.9,
      },
      {
        name: "Hemen Poşet 20 3",
        quantity: 3,
        unit: "ad",
        unitPrice: 0.25,
        lineTotal: 0.75,
      },
    ],
    payments: [],
    financials: { totalAmount: 260.61 },
    rawText: "Migros Hemen sipariş özeti",
  };

  it("moves delivery fee to charges and keeps poşet as product", () => {
    const { products, charges } = sanitizePlatformOrderItems(parsed);
    expect(products).toHaveLength(2);
    expect(products.some((p) => /Poşet/i.test(p.name))).toBe(true);
    expect(products.every((p) => !/Nakliye/i.test(p.name))).toBe(true);
    expect(charges).toHaveLength(1);
    expect(charges[0]!.name).toMatch(/Nakliye/i);
    expect(charges[0]!.amount).toBeCloseTo(29.9, 2);
  });

  it("strips VAT tokens from cleaned product names", () => {
    const { products } = sanitizePlatformOrderItems(parsed);
    const marlboro = products.find((p) => /Marlboro/i.test(p.name))!;
    expect(marlboro.name).not.toMatch(/\b10\b/);
  });

  it("attaches platformCharges via applyPlatformOrderSanitization", () => {
    const sanitized = applyPlatformOrderSanitization(parsed);
    expect(sanitized.platformCharges).toHaveLength(1);
    expect(sanitized.products).toHaveLength(2);
  });
});
