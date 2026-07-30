import { describe, expect, it } from "vitest";
import { getRecentCategories, getRecentMerchants } from "@/lib/recent-values";
import type { Expense } from "@/lib/types";

function expense(
  partial: Partial<Expense> & Pick<Expense, "id" | "date">
): Expense {
  return {
    id: partial.id,
    date: partial.date,
    time: partial.time ?? null,
    totalAmount: partial.totalAmount ?? 100,
    currency: "TRY",
    category: partial.category ?? "market",
    merchantName: partial.merchantName ?? null,
    merchantRaw: null,
    notes: null,
    tagIds: [],
    items: [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
    sourceType: "manual",
    createdAt: partial.createdAt ?? `${partial.date}T12:00:00.000Z`,
    updatedAt: partial.createdAt ?? `${partial.date}T12:00:00.000Z`,
    confidence: null,
    imageDataUrl: null,
    rawText: null,
    aiResponseJson: null,
    fuel: null,
    packCount: null,
  };
}

describe("recent-values", () => {
  it("returns unique merchants from last 20 expenses, most recent first", () => {
    const expenses = [
      expense({ id: "1", date: "2026-01-01", merchantName: "Migros" }),
      expense({ id: "2", date: "2026-01-02", merchantName: "Shell" }),
      expense({ id: "3", date: "2026-01-03", merchantName: "Migros" }),
      expense({ id: "4", date: "2026-01-04", merchantName: "BIM" }),
    ];
    expect(getRecentMerchants(expenses)).toEqual(["BIM", "Migros", "Shell"]);
  });

  it("skips expenses without merchant names", () => {
    const expenses = [
      expense({ id: "1", date: "2026-01-01", merchantName: null }),
      expense({ id: "2", date: "2026-01-02", merchantName: "A101" }),
    ];
    expect(getRecentMerchants(expenses)).toEqual(["A101"]);
  });

  it("returns unique categories from last 20 expenses", () => {
    const expenses = [
      expense({ id: "1", date: "2026-01-01", category: "market" }),
      expense({ id: "2", date: "2026-01-02", category: "fuel" }),
      expense({ id: "3", date: "2026-01-03", category: "market" }),
      expense({ id: "4", date: "2026-01-04", category: "health" }),
    ];
    expect(getRecentCategories(expenses)).toEqual(["health", "market", "fuel"]);
  });

  it("limits to 20 most recent expenses", () => {
    const expenses = Array.from({ length: 25 }, (_, i) =>
      expense({
        id: `e${i}`,
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        merchantName: `Store ${i}`,
      })
    );
    expect(getRecentMerchants(expenses)).toHaveLength(20);
    expect(getRecentMerchants(expenses)[0]).toBe("Store 24");
  });
});
