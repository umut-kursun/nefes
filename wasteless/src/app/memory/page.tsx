"use client";

import {
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, ImageIcon, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BottomSheet } from "@/components/bottom-sheet";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { useWasteLessStore } from "@/hooks/use-store";
import {
  searchPurchaseMemory,
  type PurchaseMemoryHit,
  type PurchaseMemoryResult,
} from "@/lib/analytics";
import { formatDate, formatRelativeDate } from "@/lib/datetime";
import {
  extractFuelCity,
  inferFuelTypeKey,
  type FuelBreakdownRow,
} from "@/lib/fuel-memory";
import { displayMerchantName, normalizeKey, normalizeMerchantName } from "@/lib/merchants";
import type { TobaccoMerchantRow } from "@/lib/tobacco-memory";
import type { Expense } from "@/lib/types";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

const POPULAR_SEARCHES = [
  { emoji: "☕", label: "Kahve", query: "Kahve" },
  { emoji: "⛽", label: "Akaryakıt", query: "Akaryakıt" },
  { emoji: "🥛", label: "Süt", query: "Süt" },
  { emoji: "🛒", label: "File Market", query: "File Market" },
] as const;

type MemoryDrillDown = {
  title: string;
  subtitle?: string;
  hits: PurchaseMemoryHit[];
  highlightKeys?: Set<string>;
} | null;

const INTERACTIVE =
  "cursor-pointer transition duration-200 hover:bg-teal-50/50 active:scale-95";

function hitKey(hit: PurchaseMemoryHit): string {
  return `${hit.expenseId}-${hit.date}-${hit.itemName}-${hit.price}`;
}

function hitsWithUnitPrice(hits: PurchaseMemoryHit[]): PurchaseMemoryHit[] {
  return hits.filter((h) => h.unitPrice != null && h.unitPrice > 0);
}

function tobaccoMerchantBucket(name: string | null | undefined): string {
  const normalized = normalizeKey(normalizeMerchantName(name ?? "") || name || "");
  if (/migros/.test(normalized)) return "Migros";
  if (/tekel|tekel\s*bay/i.test(normalized)) return "Tekel";
  if (/file|bim|a101|carrefour|sok/.test(normalized)) {
    return normalizeMerchantName(name ?? "") || "Market";
  }
  return normalizeMerchantName(name ?? "") || "Diğer";
}

function filterFuelHitsByRow(
  hits: PurchaseMemoryHit[],
  expenses: Expense[],
  tab: "plate" | "type" | "city",
  rowKey: string
): PurchaseMemoryHit[] {
  const expenseById = new Map(expenses.map((e) => [e.id, e]));
  return hits.filter((hit) => {
    const expense = expenseById.get(hit.expenseId);
    if (!expense) return false;
    if (tab === "plate") {
      return normalizeKey(expense.fuel?.plate?.trim() || "—") === rowKey;
    }
    if (tab === "type") {
      return inferFuelTypeKey(expense) === rowKey;
    }
    return normalizeKey(extractFuelCity(expense) || "Bilinmeyen") === rowKey;
  });
}

function filterTobaccoHitsByMerchant(
  hits: PurchaseMemoryHit[],
  rowKey: string
): PurchaseMemoryHit[] {
  return hits.filter(
    (h) => normalizeKey(tobaccoMerchantBucket(h.store)) === rowKey
  );
}

function priceChangeHighlightKeys(result: PurchaseMemoryResult): Set<string> {
  const keys = new Set<string>();
  const priced = result.hits.filter((h) => {
    const val = h.unitLabel === "₺/L" ? h.unitPrice : (h.unitPrice ?? h.price);
    return val != null;
  });
  if (priced[0]) keys.add(hitKey(priced[0]));
  if (priced[1]) keys.add(hitKey(priced[1]));
  return keys;
}

