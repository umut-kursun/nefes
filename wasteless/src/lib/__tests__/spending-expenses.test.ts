import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import { getPeriodTotals, isSpendingExpense, spendingExpenses } from "@/lib/analytics";

function expense(partial: Partial<Expense> & Pick<Expense, "id">): Expense {
  return {
    sourceType: "receipt",
    date: "2026-07-31",
    time: null,
    merchantName: "Test",
    merchantRaw: null,
    category: "market",
    subcategory: null,
    tagIds: [],
    totalAmount: 100,
    currency: "TRY",
    notes: null,
    createdAt: "2026-07-31T10:00:00.000Z",
    updatedAt: "2026-07-31T10:00:00.000Z",
    rawText: null,
    confidence: 1,
    imageDataUrl: null,
    aiResponseJson: null,
    fuel: null,
    packCount: null,
    quickButtonId: null,
    items: [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
    ...partial,
  };
}

describe("spendingExpenses", () => {
  it("excludes pending_approval from spending totals", () => {
    const rows = [
      expense({ id: "1", totalAmount: 200 }),
      expense({ id: "2", totalAmount: 150, parseStatus: "pending_approval" }),
      expense({ id: "3", totalAmount: 50, parseStatus: "processing" }),
    ];
    expect(spendingExpenses(rows)).toHaveLength(1);
    expect(isSpendingExpense(rows[1]!)).toBe(false);
  });

  it("getPeriodTotals ignores pending drafts", () => {
    const now = new Date("2026-07-31T12:00:00.000Z");
    const rows = [
      expense({ id: "1", totalAmount: 300, date: "2026-07-31" }),
      expense({
        id: "2",
        totalAmount: 999,
        date: "2026-07-31",
        parseStatus: "pending_approval",
      }),
    ];
    const totals = getPeriodTotals(rows, now);
    expect(totals.daily).toBe(300);
  });
});
