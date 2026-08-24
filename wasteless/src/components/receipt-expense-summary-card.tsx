"use client";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { resolveCategory } from "@/lib/categories";
import { getRootCategoryId } from "@/lib/category-hierarchy";
import { toDate } from "@/lib/datetime";
import { displayMerchantName } from "@/lib/merchants";
import { formatMoney } from "@/lib/utils";
import type { UserCategory } from "@/lib/types";

function formatSummaryDateTime(
  date: string,
  time: string | null | undefined
): string {
  const d = toDate(date);
  if (!d) return "—";
  const datePart = format(d, "d MMMM yyyy", { locale: tr });
  if (time && /^\d{2}:\d{2}/.test(time)) {
    return `${datePart} · ${time.slice(0, 5)}`;
  }
  return datePart;
}

export function formatExpenseCategoryLine(
  categories: UserCategory[],
  categoryId: string,
  subcategory: string | null | undefined
): string {
  const rootId = getRootCategoryId(categoryId, categories);
  const root = resolveCategory(categories, rootId);
  const selected = resolveCategory(categories, categoryId);

  let subLabel: string | null = null;
  if (categoryId !== rootId && selected.id !== rootId) {
    subLabel = selected.label;
  } else if (subcategory?.trim()) {
    subLabel = subcategory.trim();
  }

  return subLabel ? `${root.label} · ${subLabel}` : root.label;
}

export function ReceiptExpenseSummaryCard({
  merchantName,
  date,
  time,
  totalAmount,
  currency = "TRY",
  categoryLine,
  correctionsApplied = 0,
  onShowDetails,
}: {
  merchantName: string | null;
  date: string;
  time: string | null;
  totalAmount: number;
  currency?: string;
  categoryLine: string;
  correctionsApplied?: number;
  onShowDetails: () => void;
}) {
  const merchant = displayMerchantName(merchantName) || "İşyeri belirtilmedi";
  const when = formatSummaryDateTime(date, time);

  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-teal-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>Harcama hazır</span>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-lg font-semibold leading-tight text-foreground">
          {merchant}
        </p>
        <p className="text-sm text-muted-foreground">{when}</p>
      </div>

      <p className="mt-4 font-amount text-3xl font-semibold tracking-tight text-foreground">
        {formatMoney(totalAmount, currency)}
      </p>

      <p className="mt-2 text-sm text-muted-foreground">{categoryLine}</p>

      {correctionsApplied > 0 && (
        <p className="mt-2 text-xs text-teal-800">
          Önceki düzeltmen uygulandı ({correctionsApplied}).
        </p>
      )}

      <button
        type="button"
        onClick={onShowDetails}
        className="mt-4 flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 active:scale-[0.99]"
      >
        <span>Detayları göster</span>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      </button>
    </div>
  );
}
