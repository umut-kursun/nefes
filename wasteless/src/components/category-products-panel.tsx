"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  getCategoryProductStats,
  type CategoryProductStat,
  type ProductSort,
} from "@/lib/analytics";
import { formatDate } from "@/lib/datetime";
import { formatUnitPrice } from "@/lib/products";
import { formatMoney, cn } from "@/lib/utils";
import type { Expense } from "@/lib/types";

const SORTS: { id: ProductSort; label: string }[] = [
  { id: "count", label: "Alım sayısı" },
  { id: "total", label: "Toplam tutar" },
  { id: "avgPrice", label: "Ort. fiyat" },
];

function ProductRow({ product }: { product: CategoryProductStat }) {
  const [open, setOpen] = useState(false);
  const unit = formatUnitPrice(product.avgUnitPrice, product.unitLabel);

  return (
    <li className="rounded-2xl border border-black/[0.05] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-3 text-left transition active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">
            {product.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {product.count} alım
            {product.mostFrequentMerchant
              ? ` · sık: ${product.mostFrequentMerchant.merchant}`
              : ""}
          </p>
          {product.insight && (
            <p className="mt-1.5 text-[12px] leading-snug text-teal-800">
              {product.insight}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-amount text-[15px] font-bold">
            {formatMoney(product.totalSpent)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            ort. {formatMoney(product.avgPrice)}
          </p>
          {unit && (
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {unit}
            </p>
          )}
        </div>
        <span className="mt-1 text-muted-foreground">
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-black/[0.05] px-3 pb-3 pt-2">
          {product.merchants.length > 1 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Mağazalar
              </p>
              <ul className="space-y-1.5">
                {product.merchants.map((m) => (
                  <li
                    key={m.merchant}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span>
                      {m.merchant}
                      <span className="text-muted-foreground">
                        {" "}
                        · {m.count}×
                      </span>
                    </span>
                    <span className="tabular-nums font-medium">
                      ort. {formatMoney(m.avgPrice)}
                      {m.avgUnitPrice != null && product.unitLabel
                        ? ` · ${formatUnitPrice(m.avgUnitPrice, product.unitLabel)}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Alım geçmişi
          </p>
          <ul className="space-y-2">
            {product.history.slice(0, 12).map((hit, i) => (
              <li key={`${hit.expenseId}-${i}`}>
                <Link
                  href={`/expense?id=${encodeURIComponent(hit.expenseId)}`}
                  className="flex items-center justify-between gap-2 rounded-xl px-1 py-1 text-sm transition hover:bg-black/[0.03]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {hit.merchant}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {formatDate(hit.date)}
                      {hit.quantity
                        ? ` · ${hit.quantity}${hit.unit ? ` ${hit.unit}` : ""}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums">
                      {formatMoney(hit.price)}
                    </span>
                    {hit.unitPrice != null && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatUnitPrice(hit.unitPrice, hit.unitLabel)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function CategoryProductsPanel({ expenses }: { expenses: Expense[] }) {
  const [sort, setSort] = useState<ProductSort>("count");
  const products = useMemo(
    () => getCategoryProductStats(expenses, sort),
    [expenses, sort]
  );

  if (products.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Ürünler</h2>
        <div className="flex gap-1 rounded-xl bg-black/[0.04] p-0.5">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
                sort === s.id
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {products.slice(0, 20).map((p) => (
          <ProductRow key={p.key} product={p} />
        ))}
      </ul>
    </section>
  );
}
