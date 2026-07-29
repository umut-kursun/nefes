"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Settings2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardSkeleton } from "@/components/skeleton";
import { SectionHeader } from "@/components/section-header";
import { useToast } from "@/components/toast";
import { AssistantCard } from "@/components/home/assistant-card";
import { HeroCard } from "@/components/home/hero-card";
import { PurchaseSearch } from "@/components/home/purchase-search";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { RecentExpenseCard } from "@/components/home/recent-expense-card";
import { CategoryCard } from "@/components/home/category-card";
import { useWasteLessStore } from "@/hooks/use-store";
import { getCategoryMeta } from "@/lib/categories";
import {
  getParentCategoryBreakdownWithTrend,
  getPeriodOverview,
  getPeriodRange,
  getPeriodTotals,
  type PeriodScope,
} from "@/lib/analytics";
import { getHomeAssistantInsights } from "@/lib/insights";
import { formatRelativeDate, formatTime } from "@/lib/datetime";
import { normalizeMerchantName } from "@/lib/merchants";
import { isWithinInterval, parseISO } from "date-fns";

function greetingLine(now: Date, displayName?: string | null): string {
  const h = now.getHours();
  const base =
    h < 6
      ? "İyi geceler"
      : h < 12
        ? "Günaydın"
        : h < 18
          ? "İyi günler"
          : "İyi akşamlar";
  const name = displayName?.trim();
  return name ? `${base}, ${name}` : base;
}

function periodTitle(period: PeriodScope): string {
  switch (period) {
    case "day":
      return "Bugünün harcaması";
    case "week":
      return "Bu haftanın harcaması";
    case "year":
      return "Bu yılın harcaması";
    default:
      return "Bu ayın harcaması";
  }
}

function periodCaption(period: PeriodScope): string {
  switch (period) {
    case "day":
      return "Düne göre";
    case "week":
      return "Geçen haftaya göre";
    case "year":
      return "Geçen yıla göre";
    default:
      return "Geçen aya göre";
  }
}

