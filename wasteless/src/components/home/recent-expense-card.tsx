"use client";

import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate, formatTime } from "@/lib/datetime";
import { tagsForExpense } from "@/lib/tags";
import { formatMoney } from "@/lib/utils";
import { useWasteLessStore } from "@/hooks/use-store";
import type { Expense } from "@/lib/types";

export function RecentExpenseCard({ expense }: { expense: Expense }) {
  const { categories, tags } = useWasteLessStore();
  const meta = getCategoryMeta(expense.category, categories);
  const tag = tagsForExpense(tags, expense.tagIds)[0];
  const when = expense.time
    ? `${formatDate(expense.date)} · ${formatTime(expense.time)}`
    : formatDate(expense.date);

  return (
    <Link
      href={`/expense?id=${encodeURIComponent(expense.id)}`}
      className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: meta.softColor, color: meta.color }}
      >
        <AppIcon name={meta.icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">
          {expense.merchantName || meta.label}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{meta.label}</span>
          {expense.subcategory && (
            <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-foreground/70">
              {expense.subcategory}
            </span>
          )}
          {tag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-foreground/70">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.label}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-amount text-[15px] font-bold leading-tight">
          {formatMoney(expense.totalAmount, expense.currency)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          {when}
        </p>
      </div>
    </Link>
  );
}
