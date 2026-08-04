"use client";

import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { AppIcon } from "@/components/icons";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate, formatTime } from "@/lib/datetime";
import { displayMerchantName } from "@/lib/merchants";
import { tagsForExpense } from "@/lib/tags";
import { formatMoney } from "@/lib/utils";
import { useWasteLessStore } from "@/hooks/use-store";
import type { Expense } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RecentExpenseCard({ expense }: { expense: Expense }) {
  const { categories, tags, removeExpense } = useWasteLessStore();
  const meta = getCategoryMeta(expense.category, categories);
  const tag = tagsForExpense(tags, expense.tagIds)[0];
  const when = expense.time
    ? `${formatDate(expense.date)} · ${formatTime(expense.time)}`
    : formatDate(expense.date);
  const processing = expense.parseStatus === "processing";
  const pendingApproval = expense.parseStatus === "pending_approval";
  const failed = expense.parseStatus === "failed";

  const href = processing
    ? "#"
    : pendingApproval
      ? `/add?review=${encodeURIComponent(expense.id)}`
      : `/expense?id=${encodeURIComponent(expense.id)}`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl wl-surface p-3 transition-colors duration-200 active:scale-[0.99]",
        !processing && "hover:bg-accent/20",
        processing && "opacity-90",
        pendingApproval && "ring-1 ring-amber-200/80"
      )}
    >
      <Link
        href={href}
        onClick={processing ? (e) => e.preventDefault() : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]",
          !processing && "hover:opacity-95"
        )}
      >
        <span
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: meta.softColor, color: meta.color }}
        >
          {processing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <AppIcon name={meta.icon} className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">
            {processing
              ? "Fiş işleniyor…"
              : pendingApproval
                ? displayMerchantName(expense.merchantName, "Fiş onay bekliyor")
                : failed
                  ? "Fiş işlenemedi"
                  : displayMerchantName(expense.merchantName, meta.label)}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {processing
                ? "Arka planda"
                : pendingApproval
                  ? "İncele & onayla"
                  : meta.label}
            </span>
            {processing && (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                İşleniyor…
              </span>
            )}
            {pendingApproval && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                Onay bekliyor
              </span>
            )}
            {failed && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                Hata
              </span>
            )}
            {expense.subcategory && !processing && !pendingApproval && (
              <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                {expense.subcategory}
              </span>
            )}
            {tag && !processing && !pendingApproval && (
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
            {processing
              ? "…"
              : formatMoney(expense.totalAmount, expense.currency)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {when}
          </p>
        </div>
      </Link>
      {pendingApproval && (
        <button
          type="button"
          aria-label="Fişi sil"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-50 active:scale-95 min-h-11 min-w-11"
          onClick={(e) => {
            e.preventDefault();
            void removeExpense(expense.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
