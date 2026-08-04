"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { EmptyState } from "@/components/empty-state";
import { GroupedExpenseList } from "@/components/grouped-expense-list";
import {
  ExpenseFilterBar,
  useFilteredExpenses,
} from "@/components/expense-filters";
import { useWasteLessStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import type { ExpenseFilters } from "@/lib/filters";

function HistoryPageInner() {
  const searchParams = useSearchParams();
  const { expenses, ready } = useWasteLessStore();
  const [filters, setFilters] = useState<ExpenseFilters>(() => ({
    categoryId: searchParams.get("categoryId") || undefined,
    merchant: searchParams.get("merchant") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    tagId: searchParams.get("tagId") || undefined,
  }));
  const [showFilters, setShowFilters] = useState(false);
  const filtered = useFilteredExpenses(expenses, filters);

  const activeCount = useMemo(
    () =>
      [
        filters.categoryId,
        filters.tagId,
        filters.merchant,
        filters.dateFrom,
        filters.dateTo,
      ].filter(Boolean).length,
    [filters]
  );
  const filtersActive = activeCount > 0;

  return (
    <AppShell>
      <header className="mb-5 flex items-center gap-3 animate-fade-up">
        <BackButton />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl tracking-tight">Geçmiş</h1>
          <p className="text-sm text-muted-foreground">
            Tüm harcamalarını filtrele ve incele
          </p>
        </div>
        <button
          type="button"
          aria-label="Filtreler"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95",
            showFilters || filtersActive
              ? "border-teal-200 bg-teal-50 text-teal-900"
              : "border-black/[0.06] bg-white text-muted-foreground"
          )}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {filtersActive && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </header>

      {showFilters && (
        <div className="mb-4 animate-fade-up">
          <ExpenseFilterBar value={filters} onChange={setFilters} />
          {filtersActive && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      {!ready ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Kayıt yok"
          description={
            filtersActive
              ? "Bu filtrelere uyan harcama bulunamadı."
              : "Henüz kayıtlı harcama yok."
          }
          actionLabel={filtersActive ? undefined : "Harcama ekle"}
          actionHref={filtersActive ? undefined : "/add"}
        />
      ) : (
        <GroupedExpenseList expenses={filtered} />
      )}
    </AppShell>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        </AppShell>
      }
    >
      <HistoryPageInner />
    </Suspense>
  );
}