function formatUnitMoney(
  amount: number | null | undefined,
  unitLabel: string | null | undefined,
  currency = "TRY"
): string {
  if (amount == null) return "—";
  const money = formatMoney(amount, currency);
  if (!unitLabel) return money;
  // unitLabel is like "₺/L" — replace leading ₺ with formatted money path
  const suffix = unitLabel.includes("/")
    ? unitLabel.slice(unitLabel.indexOf("/"))
    : "";
  return suffix ? `${money}${suffix}` : money;
}

function Badge({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const className = cn(
    "min-w-0 rounded-2xl border border-black/[0.04] bg-white/90 px-3 py-2.5 shadow-sm text-left w-full",
    onClick && INTERACTIVE
  );
  const content = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-[color:var(--ink)]">
        {value}
      </p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

function StatRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const className = cn(
    "flex w-full items-baseline justify-between gap-3 border-b border-black/[0.04] py-2.5 text-left last:border-0",
    onClick && INTERACTIVE
  );
  const content = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-right">
        {value}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

function FuelBreakdownTable({
  title,
  rows,
  unitLabel,
  onRowClick,
}: {
  title: string;
  rows: readonly FuelBreakdownRow[];
  unitLabel: string;
  onRowClick?: (row: FuelBreakdownRow) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              disabled={!onRowClick}
              className={cn(
                "w-full rounded-xl border border-black/[0.04] bg-white/90 px-3 py-2.5 text-left",
                onRowClick && INTERACTIVE
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{row.label}</p>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(row.totalSpend)}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.fillUps} dolum ·{" "}
                {row.totalLiters > 0 ? `${formatNumber(row.totalLiters)} L` : "—"} · ort.{" "}
                {row.avgPricePerLiter > 0
                  ? formatUnitMoney(row.avgPricePerLiter, unitLabel)
                  : "—"}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TobaccoBreakdownCard({
  result,
  onDrillDown,
}: {
  result: PurchaseMemoryResult;
  onDrillDown: (drill: MemoryDrillDown) => void;
}) {
  const breakdown = result.tobaccoBreakdowns;
  if (!breakdown || breakdown.totalPacks <= 0) return null;

  return (
    <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Tütün analizi
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Badge
          label="Toplam paket"
          value={`${formatNumber(breakdown.totalPacks)} paket`}
          onClick={() =>
            onDrillDown({
              title: "Toplam paket",
              hits: result.hits,
            })
          }
        />
        <Badge
          label="Ort. ₺/paket"
          value={formatMoney(breakdown.avgPricePerPack)}
          onClick={() =>
            onDrillDown({
              title: "Ort. ₺/paket",
              subtitle: "Birim fiyatı olan alımlar",
              hits: hitsWithUnitPrice(result.hits),
            })
          }
        />
      </div>
      {breakdown.byMerchant.length > 0 && (
        <ul className="mt-4 space-y-2">
          {breakdown.byMerchant.map((row: TobaccoMerchantRow) => (
            <li key={row.key}>
              <button
                type="button"
                onClick={() =>
                  onDrillDown({
                    title: row.label,
                    subtitle: "Tütün alımları",
                    hits: filterTobaccoHitsByMerchant(result.hits, row.key),
                  })
                }
                className={cn(
                  "w-full rounded-xl border border-black/[0.04] bg-white/90 px-3 py-2.5 text-left",
                  INTERACTIVE
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{row.label}</p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(row.totalSpend)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.packs} paket · ort. {formatMoney(row.avgPricePerPack)}/paket
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FuelBreakdownTabs({
  result,
  expenses,
  onDrillDown,
}: {
  result: PurchaseMemoryResult;
  expenses: Expense[];
  onDrillDown: (drill: MemoryDrillDown) => void;
}) {
  const [tab, setTab] = useState<"plate" | "type" | "city">("type");
  const breakdowns = result.fuelBreakdowns;
  if (!breakdowns) return null;

  const unitLabel = result.unitLabel ?? "₺/L";

  const rows =
    tab === "plate"
      ? breakdowns.byPlate
      : tab === "city"
        ? breakdowns.byCity
        : breakdowns.byFuelType;

  const tabLabel =
    tab === "plate" ? "Plaka" : tab === "city" ? "Şehir" : "Yakıt cinsi";

  return (
    <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Yakıt analizi
      </p>
      <div className="mt-3 flex gap-1.5">
        {(
          [
            ["type", "Yakıt cinsi"],
            ["plate", "Plaka"],
            ["city", "Şehir"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              tab === id
                ? "bg-teal-800 text-white"
                : "bg-black/[0.04] text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <FuelBreakdownTable
          title=""
          rows={rows}
          unitLabel={unitLabel}
          onRowClick={(row) =>
            onDrillDown({
              title: row.label,
              subtitle: tabLabel,
              hits: filterFuelHitsByRow(result.hits, expenses, tab, row.key),
            })
          }
        />
      </div>
    </section>
  );
}

function PriceChangeCard({
  result,
  onDrillDown,
}: {
  result: PurchaseMemoryResult;
  onDrillDown: (drill: MemoryDrillDown) => void;
}) {
  const pct = result.priceChangePct;
  const from = result.previousComparablePrice;
  const to = result.latestComparablePrice;
  if (pct == null || from == null || to == null) return null;

  const up = pct > 0;
  const flat = Math.abs(pct) < 0.5;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const label = flat
    ? "Birim fiyat aynı kaldı"
    : up
      ? `Birim fiyat %${Math.round(Math.abs(pct))} arttı`
      : `Birim fiyat %${Math.round(Math.abs(pct))} düştü`;

  return (
    <button
      type="button"
      onClick={() =>
        onDrillDown({
          title: "Fiyat değişimi",
          subtitle: `${formatUnitMoney(from, result.unitLabel)} → ${formatUnitMoney(to, result.unitLabel)}`,
          hits: hitsWithUnitPrice(result.hits),
          highlightKeys: priceChangeHighlightKeys(result),
        })
      }
      className={cn(
        "w-full rounded-2xl border border-white/70 bg-white/80 p-4 text-left shadow-sm",
        INTERACTIVE
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Fiyat değişimi
      </p>
      <div
        className={cn(
          "mt-2 flex items-center gap-1.5 text-[15px] font-semibold",
          flat
            ? "text-muted-foreground"
            : up
              ? "text-rose-700"
              : "text-teal-700"
        )}
      >
        {!flat && <Icon className="h-4 w-4 shrink-0" />}
        {label}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums">
          {formatUnitMoney(from, result.unitLabel)}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="font-semibold tabular-nums">
          {formatUnitMoney(to, result.unitLabel)}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {result.priceCompareLabel.charAt(0).toUpperCase() +
          result.priceCompareLabel.slice(1)}
        .
      </p>
    </button>
  );
}

function TimelineCard({
  hit,
  highlighted,
}: {
  hit: PurchaseMemoryHit;
  highlighted?: boolean;
}) {
  const relative = formatRelativeDate(hit.date);
  const absolute = formatDate(hit.date);
  const isFuelHit = hit.unitLabel === "₺/L";

  return (
    <Link
      href={`/expense?id=${encodeURIComponent(hit.expenseId)}`}
      className={cn(
        "block rounded-2xl border bg-white p-3.5 shadow-sm transition active:scale-[0.99]",
        highlighted
          ? "border-teal-300 ring-2 ring-teal-200/80"
          : "border-black/[0.05]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {displayMerchantName(hit.store, hit.itemName)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {absolute}
            <span className="text-black/20"> · </span>
            {relative}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-amount text-[15px] font-bold tabular-nums">
            {hit.price != null ? formatMoney(hit.price, hit.currency) : "—"}
          </p>
          {hit.hasReceipt && (
            <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-teal-800">
              <ImageIcon className="h-3 w-3" />
              Fiş
            </span>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {(isFuelHit || hit.unitPrice != null) && (
          <span className="tabular-nums">
            Birim{" "}
            <span className="font-medium text-foreground/80">
              {formatUnitMoney(hit.unitPrice, hit.unitLabel, hit.currency)}
            </span>
          </span>
        )}
        {(isFuelHit || hit.quantity != null) && (
          <span className="tabular-nums">
            Miktar{" "}
            <span className="font-medium text-foreground/80">
              {hit.quantity != null
                ? `${formatNumber(hit.quantity)}${hit.unit ? ` ${hit.unit}` : ""}`
                : "—"}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}

function MemoryDrillDownSheet({
  drillDown,
  onClose,
}: {
  drillDown: MemoryDrillDown;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      open={drillDown != null}
      onClose={onClose}
      title={drillDown?.title ?? ""}
    >
      {drillDown && (
        <div className="space-y-3">
          {drillDown.subtitle && (
            <p className="text-sm text-muted-foreground">{drillDown.subtitle}</p>
          )}
          {drillDown.hits.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Gösterilecek kayıt yok
            </p>
          ) : (
            <ul className="space-y-2 pb-2">
              {drillDown.hits.map((hit) => (
                <li key={hitKey(hit)}>
                  <TimelineCard
                    hit={hit}
                    highlighted={drillDown.highlightKeys?.has(hitKey(hit))}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function PurchaseMemoryInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlQuery = params.get("q") ?? "";
  const { expenses, categories, ready } = useWasteLessStore();
  const [query, setQuery] = useState(urlQuery);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPushedUrl = useRef(urlQuery.trim());
  const [drillDown, setDrillDown] = useState<MemoryDrillDown>(null);

  const openDrillDown = (drill: MemoryDrillDown) => setDrillDown(drill);
  const closeDrillDown = () => setDrillDown(null);

  // Sync FROM url only for EXTERNAL navigation (not our own replace)
  useEffect(() => {
    if (urlQuery.trim() === lastPushedUrl.current) return;
    setQuery(urlQuery);
    lastPushedUrl.current = urlQuery.trim();
  }, [urlQuery]);

  // Keep ?q= in the URL so Back from Purchase Detail restores search text.
  useEffect(() => {
    const trimmed = deferredQuery.trim();
    if (trimmed === lastPushedUrl.current) return;
    lastPushedUrl.current = trimmed;
    const next = trimmed
      ? `${pathname}?q=${encodeURIComponent(trimmed)}`
      : pathname;
    router.replace(next, { scroll: false });
  }, [deferredQuery, pathname, router]);

  const result = useMemo(
    () => searchPurchaseMemory(expenses, deferredQuery, categories),
    [expenses, deferredQuery, categories]
  );

  const lastRelative = result?.last
    ? formatRelativeDate(result.last.date)
    : null;

  return (
    <AppShell>
      <header className="sticky top-0 z-30 -mx-4 mb-5 flex items-start justify-between gap-3 bg-[color:var(--surface)]/75 px-4 py-3 backdrop-blur-md animate-fade-up">
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-tight">Satın alma hafızası</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ne aldığını, nereden ve kaça hatırla
          </p>
        </div>
        <Link
          href="/calendar"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-black/[0.05] bg-white px-3 text-sm font-semibold text-foreground/80 shadow-sm transition-all duration-200 active:scale-95"
        >
          Takvim
        </Link>
      </header>

      <div className="relative mb-5 animate-fade-up delay-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ne ödemiştim… Kahve, Shell, Süt…"
          className="pl-10"
          enterKeyHint="search"
          inputMode="search"
        />
      </div>

      {ready && expenses.length > 0 && query.trim().length === 0 && (
        <div className="mb-4 animate-fade-up delay-1">
          <p className="mb-2 px-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Popüler aramalar
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((chip) => (
              <button
                key={chip.query}
                type="button"
                onClick={() => {
                  setQuery(chip.query);
                  inputRef.current?.focus();
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-2",
                  "text-sm font-medium shadow-sm transition duration-200",
                  "hover:-translate-y-0.5 hover:border-teal-200/80 hover:bg-teal-50/60 active:scale-[0.97]"
                )}
              >
                <span aria-hidden>{chip.emoji}</span>
                {chip.label}
              </button>
            ))}
          </div>
          <p className="mt-4 px-0.5 text-center text-sm text-muted-foreground">
            Bir chip seç veya en az 2 karakter yaz.
          </p>
        </div>
      )}

      {!ready && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}

      {ready && expenses.length === 0 && (
        <EmptyState
          emoji="🧠"
          title="Satın alma hafızan boş"
          description="Fiş tara veya harcama ekle; ürün ve mağaza araması burada çalışmaya başlar. Süt ne zaman aldın, fiyat nasıl değişti — hepsini bul."
          actionLabel="İlk fişi tara"
          actionHref="/add?welcome=1"
        />
      )}

      {result && result.hits.length === 0 && (
        <EmptyState
          title="Sonuç yok"
          description={`"${result.query}" için kayıtlı alım bulunamadı. Farklı bir arama dene veya yeni fiş ekle.`}
          actionLabel="Fiş ekle"
          actionHref="/add"
          className="py-10"
        />
      )}

      {result && result.last && (
        <div className="space-y-4 animate-fade-up delay-2">
          {/* Primary summary */}
          <section className="rounded-3xl border border-black/[0.04] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
            <h2 className="font-display text-2xl tracking-tight">
              {result.displayName}
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Badge
                label="Alım"
                value={`${result.purchaseCount} kez`}
                onClick={() =>
                  openDrillDown({ title: "Alım", hits: result.hits })
                }
              />
              <Badge
                label="İşyeri"
                value={`${result.merchantCount}`}
                onClick={() =>
                  openDrillDown({
                    title: "İşyeri",
                    subtitle: result.stores.join(" · ") || undefined,
                    hits: result.hits,
                  })
                }
              />
              <Badge
                label="Son alım"
                value={lastRelative || "—"}
                onClick={() =>
                  result.last &&
                  openDrillDown({
                    title: "Son alım",
                    hits: [result.last],
                  })
                }
              />
              <Badge
                label="Ort. birim"
                value={formatUnitMoney(
                  result.averageUnitPrice ?? result.averagePrice,
                  result.unitLabel
                )}
                onClick={() =>
                  openDrillDown({
                    title: "Ort. birim",
                    subtitle: "Birim fiyatı olan alımlar",
                    hits: hitsWithUnitPrice(result.hits),
                  })
                }
              />
            </div>

            <div className="mt-4">
              <StatRow
                label="İlk alım"
                value={result.first ? formatDate(result.first.date) : "—"}
                onClick={() =>
                  result.first &&
                  openDrillDown({
                    title: "İlk alım",
                    hits: [result.first],
                  })
                }
              />
              <StatRow
                label="Son alım"
                value={result.last ? formatDate(result.last.date) : "—"}
                onClick={() =>
                  result.last &&
                  openDrillDown({
                    title: "Son alım",
                    hits: [result.last],
                  })
                }
              />
              <StatRow
                label="Son işyeri"
                value={result.last.store || "—"}
                onClick={() =>
                  result.last?.store &&
                  openDrillDown({
                    title: "Son işyeri",
                    subtitle: result.last.store,
                    hits: result.hits.filter((h) => h.store === result.last?.store),
                  })
                }
              />
              <StatRow
                label={
                  result.unitLabel === "₺/L"
                    ? "Son litre fiyatı"
                    : "Son birim fiyat"
                }
                value={formatUnitMoney(
                  result.latestUnitPrice,
                  result.unitLabel,
                  result.last.currency
                )}
                onClick={() =>
                  result.last &&
                  openDrillDown({
                    title:
                      result.unitLabel === "₺/L"
                        ? "Son litre fiyatı"
                        : "Son birim fiyat",
                    hits: [result.last],
                  })
                }
              />
              <StatRow
                label={
                  result.unitLabel === "₺/L" ? "Ortalama litre" : "Ortalama birim"
                }
                value={formatUnitMoney(
                  result.averageUnitPrice,
                  result.unitLabel
                )}
                onClick={() =>
                  openDrillDown({
                    title:
                      result.unitLabel === "₺/L"
                        ? "Ortalama litre"
                        : "Ortalama birim",
                    subtitle: "Birim fiyatı olan alımlar",
                    hits: hitsWithUnitPrice(result.hits),
                  })
                }
              />
              <StatRow
                label={result.unitLabel === "₺/L" ? "En düşük litre" : "En düşük"}
                value={formatUnitMoney(
                  result.lowestUnitPrice,
                  result.unitLabel
                )}
                onClick={() =>
                  result.cheapest &&
                  openDrillDown({
                    title:
                      result.unitLabel === "₺/L" ? "En düşük litre" : "En düşük",
                    hits: [result.cheapest],
                  })
                }
              />
              <StatRow
                label={
                  result.unitLabel === "₺/L" ? "En yüksek litre" : "En yüksek"
                }
                value={formatUnitMoney(
                  result.highestUnitPrice,
                  result.unitLabel
                )}
                onClick={() =>
                  result.mostExpensive &&
                  openDrillDown({
                    title:
                      result.unitLabel === "₺/L"
                        ? "En yüksek litre"
                        : "En yüksek",
                    hits: [result.mostExpensive],
                  })
                }
              />
            </div>
          </section>

          <PriceChangeCard result={result} onDrillDown={openDrillDown} />

          <FuelBreakdownTabs
            result={result}
            expenses={expenses}
            onDrillDown={openDrillDown}
          />

          <TobaccoBreakdownCard result={result} onDrillDown={openDrillDown} />

          {/* Habits */}
          {(result.averageDaysBetween != null ||
            result.mostFrequentMerchant ||
            result.mostExpensive ||
            result.cheapest) && (
            <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Alışkanlıklar
              </p>
              <div className="mt-1">
                {result.averageDaysBetween != null && (
                  <StatRow
                    label="Genelde her"
                    value={`${result.averageDaysBetween} günde bir`}
                    onClick={() =>
                      openDrillDown({
                        title: "Genelde her",
                        subtitle: `${result.averageDaysBetween} günde bir`,
                        hits: result.hits,
                      })
                    }
                  />
                )}
                {result.mostFrequentMerchant && (
                  <StatRow
                    label="En sık"
                    value={result.mostFrequentMerchant}
                    onClick={() =>
                      openDrillDown({
                        title: "En sık",
                        subtitle: result.mostFrequentMerchant ?? undefined,
                        hits: result.hits.filter(
                          (h) => h.store === result.mostFrequentMerchant
                        ),
                      })
                    }
                  />
                )}
                {result.mostExpensive && (
                  <StatRow
                    label="En pahalı"
                    value={`${formatUnitMoney(
                      result.mostExpensive.unitPrice ??
                        result.mostExpensive.price,
                      result.mostExpensive.unitLabel ?? result.unitLabel
                    )}${
                      result.mostExpensive.store
                        ? ` · ${result.mostExpensive.store}`
                        : ""
                    }`}
                    onClick={() =>
                      openDrillDown({
                        title: "En pahalı",
                        hits: [result.mostExpensive!],
                      })
                    }
                  />
                )}
                {result.cheapest && (
                  <StatRow
                    label="En ucuz"
                    value={`${formatUnitMoney(
                      result.cheapest.unitPrice ?? result.cheapest.price,
                      result.cheapest.unitLabel ?? result.unitLabel
                    )}${
                      result.cheapest.store ? ` · ${result.cheapest.store}` : ""
                    }`}
                    onClick={() =>
                      openDrillDown({
                        title: "En ucuz",
                        hits: [result.cheapest!],
                      })
                    }
                  />
                )}
              </div>
            </section>
          )}

          {/* Timeline */}
          <section>
            <h3 className="mb-3 px-1 text-sm font-semibold">Alım geçmişi</h3>
            <ul className="space-y-2">
              {result.hits.map((hit) => (
                <li
                  key={`${hit.expenseId}-${hit.date}-${hit.itemName}-${hit.price}`}
                >
                  <TimelineCard hit={hit} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <MemoryDrillDownSheet drillDown={drillDown} onClose={closeDrillDown} />
    </AppShell>
  );
}

export default function PurchaseMemoryPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        </AppShell>
      }
    >
      <PurchaseMemoryInner />
    </Suspense>
  );
}
