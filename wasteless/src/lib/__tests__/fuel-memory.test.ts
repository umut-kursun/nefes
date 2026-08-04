import { describe, expect, it } from "vitest";
import { searchPurchaseMemory } from "@/lib/analytics";
import {
  buildFuelMemoryBreakdowns,
  extractFuelCity,
  hasFuelProductKeywords,
  inferFuelDisplayName,
  isFuelMemoryExpense,
  isValidFuelExpense,
} from "@/lib/fuel-memory";
import type { Expense } from "@/lib/types";

function expense(partial: Partial<Expense> & { id: string }): Expense {
  return {
    id: partial.id,
    sourceType: "receipt",
    parseStatus: partial.parseStatus ?? null,
    date: partial.date ?? "2026-07-29",
    time: null,
    merchantName: partial.merchantName ?? "Test",
    merchantRaw: partial.merchantRaw ?? null,
    category: partial.category ?? "market",
    subcategory: partial.subcategory ?? null,
    tagIds: [],
    totalAmount: partial.totalAmount ?? 100,
    currency: "TRY",
    notes: partial.notes ?? null,
    createdAt: "2026-07-29T10:00:00.000Z",
    updatedAt: "2026-07-29T10:00:00.000Z",
    rawText: partial.rawText ?? null,
    confidence: null,
    imageDataUrl: null,
    aiResponseJson: null,
    fuel: partial.fuel ?? null,
    packCount: null,
    quickButtonId: null,
    items: partial.items ?? [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
  };
}

describe("isValidFuelExpense", () => {
  it("accepts akaryakıt with liters and pricePerLiter", () => {
    expect(
      isValidFuelExpense(
        expense({
          id: "1",
          category: "akaryakit",
          fuel: { fuelType: "Motorin", liters: 35, pricePerLiter: 77.21, stationName: null, odometer: null, plate: null },
        })
      )
    ).toBe(true);
  });

  it("rejects Opet market purchase without valid fuel metrics", () => {
    expect(
      isValidFuelExpense(
        expense({
          id: "2",
          category: "market",
          merchantName: "Opet Market",
          totalAmount: 580,
          items: [{ id: "i1", expenseId: "2", name: "Su", quantity: 1, unit: null, unitPrice: null, totalPrice: 580, categoryGuess: "market", normalizedName: null, rawText: null, confidence: null }],
        })
      )
    ).toBe(false);
  });

  it("rejects akaryakıt miscategorized with bogus unit price", () => {
    expect(
      isValidFuelExpense(
        expense({
          id: "3",
          category: "akaryakit",
          totalAmount: 580,
          fuel: { fuelType: "Motorin", liters: null, pricePerLiter: 580, stationName: null, odometer: null, plate: null },
        })
      )
    ).toBe(false);
  });
});

describe("isFuelMemoryExpense", () => {
  it("includes manual akaryakıt without fuelDetails", () => {
    expect(
      isFuelMemoryExpense(
        expense({
          id: "manual",
          category: "akaryakit",
          merchantName: "Shell",
          totalAmount: 1500,
          fuel: null,
        })
      )
    ).toBe(true);
  });

  it("includes receipts with fuel product keywords in line items", () => {
    expect(
      isFuelMemoryExpense(
        expense({
          id: "kw",
          category: "market",
          merchantName: "Opet",
          items: [
            {
              id: "i1",
              expenseId: "kw",
              name: "VİMAX MOTORIN",
              quantity: 1,
              unit: null,
              unitPrice: null,
              totalPrice: 1200,
              categoryGuess: "market",
              normalizedName: null,
              rawText: null,
              confidence: null,
            },
          ],
        })
      )
    ).toBe(true);
    expect(hasFuelProductKeywords(expense({ id: "x", items: [] }))).toBe(false);
  });

  it("still excludes unrelated market purchases", () => {
    expect(
      isFuelMemoryExpense(
        expense({
          id: "market",
          category: "market",
          merchantName: "Opet Market",
          items: [
            {
              id: "i1",
              expenseId: "market",
              name: "Su",
              quantity: 1,
              unit: null,
              unitPrice: null,
              totalPrice: 580,
              categoryGuess: "market",
              normalizedName: null,
              rawText: null,
              confidence: null,
            },
          ],
        })
      )
    ).toBe(false);
  });
});

describe("searchPurchaseMemory fuel filtering", () => {
  it("excludes Opet market from Akaryakıt search", () => {
    const rows = [
      expense({
        id: "fuel",
        category: "akaryakit",
        merchantName: "Opet",
        totalAmount: 2767,
        fuel: {
          fuelType: "Motorin",
          liters: 35.87,
          pricePerLiter: 77.21,
          stationName: "Opet",
          odometer: null,
          plate: "34 ABC 123",
        },
      }),
      expense({
        id: "market",
        category: "market",
        merchantName: "Opet Market",
        totalAmount: 580,
        items: [
          {
            id: "i1",
            expenseId: "market",
            name: "Su",
            quantity: 1,
            unit: null,
            unitPrice: null,
            totalPrice: 580,
            categoryGuess: "market",
            normalizedName: null,
            rawText: null,
            confidence: null,
          },
        ],
      }),
    ];

    const result = searchPurchaseMemory(rows, "Akaryakıt");
    expect(result).not.toBeNull();
    expect(result!.hits).toHaveLength(1);
    expect(result!.hits[0]!.expenseId).toBe("fuel");
    expect(result!.hits[0]!.unitPrice).toBeCloseTo(77.21, 2);
    expect(result!.hits[0]!.unitLabel).toBe("₺/L");
    expect(result!.fuelBreakdowns?.byFuelType).toHaveLength(1);
  });

  it("includes manual akaryakıt in Akaryakıt search with graceful metrics", () => {
    const rows = [
      expense({
        id: "manual-fuel",
        category: "akaryakit",
        merchantName: "Shell",
        totalAmount: 1500,
        fuel: null,
      }),
    ];

    const result = searchPurchaseMemory(rows, "Akaryakıt");
    expect(result).not.toBeNull();
    expect(result!.hits).toHaveLength(1);
    expect(result!.hits[0]!.expenseId).toBe("manual-fuel");
    expect(result!.hits[0]!.unitPrice).toBeNull();
    expect(result!.hits[0]!.quantity).toBeNull();
    expect(result!.hits[0]!.unitLabel).toBe("₺/L");
    expect(inferFuelDisplayName(rows[0]!)).toBe("Akaryakıt");
    expect(result!.fuelBreakdowns?.byPlate[0]?.label).toBe("—");
  });

  it("does not label Opet market merchant hit as ₺/L", () => {
    const rows = [
      expense({
        id: "market",
        category: "market",
        merchantName: "Opet Market",
        totalAmount: 580,
        items: [],
      }),
    ];
    const result = searchPurchaseMemory(rows, "Opet");
    expect(result?.hits[0]?.unitLabel).not.toBe("₺/L");
    expect(result?.hits[0]?.unitPrice).toBeNull();
  });
});

describe("buildFuelMemoryBreakdowns", () => {
  it("groups by plate and fuel type separately", () => {
    const rows = [
      expense({
        id: "1",
        category: "akaryakit",
        totalAmount: 1000,
        fuel: { fuelType: "Motorin", liters: 20, pricePerLiter: 50, plate: "34 A 1", stationName: null, odometer: null },
        rawText: "BÜYÜKÇEKMECE / İSTANBUL",
      }),
      expense({
        id: "2",
        category: "akaryakit",
        totalAmount: 800,
        fuel: { fuelType: "Benzin", liters: 16, pricePerLiter: 50, plate: "06 B 2", stationName: null, odometer: null },
        rawText: "ANKARA",
      }),
    ];
    const breakdowns = buildFuelMemoryBreakdowns(rows);
    expect(breakdowns.byFuelType).toHaveLength(2);
    expect(breakdowns.byPlate).toHaveLength(2);
    expect(extractFuelCity(rows[0]!)).toBe("İstanbul");
    expect(extractFuelCity(rows[1]!)).toBe("Ankara");
  });

  it("includes manual fuel rows in breakdown spend totals", () => {
    const rows = [
      expense({
        id: "manual",
        category: "akaryakit",
        totalAmount: 500,
        fuel: null,
      }),
    ];
    const breakdowns = buildFuelMemoryBreakdowns(rows);
    expect(breakdowns.byFuelType).toHaveLength(1);
    expect(breakdowns.byFuelType[0]!.totalSpend).toBe(500);
    expect(breakdowns.byFuelType[0]!.totalLiters).toBe(0);
    expect(breakdowns.byFuelType[0]!.avgPricePerLiter).toBe(0);
  });
});
