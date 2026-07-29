"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ImageIcon, Sparkles, Trash2 } from "lucide-react";
import type { Expense } from "@/lib/types";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate, formatRelativeDate, formatTime } from "@/lib/datetime";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import { AppIcon } from "@/components/icons";
import { TagChips } from "@/components/tag-picker";
import { useWasteLessStore } from "@/hooks/use-store";

/**
 * Standard expandable Purchase Card:
 * Collapsed — merchant, date, total, product count
 * Expanded — products, receipt, OCR, tags, notes
 */
export function PurchaseCard({
  expense,
  onDelete,
  defaultExpanded = false,
}: {
  expense: Expense;
  onDelete?: (expense: Expense) => void;
  defaultExpanded?: boolean;
}) {
  const { categories } = useWasteLessStore();
  const meta = getCategoryMeta(expense.category, categories);
  const [open, setOpen] = useState(defaultExpanded);

  const products = (expense.items ?? []).filter((i) => i.name?.trim());
  const productCount = products.length;
  const hasReceipt = !!expense.imageDataUrl;
  const isOcr =
    expense.sourceType === "receipt" || expense.sourceType === "bank_screenshot";
  const hasNotes = !!expense.notes?.trim();
  const hasTags = (expense.tagIds ?? []).length > 0;
  const canExpand =
    productCount > 0 || hasReceipt || isOcr || hasNotes || hasTags;

  const absolute = formatDate(expense.date);
  const relative = formatRelativeDate(expense.date);

  return (
    <article className="rounded-2xl border border-black/[0.05] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-2 p-3">
        <Link
          href={`/expense?id=${encodeURIComponent(expense.id)}`}
          className="flex min-w-0 flex-1 items-start gap-3 active:scale-[0.99]"
        >
          <div
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: meta.softColor, color: meta.color }}
          >
            <AppIcon name={meta.icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {expense.merchantName || meta.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {absolute}
              <span className="text-black/20"> · </span>
              {relative}
              {expense.time ? ` · ${formatTime(expense.time)}` : ""}
            </p>
            {productCount > 0 && (
              <p className="mt-1 text-[11px] font-medium text-foreground/70">
                {productCount} ürün
              </p>
            )}
          </div>
          <p className="shrink-0 pt-0.5 text-[15px] font-semibold tabular-nums leading-tight">
            {formatMoney(expense.totalAmount, expense.currency)}
          </p>
        </Link>

        {onDelete && (
          <button
            type="button"
            aria-label="Kaydı sil"
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-rose-600 transition active:scale-95 hover:bg-rose-50"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(expense);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {canExpand && (
        <div className="border-t border-black/[0.04] px-3 py-1.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-medium text-primary"
          >
            <span>{open ? "Detayları gizle" : "Detayları göster"}</span>
            {open ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          {open && (
            <div className="space-y-3 pb-3">
              {(hasReceipt || isOcr || expense.fuel?.plate) && (
                <div className="flex flex-wrap gap-1.5">
                  {hasReceipt && (
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                      <ImageIcon className="h-3 w-3" />
                      Fiş
                    </span>
                  )}
                  {isOcr && (
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800">
                      <Sparkles className="h-3 w-3" />
                      OCR
                    </span>
                  )}
                  {expense.fuel?.plate && (
                    <span className="rounded-lg bg-muted/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground/80">
                      {expense.fuel.plate}
                    </span>
                  )}
                </div>
              )}

              {hasTags && (
                <TagChips tagIds={expense.tagIds ?? []} />
              )}

              {hasNotes && (
                <p className="rounded-xl bg-muted/30 px-3 py-2 text-sm text-foreground/80">
                  {expense.notes}
                </p>
              )}

              {productCount > 0 && (
                <ul className="space-y-2">
                  {products.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {item.name}
                        </span>
                        {(item.quantity != null || item.unitPrice != null) && (
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {item.quantity != null
                              ? `${formatNumber(item.quantity)}${
                                  item.unit ? ` ${item.unit}` : ""
                                }`
                              : null}
                            {item.quantity != null && item.unitPrice != null
                              ? " · "
                              : null}
                            {item.unitPrice != null
                              ? `${formatMoney(item.unitPrice)}/birim`
                              : null}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {item.totalPrice != null
                          ? formatMoney(item.totalPrice, expense.currency)
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {hasReceipt && (
                <Link
                  href={`/expense?id=${encodeURIComponent(expense.id)}`}
                  className="inline-flex min-h-10 items-center text-sm font-medium text-primary"
                >
                  Fişi aç →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Compact non-expandable row kept for places that need a denser list. */
export function PurchaseCardCompact({
  expense,
  className,
}: {
  expense: Expense;
  className?: string;
}) {
  const { categories } = useWasteLessStore();
  const meta = getCategoryMeta(expense.category, categories);
  return (
    <Link
      href={`/expense?id=${encodeURIComponent(expense.id)}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-white p-3 shadow-sm active:scale-[0.99]",
        className
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: meta.softColor, color: meta.color }}
      >
        <AppIcon name={meta.icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {expense.merchantName || meta.label}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatDate(expense.date)} · {formatRelativeDate(expense.date)}
        </p>
      </div>
      <p className="shrink-0 font-semibold tabular-nums">
        {formatMoney(expense.totalAmount, expense.currency)}
      </p>
    </Link>
  );
}
