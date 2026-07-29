"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { CategoryProductsPanel } from "@/components/category-products-panel";
import { GroupedExpenseList } from "@/components/grouped-expense-list";
import { AppIcon } from "@/components/icons";
import { TrendBadge } from "@/components/trend-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWasteLessStore } from "@/hooks/use-store";
import {
  getCategoryInsights,
  getFuelStats,
  getSigaraStats,
} from "@/lib/analytics";
import {
  getChildren,
  expensesForCategoryTree,
  hasChildren,
} from "@/lib/category-hierarchy";
import {
  isCigaretteCategory,
  isFuelCategory,
  resolveCategory,
} from "@/lib/categories";
import { formatPlate, normalizePlate } from "@/lib/plate";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-3 transition duration-200 hover:-translate-y-0.5 hover:bg-white">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function CategoryDetailView() {
  const params = useSearchParams();
  const categoryId = params.get("id") || "other";
  const { categories, expenses, ready } = useWasteLessStore();
  const category = resolveCategory(categories, categoryId);

  const [merchantFilter, setMerchantFilter] = useState("all");
  const [plateFilter, setPlateFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showPlateSummary, setShowPlateSummary] = useState(false);

  const isFuel = isFuelCategory(category);
  const isCigarette = isCigaretteCategory(category);
  const isParent = hasChildren(category.id, categories);
  const parentCategory = category.parentId
    ? resolveCategory(categories, category.parentId)
    : null;
  const children = useMemo(
    () => getChildren(category.id, categories),
    [category.id, categories]
  );

  const treeExpenses = useMemo(
    () =>
      isParent
        ? expensesForCategoryTree(expenses, category.id, categories)
        : expenses.filter((e) => e.category === category.id),
    [expenses, category.id, categories, isParent]
  );

  const plates = useMemo(() => {
    if (!isFuel) return [] as string[];
    const set = new Set<string>();
    for (const e of treeExpenses) {
      const p = normalizePlate(e.fuel?.plate);
      if (p) set.add(p);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [treeExpenses, isFuel]);

  const merchants = useMemo(() => {
    const set = new Set<string>();
    for (const e of treeExpenses) {
      const name = e.merchantName?.trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [treeExpenses]);

  const filtered = useMemo(() => {
    return treeExpenses.filter((e) => {
      if (merchantFilter !== "all" && (e.merchantName || "") !== merchantFilter) {
        return false;
      }
      if (plateFilter !== "all" && normalizePlate(e.fuel?.plate) !== plateFilter) {
        return false;
      }
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [treeExpenses, merchantFilter, plateFilter, dateFrom, dateTo]);

  const childBreakdown = useMemo(() => {
    if (!isParent) return [] as { id: string; label: string; icon: string; color: string; softColor: string; total: number; count: number }[];

    const map = new Map<string, { total: number; count: number }>();
    for (const e of filtered) {
      const key = e.category;
      const cur = map.get(key) ?? { total: 0, count: 0 };
      cur.total += e.totalAmount || 0;
      cur.count += 1;
      map.set(key, cur);
    }

    const rows: {
      id: string;
      label: string;
      icon: string;
      color: string;
      softColor: string;
      total: number;
      count: number;
    }[] = [];

    for (const child of children) {
      const data = map.get(child.id);
      if (!data || data.count === 0) continue;
      rows.push({
        id: child.id,
        label: child.label,
        icon: child.icon,
        color: child.color,
        softColor: child.softColor,
        total: data.total,
        count: data.count,
      });
    }

    const onParent = map.get(category.id);
    if (onParent && onParent.count > 0) {
      rows.push({
        id: category.id,
        label: `${category.label} (genel)`,
        icon: category.icon,
        color: category.color,
        softColor: category.softColor,
        total: onParent.total,
        count: onParent.count,
      });
    }

    return rows.sort((a, b) => b.total - a.total);
  }, [isParent, children, filtered, category]);

  const plateBreakdown = useMemo(() => {
    if (!isFuel) return [] as { plate: string; total: number; liters: number; count: number }[];
    const map = new Map<string, { total: number; liters: number; count: number }>();
    for (const e of filtered) {
      const p = normalizePlate(e.fuel?.plate);
      if (!p) continue;
      const cur = map.get(p) ?? { total: 0, liters: 0, count: 0 };
      cur.total += e.totalAmount || 0;
      cur.liters += e.fuel?.liters || 0;
      cur.count += 1;
      map.set(p, cur);
    }
    return Array.from(map.entries())
      .map(([plate, data]) => ({ plate, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, isFuel]);

  const insights = useMemo(() => getCategoryInsights(filtered), [filtered]);
  const fuel = useMemo(() => getFuelStats(filtered), [filtered]);
  const sigara = useMemo(() => getSigaraStats(filtered), [filtered]);

  const topMerchants = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const entry of filtered) {
      const name = entry.merchantName?.trim() || "Bilinmeyen";
      const cur = map.get(name) ?? { total: 0, count: 0 };
      cur.total += entry.totalAmount;
      cur.count += 1;
      map.set(name, cur);
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filtered]);

  const activeFilterCount = [
    merchantFilter !== "all",
    plateFilter !== "all",
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  const backHref = parentCategory
    ? `/category?id=${encodeURIComponent(parentCategory.id)}`
    : "/";

  if (!ready) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-5">
        {parentCategory ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {parentCategory.label}
          </Link>
        ) : (
          <BackButton label="Geri" className="min-h-11" />
        )}
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: category.softColor,
              color: category.color,
            }}
          >
            <AppIcon name={category.icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl tracking-tight">
              {category.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              {category.description || "Kategori detayı"}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-95",
            showFilters || activeFilterCount > 0
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-white/70 bg-white/75 text-foreground/80 hover:bg-white"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtreleri göster
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-muted-foreground"
            onClick={() => {
              setMerchantFilter("all");
              setPlateFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
          >
            <X className="h-3.5 w-3.5" />
            Temizle
          </button>
        )}
      </div>

      {showFilters && (
        <section className="mb-5 space-y-3 rounded-2xl border border-white/70 bg-white/80 p-4">
          {merchants.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="merchantFilter">Mağaza / işyeri</Label>
              <select
                id="merchantFilter"
                className="h-12 rounded-xl border border-input bg-background px-3 text-base"
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
              >
                <option value="all">Tümü</option>
                {merchants.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isFuel && plates.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="plateFilter">Plaka</Label>
              <select
                id="plateFilter"
                className="h-12 rounded-xl border border-input bg-background px-3 text-base tabular-nums"
                value={plateFilter}
                onChange={(e) => setPlateFilter(e.target.value)}
              >
                <option value="all">Tüm plakalar</option>
                {plates.map((plate) => (
                  <option key={plate} value={plate}>
                    {formatPlate(plate)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="dateFrom">Başlangıç</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateTo">Bitiş</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </section>
      )}

      <section className="mb-5 grid grid-cols-2 gap-2">
        <Stat
          label="Toplam"
          value={
            filtered.length > 0
              ? formatMoney(
                  filtered.reduce((s, e) => s + (e.totalAmount || 0), 0)
                )
              : "—"
          }
        />
        <Stat label="Kayıt" value={String(filtered.length)} />
        <Stat
          label="Ortalama"
          value={
            insights.count > 0 ? formatMoney(insights.averageSpend) : "—"
          }
        />
        <div className="rounded-2xl border border-white/70 bg-white/75 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Aylık trend
          </p>
          <div className="mt-1">
            <TrendBadge
              value={insights.monthlyTrend}
              comparedTo="geçen aya göre"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            Bu ay {formatMoney(insights.thisMonth)}
          </p>
        </div>
      </section>

      {isFuel && (
        <section className="mb-5 grid grid-cols-2 gap-2">
          <Stat
            label="Toplam litre"
            value={
              fuel.totalLiters ? `${formatNumber(fuel.totalLiters)} L` : "—"
            }
          />
          <Stat
            label="Ort. ₺/L"
            value={
              fuel.averageLiterPrice != null
                ? formatMoney(fuel.averageLiterPrice)
                : "—"
            }
          />
          <Stat label="Dolum" value={String(fuel.fillUps)} />
          <Stat
            label="En büyük"
            value={
              insights.biggest
                ? formatMoney(insights.biggest.totalAmount)
                : "—"
            }
          />
        </section>
      )}

      {isCigarette && (
        <section className="mb-5 grid grid-cols-3 gap-2">
          <Stat label="Toplam" value={formatMoney(sigara.totalSpend)} />
          <Stat label="Alım" value={String(sigara.purchaseCount)} />
          <Stat label="Paket" value={String(sigara.packCount)} />
        </section>
      )}

      {isParent && childBreakdown.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-3 text-sm font-semibold">Alt kategoriler</h2>
          <ul className="space-y-2">
            {childBreakdown.map((row) => {
              const href =
                row.id === category.id
                  ? undefined
                  : `/category?id=${encodeURIComponent(row.id)}`;
              const content = (
                <>
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: row.softColor, color: row.color }}
                  >
                    <AppIcon name={row.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {row.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.count} kayıt
                    </span>
                  </span>
                  <span className="font-amount shrink-0 text-[15px] font-bold">
                    {formatMoney(row.total)}
                  </span>
                </>
              );
              return (
                <li key={row.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-black/[0.05] bg-white p-3 shadow-sm transition active:scale-[0.99]"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-black/[0.05] bg-white/80 p-3">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isFuel && plateBreakdown.length > 0 && (
        <section className="mb-5 rounded-2xl border border-white/70 bg-white/75 p-3">
          <button
            type="button"
            onClick={() => setShowPlateSummary((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-1 text-left"
          >
            <span>
              <span className="block text-sm font-semibold">Plakaya göre</span>
              <span className="text-xs text-muted-foreground">
                {plateBreakdown.length} plaka · isteğe bağlı
              </span>
            </span>
            {showPlateSummary ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showPlateSummary && (
            <ul className="mt-2 space-y-2 border-t border-black/[0.05] pt-2">
              {plateBreakdown.map((row) => (
                <li
                  key={row.plate}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <button
                    type="button"
                    className="flex min-h-11 items-center gap-2 text-left font-medium text-primary"
                    onClick={() => {
                      setPlateFilter((prev) =>
                        prev === row.plate ? "all" : row.plate
                      );
                      setShowFilters(true);
                    }}
                  >
                    <span className="tabular-nums">{formatPlate(row.plate)}</span>
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      {row.count} dolum
                      {row.liters ? ` · ${formatNumber(row.liters)} L` : ""}
                    </span>
                  </button>
                  <p className="font-semibold tabular-nums">
                    {formatMoney(row.total)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Purchases first — same expandable Purchase Card for every category */}
      <section className="mb-5">
        <h2 className="mb-2 px-1 text-sm font-semibold">Alışverişler</h2>
        <GroupedExpenseList
          expenses={filtered}
          emptyTitle="Filtreye uyan kayıt yok"
          emptyDescription="Filtreleri gevşet veya yeni harcama ekle."
        />
      </section>

      {topMerchants.length > 0 && (
        <section className="mb-5 rounded-2xl border border-white/70 bg-white/75 p-4">
          <h2 className="mb-3 text-sm font-semibold">En çok harcanan yerler</h2>
          <ul className="space-y-2">
            {topMerchants.map((merchant) => (
              <li
                key={merchant.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <button
                  type="button"
                  className="min-h-11 text-left font-medium text-primary"
                  onClick={() => {
                    setMerchantFilter(merchant.name);
                    setShowFilters(true);
                  }}
                >
                  {merchant.name}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {merchant.count} ziyaret
                  </span>
                </button>
                <p className="font-semibold tabular-nums">
                  {formatMoney(merchant.total)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Product analytics after purchases — optional deeper view */}
      {!isParent && filtered.some((e) => (e.items?.length ?? 0) > 0) && (
        <CategoryProductsPanel expenses={filtered} />
      )}
      {isParent && (
        <CategoryProductsPanel
          expenses={filtered.filter((e) => e.category === category.id)}
        />
      )}
    </AppShell>
  );
}
