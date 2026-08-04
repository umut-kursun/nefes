"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, isWithinInterval, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { EmptyState } from "@/components/empty-state";
import { AppIcon } from "@/components/icons";
import { PremiumTeaser } from "@/components/premium-teaser";
import { TrendBadge } from "@/components/trend-badge";
import { useWasteLessStore } from "@/hooks/use-store";
import {
  getFuelStats,
  getParentCategoryBreakdownWithTrend,
  getPeriodRange,
  getPeriodTotals,
  formatSamePeriodMonthCaption,
  getSigaraStats,
  getYemeIcmeStats,
  isSpendingExpense,
  type PeriodScope,
} from "@/lib/analytics";
import { getCategoryMeta, isFuelCategory } from "@/lib/categories";
import { isValidFuelExpense } from "@/lib/fuel-memory";
import { normalizeMerchantName } from "@/lib/merchants";
import type { Expense } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

const PERIOD_TABS: { id: PeriodScope; label: string }[] = [
  { id: "day", label: "Günlük" },
  { id: "week", label: "Haftalık" },
  { id: "month", label: "Aylık" },
  { id: "year", label: "Yıllık" },
];

function periodLabel(scope: PeriodScope, now: Date): string {
  switch (scope) {
    case "day":
      return format(now, "d MMMM yyyy", { locale: tr });
    case "week":
      return "Bu hafta";
    case "year":
      return format(now, "yyyy", { locale: tr });
    default:
      return format(now, "MMMM yyyy", { locale: tr });
  }
}

function trendCaption(scope: PeriodScope, now: Date): string {
  switch (scope) {
    case "day":
      return "Düne göre";
    case "week":
      return "Geçen haftaya göre";
    case "year":
      return "Geçen yıla göre";
    default:
      return formatSamePeriodMonthCaption(now);
  }
}

function periodTotal(
  totals: ReturnType<typeof getPeriodTotals>,
  scope: PeriodScope
): number {
  switch (scope) {
    case "day":
      return totals.daily;
    case "week":
      return totals.weekly;
    case "year":
      return totals.yearly;
    default:
      return totals.monthly;
  }
}

function periodTrend(
  totals: ReturnType<typeof getPeriodTotals>,
  scope: PeriodScope
): number | null {
  switch (scope) {
    case "day":
      return totals.trends.daily;
    case "week":
      return totals.trends.weekly;
    case "year":
      return totals.trends.yearly;
    default:
      return totals.trends.monthly;
  }
}

function scopeExpenses(expenses: Expense[], scope: PeriodScope, now: Date) {
  const { start, end } = getPeriodRange(scope, now);
  return expenses.filter((e) => {
    if (!isSpendingExpense(e)) return false;
    try {
      return isWithinInterval(parseISO(e.date), { start, end });
    } catch {
      return false;
    }
  });
}

function historyHref(scope: PeriodScope, now: Date, extra?: Record<string, string>) {
  const { start, end } = getPeriodRange(scope, now);
  const params = new URLSearchParams({
    dateFrom: format(start, "yyyy-MM-dd"),
    dateTo: format(end, "yyyy-MM-dd"),
    ...extra,
  });
  return `/history?${params.toString()}`;
}