export default function HomePage() {
  const {
    ready,
    expenses,
    quickButtons,
    categories,
    tags,
    settings,
    tapQuickButton,
  } = useWasteLessStore();
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodScope>("day");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const totals = useMemo(
    () => (now ? getPeriodTotals(expenses, now) : null),
    [expenses, now]
  );
  const overview = useMemo(
    () =>
      now ? getPeriodOverview(expenses, period, now, categories) : null,
    [expenses, period, now, categories]
  );
  const periodMemory = useMemo(() => {
    if (!now) {
      return {
        purchaseCount: 0,
        merchantCount: 0,
        productCount: 0,
        scoped: [] as typeof expenses,
      };
    }
    const { start, end } = getPeriodRange(period, now);
    const scoped = expenses.filter((e) => {
      try {
        return isWithinInterval(parseISO(e.date), { start, end });
      } catch {
        return false;
      }
    });
    const merchants = new Set<string>();
    let productCount = 0;
    for (const e of scoped) {
      const m =
        normalizeMerchantName(e.merchantName) || e.merchantName?.trim();
      if (m) merchants.add(m);
      productCount += (e.items ?? []).filter((i) => i.name?.trim()).length;
    }
    return {
      purchaseCount: scoped.length,
      merchantCount: merchants.size,
      productCount,
      scoped,
    };
  }, [expenses, period, now]);

  const latestPurchase = useMemo(() => {
    const scoped = periodMemory.scoped;
    if (!scoped.length) return null;
    const newest = [...scoped].sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      const at = (b.time || "").localeCompare(a.time || "");
      if (at !== 0) return at;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    })[0]!;
    const merchant =
      normalizeMerchantName(newest.merchantName) ||
      newest.merchantName?.trim() ||
      getCategoryMeta(newest.category, categories).label;
    const timeLabel = newest.time
      ? formatTime(newest.time)
      : formatRelativeDate(newest.date);
    return {
      merchant,
      timeLabel,
      href: `/expense?id=${encodeURIComponent(newest.id)}`,
    };
  }, [periodMemory.scoped, categories]);

  const heroTotal =
    totals &&
    (period === "day"
      ? totals.daily
      : period === "week"
        ? totals.weekly
        : period === "year"
          ? totals.yearly
          : totals.monthly);
  const heroTrend =
    totals &&
    (period === "day"
      ? totals.trends.daily
      : period === "week"
        ? totals.trends.weekly
        : period === "year"
          ? totals.trends.yearly
          : totals.trends.monthly);

  const heroCategory = useMemo(() => {
    if (!overview?.largestCategory) return null;
    const meta = getCategoryMeta(overview.largestCategory.category, categories);
    return {
      id: overview.largestCategory.category,
      label: meta.label,
      color: meta.color,
      softColor: meta.softColor,
      icon: meta.icon,
    };
  }, [overview?.largestCategory, categories]);

  const topCategories = useMemo(() => {
    if (!now) return [];
    const rows = getParentCategoryBreakdownWithTrend(
      expenses,
      categories,
      period,
      now
    );
    return [...rows].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expenses, categories, period, now]);
  const maxCategoryTotal = topCategories[0]?.total || 1;

  const recentExpenses = useMemo(() => expenses.slice(0, 3), [expenses]);

  const assistantInsights = useMemo(
    () =>
      now
        ? getHomeAssistantInsights({ expenses, categories, tags, now }, 6)
        : [],
    // Recompute when data changes — not every clock tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, categories, tags, now]
  );

  return (
    <AppShell>
      <header className="mb-4 flex items-start justify-between animate-fade-up">
        <div className="min-w-0">
          <h1 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-[color:var(--ink)]">
            {now ? greetingLine(now, settings.displayName) : "Merhaba"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {now ? format(now, "EEEE, d MMMM yyyy", { locale: tr }) : "\u00a0"}
          </p>
          <p className="mt-0.5 font-amount text-sm tabular-nums text-foreground/70">
            {now ? format(now, "HH:mm:ss") : "--:--:--"}
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="Ayarlar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/[0.05] bg-white text-foreground/70 shadow-sm transition duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          <Settings2 className="h-[18px] w-[18px]" />
        </Link>
      </header>

      {!ready || !now ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-5">
          <div className="animate-fade-up delay-1">
            <HeroCard
              period={period}
              onPeriodChange={setPeriod}
              periodTitle={periodTitle(period)}
              caption={periodCaption(period)}
              total={heroTotal ?? 0}
              trend={heroTrend ?? null}
              purchaseCount={periodMemory.purchaseCount}
              merchantCount={periodMemory.merchantCount}
              productCount={periodMemory.productCount}
              largestCategory={heroCategory}
              largestMerchant={overview?.largestMerchant?.name ?? null}
              latestPurchase={latestPurchase}
            />
          </div>

          <div className="animate-fade-up delay-2">
            <PurchaseSearch />
          </div>

          {assistantInsights.length > 0 && (
            <div className="animate-fade-up delay-2">
              <AssistantCard insights={assistantInsights} />
            </div>
          )}

          <section className="animate-fade-up delay-3">
            <SectionHeader
              title="Hızlı ekle"
              actionLabel="Tümü"
              href="/quick-buttons"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {quickButtons.map((button) => (
                <QuickActionCard
                  key={button.id}
                  title={button.title}
                  amount={button.defaultAmount}
                  icon={button.icon}
                  color={button.color}
                  onClick={() => {
                    void (async () => {
                      await tapQuickButton(button);
                      toast(`${button.title} eklendi`, "success");
                    })();
                  }}
                />
              ))}
              <Link
                href="/quick-buttons"
                className="flex min-w-[80px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[0.12] bg-white/50 px-3 py-3 text-center transition duration-200 hover:bg-white active:scale-[0.97]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] text-foreground/60">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Daha fazla
                </span>
              </Link>
            </div>
          </section>

          <section className="animate-fade-up delay-3">
            <SectionHeader
              title="Kategoriler"
              actionLabel="Tümü"
              href="/categories"
            />
            <div className="space-y-2">
              {topCategories.map((row) => {
                const meta = getCategoryMeta(row.category, categories);
                const progress = Math.min(
                  100,
                  Math.round((row.total / maxCategoryTotal) * 100)
                );
                const childLines = row.children.filter(
                  (c) => c.category !== row.category
                );
                const previewSource =
                  childLines.length > 0 ? childLines : row.children;
                const childrenPreview = previewSource
                  .slice(0, 3)
                  .map((c) => ({
                    label: getCategoryMeta(c.category, categories).label,
                    total: c.total,
                  }))
                  .filter(
                    (p, _, arr) =>
                      !(arr.length === 1 && p.label === meta.label)
                  );
                return (
                  <CategoryCard
                    key={row.category}
                    href={`/category?id=${encodeURIComponent(row.category)}`}
                    icon={meta.icon}
                    label={meta.label}
                    color={meta.color}
                    softColor={meta.softColor}
                    total={row.total}
                    count={row.count}
                    trend={row.trend}
                    trendComparedTo={periodCaption(period)}
                    progress={progress}
                    childrenPreview={childrenPreview}
                  />
                );
              })}
              {topCategories.length === 0 && (
                <p className="rounded-2xl border border-black/[0.05] bg-white px-3 py-6 text-center text-sm text-muted-foreground shadow-sm">
                  Bu dönemde kayıt yok.
                </p>
              )}
            </div>
          </section>

          <section className="animate-fade-up delay-4">
            <SectionHeader
              title="Son satın almalar"
              actionLabel="Tümü"
              href="/history"
            />
            <div className="space-y-2">
              {recentExpenses.map((expense) => (
                <RecentExpenseCard key={expense.id} expense={expense} />
              ))}
              {recentExpenses.length === 0 && (
                <div className="rounded-2xl border border-black/[0.05] bg-white px-4 py-8 text-center shadow-sm">
                  <p className="font-medium">Henüz satın alma yok</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fiş yükle veya hızlı butonla ekle.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
