"use client";

import { useMemo, useState } from "react";
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

export default function HistoryPage() {
  const { expenses, ready } = useWasteLessStore();
  const [filters, setFilters] = useState<ExpenseFilters>({});
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
          <h1 className="font-display text-2xl tracking-tight">
            Tüm harcamalar
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filtersActive ? `${filtered.length} / ${expenses.length}` : expenses.length}{" "}
            kayıt
          </p>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2 animate-fade-up delay-1">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-95",
            showFilters || filtersActive
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-white/70 bg-white/75 text-foreground/80 hover:bg-white"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtrele
          {filtersActive && (
            <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>
        {filtersActive && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
            onClick={() => setFilters({})}
          >
            <X className="h-3.5 w-3.5" />
            Temizle
          </button>
        )}
      </div>

      {showFilters && (
        <ExpenseFilterBar
          value={filters}
          onChange={setFilters}
          className="mb-4 animate-fade-up"
        />
      )}

      {!ready ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : expenses.length === 0 && !filtersActive ? (
        <EmptyState
          emoji="🧾"
          title="Henüz harcama yok"
          description="Fiş tara veya manuel giriş yap; harcama geçmişin burada birikir. İlk kayıttan sonra filtreleme ve arama da açılır."
          actionLabel="İlk harcamayı ekle"
          actionHref="/add"
        />
      ) : (
        <div className="animate-fade-up delay-2">
          <GroupedExpenseList
            expenses={filtered}
            emptyTitle={
              filtersActive ? "Filtreye uyan kayıt yok" : "Henüz kayıt yok"
            }
            emptyDescription={
              filtersActive
                ? "Filtreleri gevşet veya yeni harcama ekle."
                : "Fiş yükle veya hızlı butonla ekle."
            }
          />
        </div>
      )}
    </AppShell>
  );
}
