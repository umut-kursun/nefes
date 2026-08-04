import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import {
  buildTobaccoMemoryBreakdowns,
  isTobaccoMemoryQuery,
} from "@/lib/tobacco-memory";

function expense(partial: Partial<Expense> & Pick<Expense, "id" | "date">): Expense {
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

describe("tobacco memory", () => {
  it("detects tobacco queries", () => {
    expect(isTobaccoMemoryQuery("Marlboro")).toBe(true);
    expect(isTobaccoMemoryQuery("Sigara")).toBe(true);
    expect(isTobaccoMemoryQuery("Süt")).toBe(false);
  });

  it("builds merchant breakdown with pack totals", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        merchantName: "Migros",
        category: "sigara",
        totalAmount: 460,
        packCount: 2,
        items: [
          {
            id: "i1",
            expenseId: "1",
            name: "Marlboro Edge",
            normalizedName: "marlboro edge",
            quantity: 2,
            unit: "paket",
            unitPrice: 230,
            totalPrice: 460,
            categoryGuess: "sigara",
            rawText: null,
            confidence: null,
          },
        ],
      }),
      expense({
        id: "2",
        date: "2026-07-05",
        merchantName: "Tekel Bayii",
        category: "sigara",
        totalAmount: 240,
        packCount: 1,
        items: [
          {
            id: "i2",
            expenseId: "2",
            name: "Winston",
            normalizedName: "winston",
            quantity: 1,
            unit: "paket",
            unitPrice: 240,
            totalPrice: 240,
            categoryGuess: "sigara",
            rawText: null,
            confidence: null,
          },
        ],
      }),
    ];

    const breakdown = buildTobaccoMemoryBreakdowns(expenses);
    expect(breakdown.totalPacks).toBe(3);
    expect(breakdown.avgPricePerPack).toBeCloseTo(233.33, 1);
    expect(breakdown.byMerchant.some((r) => r.label === "Migros")).toBe(true);
    expect(breakdown.byMerchant.some((r) => r.label === "Tekel")).toBe(true);
  });
});
