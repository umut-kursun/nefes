"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
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
  getPeriodTotals,
  getSigaraStats,
  getYemeIcmeStats,
  type PeriodScope,
} from "@/lib/analytics";
import { getCategoryMeta, isFuelCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/utils";

function periodLabel(scope: PeriodScope, now: Date): string {
  if (scope === "year") {
    return format(now, "yyyy", { locale: tr });
  }
  return format(now, "MMMM yyyy", { locale: tr });
}

function trendCaption(scope: PeriodScope): string {
  return scope === "year" ? "Geçen yıla göre" : "Geçen aya göre";
}

export default function ReportsPage() {
  const { expenses, categories, ready } = useWasteLessStore();
  const [scope, setScope] = useState<PeriodScope>("month");
  const now = useMemo(() => new Date(), []);

  const totals = useMemo(
    () => getPeriodTotals(expenses, now),
    [expenses, now]
  );

  const total =
    scope === "year" ? totals.yearly : totals.monthly;
  const trend =
    scope === "year" ? totals.trends.yearly : totals.trends.monthly;

  const topCategories = useMemo(() => {
    const rows = getParentCategoryBreakdownWithTrend(
      expenses,
      categories,
      scope,
      now
    );
    return [...rows].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expenses, categories, scope, now]);

  const fuelCat = categories.find((c) => isFuelCategory(c));
  const fuelId = fuelCat?.id ?? "akaryakit";
  const fuelStats = useMemo(() => {
    const fuelExpenses = expenses.filter(
      (e) => e.category === fuelId || !!e.fuel?.pricePerLiter
    );
    return getFuelStats(fuelExpenses);
  }, [expenses, fuelId]);

  const sigaraStats = useMemo(
    () => getSigaraStats(expenses.filter((e) => e.category === "sigara")),
    [expenses]
  );

  const groceryStats = useMemo(
    () =>
      getYemeIcmeStats(
        expenses.filter((e) => e.category === "market" || e.category === "yeme_icme")
      ),
    [expenses]
  );

  const hasData = expenses.length > 0;

  return (
    <AppShell>
      <header className="mb-5 animate-fade-up">
        <BackButton label="Geri" />
        <h1 className="font-display text-2xl tracking-tight">Raporlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aylık ve yıllık harcama özeti
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
          <div className="flex gap-2">
            {(["month", "year"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                  scope === s
                    ? "border-teal-200 bg-teal-50 text-teal-900"
                    : "border-black/[0.06] bg-white text-muted-foreground"
                }`}
              >
                {s === "month" ? "Aylık" : "Yıllık"}
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
                <TrendBadge value={trend} comparedTo={trendCaption(scope)} />
              </div>
            )}
          </section>

          {topCategories.length > 0 && (
            <section className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">En çok harcanan</h2>
              <ul className="space-y-2">
                {topCategories.map((row) => {
                  const meta = getCategoryMeta(row.category, categories);
                  return (
                    <li key={row.category}>
                      <Link
                        href={`/category?id=${encodeURIComponent(row.category)}`}
                        className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-black/[0.02] active:scale-[0.99]"
                      >
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
                            {row.count} işlem
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-amount text-sm font-bold">
                            {formatMoney(row.total)}
                          </p>
                          {row.trend != null && (
                            <TrendBadge
                              value={row.trend}
                              comparedTo={trendCaption(scope)}
                            />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            {fuelStats.totalSpend > 0 && (
              <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
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
              </div>
            )}

            {sigaraStats.totalSpend > 0 && (
              <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
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
              </div>
            )}

            {groceryStats.totalSpend > 0 && (
              <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm sm:col-span-2">
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
              </div>
            )}
          </section>

          <PremiumTeaser storageKey="wl_premium_teaser_reports" />
        </div>
      )}
    </AppShell>
  );
}