export default function ReportsPage() {
  const { expenses, categories, ready } = useWasteLessStore();
  const [scope, setScope] = useState<PeriodScope>("month");
  const now = useMemo(() => new Date(), []);

  const totals = useMemo(
    () => getPeriodTotals(expenses, now),
    [expenses, now]
  );

  const scoped = useMemo(
    () => scopeExpenses(expenses, scope, now),
    [expenses, scope, now]
  );

  const total = periodTotal(totals, scope);
  const trend = periodTrend(totals, scope);

  const topCategories = useMemo(() => {
    const rows = getParentCategoryBreakdownWithTrend(
      expenses,
      categories,
      scope,
      now
    );
    return [...rows].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expenses, categories, scope, now]);

  const maxCategoryTotal = topCategories[0]?.total ?? 1;

  const fuelCat = categories.find((c) => isFuelCategory(c));
  const fuelId = fuelCat?.id ?? "akaryakit";
  const fuelStats = useMemo(() => {
    const fuelExpenses = scoped.filter(
      (e) => e.category === fuelId || isValidFuelExpense(e)
    );
    return getFuelStats(fuelExpenses);
  }, [scoped, fuelId]);

  const sigaraStats = useMemo(
    () => getSigaraStats(scoped.filter((e) => e.category === "sigara")),
    [scoped]
  );

  const groceryStats = useMemo(
    () =>
      getYemeIcmeStats(
        scoped.filter((e) => e.category === "market" || e.category === "yeme_icme")
      ),
    [scoped]
  );

  const topMerchants = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const e of scoped) {
      const name =
        normalizeMerchantName(e.merchantName) || e.merchantName?.trim() || "Bilinmeyen";
      const cur = map.get(name) ?? { total: 0, count: 0 };
      cur.total += e.totalAmount || 0;
      cur.count += 1;
      map.set(name, cur);
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [scoped]);

  const hasData = expenses.some(isSpendingExpense);

  return (
    <AppShell>
      <header className="mb-5 animate-fade-up">
        <BackButton label="Geri" />
        <h1 className="font-display text-2xl tracking-tight">Raporlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dönem bazlı harcama özeti ve kategori kırılımı
        </p>
      </header>

      {!ready ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : !hasData ? (
        <EmptyState
          icon="receipt"
          title="Henüz rapor yok"
          description="Fiş tara veya harcama ekle; raporlar otomatik oluşur."
          actionLabel="Harcama ekle"
          actionHref="/add"
        />
      ) : (
        <div className="space-y-4 animate-fade-up delay-1">
          <div className="grid grid-cols-4 gap-1.5">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={`rounded-2xl border px-2 py-2.5 text-xs font-semibold transition active:scale-[0.98] sm:text-sm ${
                  scope === tab.id
                    ? "border-teal-200 bg-teal-50 text-teal-900"
                    : "border-black/[0.06] bg-white text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section className="rounded-3xl border border-black/[0.05] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {periodLabel(scope, now)}
            </p>
            <p className="mt-2 font-amount text-3xl font-bold tabular-nums">
              {formatMoney(total)}
            </p>
            {trend != null && (
              <div className="mt-2">
                <TrendBadge value={trend} comparedTo={trendCaption(scope, now)} />
              </div>
            )}
          </section>

          {topCategories.length > 0 && (
            <section className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">En çok harcanan</h2>
              <ul className="space-y-2">
                {topCategories.map((row) => {
                  const meta = getCategoryMeta(row.category, categories);
                  const sharePct = Math.min(
                    100,
                    Math.round((row.total / maxCategoryTotal) * 100)
                  );
                  return (
                    <li key={row.category}>
                      <Link
                        href={historyHref(scope, now, {
                          categoryId: row.category,
                        })}
                        className="block rounded-2xl px-2 py-2 transition hover:bg-black/[0.02] active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: meta.softColor,
                              color: meta.color,
                            }}
                          >
                            <AppIcon name={meta.icon} className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {meta.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.count} işlem · %{sharePct}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-amount text-sm font-bold">
                              {formatMoney(row.total)}
                            </p>
                            {row.trend != null && (
                              <TrendBadge
                                value={row.trend}
                                comparedTo={trendCaption(scope, now)}
                              />
                            )}
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${sharePct}%`,
                              backgroundColor: meta.color,
                              opacity: 0.35,
                            }}
                          />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {topMerchants.length > 0 && (
            <section className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">İşyerleri</h2>
              <ul className="space-y-2">
                {topMerchants.map((row) => (
                  <li key={row.name}>
                    <Link
                      href={historyHref(scope, now, { merchant: row.name })}
                      className="flex items-center justify-between rounded-2xl px-2 py-2 transition hover:bg-black/[0.02] active:scale-[0.99]"
                    >
                      <div>
                        <p className="text-sm font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.count} işlem
                        </p>
                      </div>
                      <p className="font-amount text-sm font-bold">
                        {formatMoney(row.total)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            {fuelStats.totalSpend > 0 && (
              <Link
                href={historyHref(scope, now, { categoryId: fuelId })}
                className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm transition hover:bg-black/[0.01] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <AppIcon name="fuel" className="h-4 w-4 text-blue-700" />
                  <p className="text-sm font-semibold">Akaryakıt</p>
                </div>
                <p className="mt-2 font-amount text-lg font-bold">
                  {formatMoney(fuelStats.totalSpend)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fuelStats.fillUps} dolum
                  {fuelStats.averageLiterPrice != null &&
                    ` · ort. ${formatMoney(fuelStats.averageLiterPrice)}/L`}
                </p>
              </Link>
            )}

            {sigaraStats.totalSpend > 0 && (
              <Link
                href={historyHref(scope, now, { categoryId: "sigara" })}
                className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm transition hover:bg-black/[0.01] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <AppIcon name="cigarette" className="h-4 w-4 text-amber-700" />
                  <p className="text-sm font-semibold">Sigara</p>
                </div>
                <p className="mt-2 font-amount text-lg font-bold">
                  {formatMoney(sigaraStats.totalSpend)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sigaraStats.purchaseCount} alım · {sigaraStats.packCount} paket
                </p>
              </Link>
            )}

            {groceryStats.totalSpend > 0 && (
              <Link
                href={historyHref(scope, now)}
                className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm transition hover:bg-black/[0.01] active:scale-[0.99] sm:col-span-2"
              >
                <div className="flex items-center gap-2">
                  <AppIcon name="shopping" className="h-4 w-4 text-teal-700" />
                  <p className="text-sm font-semibold">Market & yeme-içme</p>
                </div>
                <p className="mt-2 font-amount text-lg font-bold">
                  {formatMoney(groceryStats.totalSpend)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {groceryStats.visitCount} ziyaret
                  {groceryStats.topMerchants[0] &&
                    ` · en sık ${groceryStats.topMerchants[0].name}`}
                </p>
              </Link>
            )}
          </section>

          <PremiumTeaser storageKey="wl_premium_teaser_reports" />
        </div>
      )}
    </AppShell>
  );
}
