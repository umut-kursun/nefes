import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import { isSpendingExpense } from "@/lib/analytics";
import {
  expenseDetailRedirectTarget,
  expenseNavigationHref,
  isPendingReceiptReview,
  isPendingReceiptReviewExpense,
  receiptReviewHref,
  resolveReviewRoute,
} from "@/lib/expense-navigation";

function expense(
  partial: Partial<Expense> & Pick<Expense, "id">
): Expense {
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

describe("isPendingReceiptReview", () => {
  it("includes pending_approval and needs_review", () => {
    expect(isPendingReceiptReview("pending_approval")).toBe(true);
    expect(isPendingReceiptReview("needs_review")).toBe(true);
  });

  it("excludes finalized and in-flight states", () => {
    expect(isPendingReceiptReview(null)).toBe(false);
    expect(isPendingReceiptReview(undefined)).toBe(false);
    expect(isPendingReceiptReview("processing")).toBe(false);
    expect(isPendingReceiptReview("failed")).toBe(false);
    expect(isPendingReceiptReview("ready")).toBe(false);
  });
});

describe("expenseNavigationHref", () => {
  it("routes pending_approval to review", () => {
    const row = expense({ id: "a", parseStatus: "pending_approval" });
    expect(expenseNavigationHref(row)).toBe(receiptReviewHref("a"));
  });

  it("routes needs_review to review", () => {
    const row = expense({ id: "b", parseStatus: "needs_review" });
    expect(expenseNavigationHref(row)).toBe(receiptReviewHref("b"));
  });

  it("routes finalized expense to detail", () => {
    const row = expense({ id: "c", parseStatus: null });
    expect(expenseNavigationHref(row)).toBe(`/expense?id=${encodeURIComponent("c")}`);
  });
});

describe("spending after approval", () => {
  it("G. parseStatus null is eligible for spending (post Onayla & Kaydet)", () => {
    expect(isSpendingExpense(expense({ id: "1", parseStatus: null }))).toBe(true);
    expect(
      isSpendingExpense(expense({ id: "2", parseStatus: "pending_approval" }))
    ).toBe(false);
  });
});

describe("expenseDetailRedirectTarget", () => {
  it("C. pending_approval on /expense → review route", () => {
    const row = expense({ id: "p", parseStatus: "pending_approval" });
    expect(expenseDetailRedirectTarget(row)).toBe(receiptReviewHref("p"));
  });

  it("D. needs_review on /expense → review route", () => {
    const row = expense({ id: "n", parseStatus: "needs_review" });
    expect(expenseDetailRedirectTarget(row)).toBe(receiptReviewHref("n"));
  });

  it("E. finalized expense stays on detail", () => {
    const row = expense({ id: "f", parseStatus: null });
    expect(expenseDetailRedirectTarget(row)).toBeNull();
  });
});

describe("resolveReviewRoute", () => {
  const pending = expense({ id: "p", parseStatus: "pending_approval" });
  const needsReview = expense({ id: "n", parseStatus: "needs_review" });
  const finalized = expense({ id: "f", parseStatus: null });
  const rows = [pending, needsReview, finalized];

  it("A. pending_approval + review id → review mode", () => {
    expect(resolveReviewRoute("p", rows, true)).toEqual({
      state: "review",
      expense: pending,
    });
  });

  it("B. needs_review + review id → review mode", () => {
    expect(resolveReviewRoute("n", rows, true)).toEqual({
      state: "review",
      expense: needsReview,
    });
  });

  it("E. finalized expense → finalized (not review chooser)", () => {
    expect(resolveReviewRoute("f", rows, true)).toEqual({
      state: "finalized",
      expense: finalized,
    });
  });

  it("H. waits for store readiness when review id is present", () => {
    expect(resolveReviewRoute("p", [], false)).toEqual({ state: "loading" });
    expect(resolveReviewRoute("p", [], true)).toEqual({ state: "not_found" });
  });

  it("returns idle without review id", () => {
    expect(resolveReviewRoute(null, rows, true)).toEqual({ state: "idle" });
  });
});

describe("isPendingReceiptReviewExpense", () => {
  it("matches helper on expense rows", () => {
    expect(
      isPendingReceiptReviewExpense(
        expense({ id: "x", parseStatus: "needs_review" })
      )
    ).toBe(true);
  });
});
