import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import { flattenProductPurchases } from "../helpers";
import { getPriceIncrease } from "../price-increased";

function expense(partial: Partial<Expense> & Pick<Expense, "id" | "date">): Expense {
  return {
    sourceType: "receipt",
    time: null,
    merchantName: "File Market",
    merchantRaw: null,
    category: "market",
    subcategory: null,
    tagIds: [],
    totalAmount: 100,
    currency: "TRY",
    notes: null,
    imageDataUrl: null,
    rawText: null,
    aiResponseJson: null,
    items: [],
    payments: [],
    unknownLines: [],
    fuel: null,
    packCount: null,
    createdAt: partial.date,
    updatedAt: partial.date,
    ...partial,
  };
}

describe("insights normalizedUnitPrice", () => {
  it("compares price changes using normalizedUnitPrice not line totals", () => {
    const expenses = [
      expense({
        id: "2",
        date: "2026-07-20",
        items: [
          {
            id: "i2",
            expenseId: "2",
            name: "Coca Cola 330ml",
            normalizedName: "Coca Cola 330ml",
            quantity: 1,
            unit: null,
            unitPrice: 33,
            normalizedUnitPrice: 100,
            baseUnit: "L",
            variantSize: "330ml",
            productKey: "coca cola 330ml",
            totalPrice: 33,
            categoryGuess: null,
            rawText: null,
            confidence: null,
          },
        ],
      }),
      expense({
        id: "1",
        date: "2026-06-01",
        items: [
          {
            id: "i1",
            expenseId: "1",
            name: "Coca Cola 330ml",
            normalizedName: "Coca Cola 330ml",
            quantity: 2,
            unit: null,
            unitPrice: 15,
            normalizedUnitPrice: 90,
            baseUnit: "L",
            variantSize: "330ml",
            productKey: "coca cola 330ml",
            totalPrice: 30,
            categoryGuess: null,
            rawText: null,
            confidence: null,
          },
        ],
      }),
    ];

    const purchases = flattenProductPurchases(expenses);
    expect(purchases[0]?.unitPrice).toBe(100);
    expect(purchases[1]?.unitPrice).toBe(90);

    const insight = getPriceIncrease({ expenses, categories: [], tags: [], now: new Date("2026-07-25") });
    expect(insight).not.toBeNull();
    expect(insight!.description).toMatch(/%11|%10|%12/);
  });
});
