import type { Expense } from "@/lib/types";

/** Receipt drafts awaiting user review before final save. */
export function isPendingReceiptReview(
  parseStatus: Expense["parseStatus"]
): boolean {
  return (
    parseStatus === "pending_approval" || parseStatus === "needs_review"
  );
}

export function isPendingReceiptReviewExpense(expense: Expense): boolean {
  return isPendingReceiptReview(expense.parseStatus);
}

export function receiptReviewHref(expenseId: string): string {
  return `/add?review=${encodeURIComponent(expenseId)}`;
}

export function expenseDetailHref(expenseId: string): string {
  return `/expense?id=${encodeURIComponent(expenseId)}`;
}

/** Canonical navigation target for an expense row/card/link. */
export function expenseNavigationHref(
  expense: Pick<Expense, "id" | "parseStatus">
): string {
  if (expense.parseStatus === "processing") return "#";
  if (isPendingReceiptReview(expense.parseStatus)) {
    return receiptReviewHref(expense.id);
  }
  return expenseDetailHref(expense.id);
}

export type ReviewRouteResolution =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "review"; expense: Expense }
  | { state: "finalized"; expense: Expense }
  | { state: "not_found" };

/** When `/expense?id=` is opened for a pending draft, redirect to review. */
export function expenseDetailRedirectTarget(
  expense: Expense | null | undefined
): string | null {
  if (!expense || !isPendingReceiptReview(expense.parseStatus)) return null;
  return receiptReviewHref(expense.id);
}

export function expenseNavigationHrefForId(
  expenseId: string,
  expenses: Expense[]
): string {
  const expense = expenses.find((e) => e.id === expenseId);
  if (expense) return expenseNavigationHref(expense);
  return expenseDetailHref(expenseId);
}

/** Pure gate for `/add?review=` — used by Add page and tests. */
export function resolveReviewRoute(
  reviewId: string | null | undefined,
  expenses: Expense[],
  ready: boolean
): ReviewRouteResolution {
  if (!reviewId) return { state: "idle" };
  if (!ready) return { state: "loading" };

  const expense = expenses.find((e) => e.id === reviewId);
  if (!expense) return { state: "not_found" };

  if (isPendingReceiptReview(expense.parseStatus)) {
    return { state: "review", expense };
  }

  return { state: "finalized", expense };
}
