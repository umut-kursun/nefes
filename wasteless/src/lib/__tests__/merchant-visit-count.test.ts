import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import {
  aggregateMerchantVisitCounts,
  countMerchantVisitMatches,
  getTopMerchantByVisits,
  searchPurchaseMemory,
} from "@/lib/analytics";
import { getMostVisitedMerchant } from "@/lib/insights/most-visited-merchant";

function expense(
  partial: Partial<Expense> & Pick<Expense, "id" | "date">
): Expense {
  return {
    sourceType: "manual",
    time: null,
    merchantName: "Test",
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
    parseStatus: "approved",
    items: [{ name: "Ürün", quantity: 1, unitPrice: 100, totalPrice: 100 }],
    createdAt: partial.date,
    updatedAt: partial.date,
    ...partial,
  };
}

describe("merchant visit counts", () => {
  it("counts only approved spending expenses per merchant", () => {
    const expenses = [
      expense({ id: "1", date: "2026-07-01", merchantName: "Migros" }),
      expense({ id: "2", date: "2026-07-02", merchantName: "MIGROS TİCARET" }),
      expense({
        id: "3",
        date: "2026-07-03",
        merchantName: "Migros",
        parseStatus: "pending_approval",
      }),
      expense({
        id: "4",
        date: "2026-07-04",
        merchantName: "Migros",
        parseStatus: "failed",
      }),
      expense({ id: "5", date: "2026-07-05", merchantName: "BIM" }),
    ];

    const counts = aggregateMerchantVisitCounts(expenses);
    expect(counts.get("Migros")).toBe(2);
    expect(countMerchantVisitMatches(expenses, "Migros")).toBe(2);
    expect(getTopMerchantByVisits(expenses)).toEqual({
      name: "Migros",
      count: 2,
    });
  });

  it("keeps assistant carousel and memory merchant detail counts aligned", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [
          { name: "Süt", quantity: 1, unitPrice: 30, totalPrice: 30 },
          { name: "Ekmek", quantity: 1, unitPrice: 15, totalPrice: 15 },
        ],
      }),
      expense({
        id: "2",
        date: "2026-07-02",
        merchantName: "Migros",
        items: [{ name: "Peynir", quantity: 1, unitPrice: 80, totalPrice: 80 }],
      }),
      expense({
        id: "3",
        date: "2026-07-03",
        merchantName: "Migros",
        parseStatus: "processing",
      }),
      expense({ id: "4", date: "2026-07-04", merchantName: "BIM" }),
    ];

    const insight = getMostVisitedMerchant({
      expenses,
      categories: [],
      tags: [],
      now: new Date("2026-07-10"),
    });
    expect(insight).not.toBeNull();

    const match = insight!.description.match(/\((\d+) kez\)/);
    expect(match).not.toBeNull();
    const carouselCount = Number(match![1]);

    const memory = searchPurchaseMemory(expenses, "Migros");
    expect(memory).not.toBeNull();
    expect(memory!.purchaseCount).toBe(carouselCount);
    expect(carouselCount).toBe(2);
  });

  it("uses line-item hits for product searches", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [
          { name: "Süt", quantity: 1, unitPrice: 30, totalPrice: 30 },
          { name: "Süt", quantity: 1, unitPrice: 32, totalPrice: 32 },
        ],
      }),
      expense({
        id: "2",
        date: "2026-07-05",
        merchantName: "BIM",
        items: [{ name: "Süt", quantity: 1, unitPrice: 28, totalPrice: 28 }],
      }),
    ];

    const memory = searchPurchaseMemory(expenses, "Süt");
    expect(memory?.purchaseCount).toBe(2);
    expect(countMerchantVisitMatches(expenses, "Süt")).toBe(0);
  });
});
