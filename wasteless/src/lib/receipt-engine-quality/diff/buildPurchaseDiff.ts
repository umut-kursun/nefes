import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { PurchaseDiff, PurchaseDiffChange } from "../types";

function pushChange(
  changes: PurchaseDiffChange[],
  path: string,
  kind: PurchaseDiffChange["kind"],
  before?: unknown,
  after?: unknown
) {
  changes.push({ path, kind, before, after });
}

function diffProducts(
  before: PurchaseDraft["products"],
  after: PurchaseDraft["products"],
  changes: PurchaseDiffChange[]
) {
  const max = Math.max(before.length, after.length);
  for (let i = 0; i < max; i++) {
    const b = before[i];
    const a = after[i];
    if (!b && a) pushChange(changes, `products[${i}]`, "added", undefined, a.name);
    else if (b && !a) pushChange(changes, `products[${i}]`, "removed", b.name);
    else if (b && a && JSON.stringify(b) !== JSON.stringify(a)) {
      pushChange(changes, `products[${i}]`, "changed", b, a);
    }
  }
}

function diffFooterLines(
  field: string,
  before: readonly { label: string; amount?: number }[],
  after: readonly { label: string; amount?: number }[],
  changes: PurchaseDiffChange[]
) {
  const max = Math.max(before.length, after.length);
  for (let i = 0; i < max; i++) {
    const b = before[i];
    const a = after[i];
    if (!b && a) pushChange(changes, `${field}[${i}]`, "added", undefined, a.label);
    else if (b && !a) pushChange(changes, `${field}[${i}]`, "removed", b.label);
    else if (b && a && (b.label !== a.label || b.amount !== a.amount)) {
      pushChange(changes, `${field}[${i}]`, "changed", b, a);
    }
  }
}

/** Compare two PurchaseDraft snapshots for regression visibility. */
export function buildPurchaseDiff(
  receiptId: string,
  before: PurchaseDraft,
  after: PurchaseDraft,
  generatedAt?: string
): PurchaseDiff {
  const changes: PurchaseDiffChange[] = [];

  if (before.merchant !== after.merchant) {
    pushChange(changes, "merchant", "changed", before.merchant, after.merchant);
  }

  diffProducts(before.products, after.products, changes);
  diffFooterLines("payments", before.payments, after.payments, changes);
  diffFooterLines("vatSummary", before.vatSummary, after.vatSummary, changes);

  if (before.total?.amount !== after.total?.amount) {
    pushChange(changes, "total", "changed", before.total, after.total);
  }

  if (before.confidence !== after.confidence) {
    pushChange(
      changes,
      "confidence",
      "changed",
      before.confidence,
      after.confidence
    );
  }

  return {
    receiptId,
    generatedAt: generatedAt ?? new Date().toISOString(),
    hasChanges: changes.length > 0,
    changes: Object.freeze(changes),
    summary: {
      merchantChanged: before.merchant !== after.merchant,
      productCountDelta: after.products.length - before.products.length,
      paymentCountDelta: after.payments.length - before.payments.length,
      confidenceDelta: after.confidence - before.confidence,
      validationChanged: false,
    },
  };
}
