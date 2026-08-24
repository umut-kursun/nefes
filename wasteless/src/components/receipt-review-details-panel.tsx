"use client";

import { formatMoney } from "@/lib/utils";
import type { Expense } from "@/lib/types";

/** Read-only receipt breakdown shown when the user expands details. */
export function ReceiptReviewDetailsPanel({ expense }: { expense: Expense }) {
  const products = expense.items.filter((i) => i.name.trim());
  const charges = expense.charges.filter((c) => c.label.trim() && c.amount > 0);
  const discounts = expense.discounts.filter(
    (d) => d.label.trim() && d.amount > 0
  );
  const payments = expense.payments.filter((p) => p.label.trim());

  const hasContent =
    products.length > 0 ||
    charges.length > 0 ||
    discounts.length > 0 ||
    payments.length > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-white/70 p-4 text-sm">
      {products.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-foreground">
            Ürünler ({products.length})
          </h3>
          <ul className="space-y-1.5">
            {products.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3"
              >
                <span className="min-w-0 flex-1 text-foreground/90">
                  {item.name.trim()}
                </span>
                {item.totalPrice != null && item.totalPrice > 0 && (
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(item.totalPrice, expense.currency)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {charges.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-foreground">Ek ücretler</h3>
          <ul className="space-y-1.5">
            {charges.map((line, i) => (
              <li
                key={`charge-${i}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-foreground/90">{line.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatMoney(line.amount, expense.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {discounts.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-foreground">İndirimler</h3>
          <ul className="space-y-1.5">
            {discounts.map((line, i) => (
              <li
                key={`discount-${i}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-foreground/90">{line.label}</span>
                <span className="tabular-nums text-emerald-700">
                  −{formatMoney(line.amount, expense.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {payments.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-foreground">Ödeme</h3>
          <ul className="space-y-1.5">
            {payments.map((line, i) => (
              <li
                key={`payment-${i}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-foreground/90">{line.label}</span>
                {line.amount != null && line.amount > 0 && (
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(line.amount, expense.currency)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
