"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { Expense } from "@/lib/types";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate, formatTime } from "@/lib/datetime";
import { displayMerchantName } from "@/lib/merchants";
import { formatMoney } from "@/lib/utils";
import { AppIcon } from "@/components/icons";
import { TagChips } from "@/components/tag-picker";
import { useWasteLessStore } from "@/hooks/use-store";

export function ExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete?: (expense: Expense) => void;
}) {
  const { categories } = useWasteLessStore();
  const meta = getCategoryMeta(expense.category, categories);

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white">
      <Link
        href={`/expense?id=${encodeURIComponent(expense.id)}`}
        className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]"
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: meta.softColor,
            color: meta.color,
          }}
        >
          <AppIcon name={meta.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">
            {displayMerchantName(expense.merchantName, meta.label)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {formatDate(expense.date)}
            {expense.time ? ` · ${formatTime(expense.time)}` : ""}
            {" · "}
            {meta.label}
            {expense.subcategory ? ` · ${expense.subcategory}` : ""}
          </p>
          <TagChips tagIds={expense.tagIds ?? []} className="mt-1.5" />
        </div>
        <p className="shrink-0 text-[15px] font-semibold tabular-nums leading-tight">
          {formatMoney(expense.totalAmount, expense.currency)}
        </p>
      </Link>
      {onDelete && (
        <button
          type="button"
          aria-label="Kaydı sil"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-600 transition active:scale-95 hover:bg-rose-50"
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
  );
}
