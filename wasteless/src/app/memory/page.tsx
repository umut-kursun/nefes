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
import { Input } from "@/components/ui/input";
import { useWasteLessStore } from "@/hooks/use-store";
import {
  getTobaccoAnalysis,
  isTobaccoQuery,
  searchPurchaseMemory,
  type PurchaseMemoryHit,
  type PurchaseMemoryResult,
  type TobaccoAnalysis,
} from "@/lib/analytics";
import { formatDate, formatRelativeDate } from "@/lib/datetime";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

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
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-black/[0.04] bg-white/90 px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-[color:var(--ink)]">
        {value}
      </p>
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/[0.04] py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-right">
        {value}
      </span>
    </div>
  );
}

function PriceChangeCard({ result }: { result: PurchaseMemoryResult }) {
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
    <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
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
    </section>
  );
}

function TobaccoAnalysisCard({ analysis }: { analysis: TobaccoAnalysis }) {
  return (
    <section className="rounded-3xl border border-amber-200/70 bg-amber-50/70 p-4 shadow-sm animate-fade-up">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-lg">
          🚬
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800/80">
            Tütün Analizi
          </p>
          <p className="text-sm font-semibold text-amber-950">
            Sigara alışkanlığın
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-amber-200/70 bg-white/80 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800/70">
            Toplam paket
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-amber-950">
            {formatNumber(analysis.totalPacks)} paket
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/70 bg-white/80 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800/70">
            Ort. paket fiyatı
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-amber-950">
            {analysis.averagePricePerPack != null
              ? `${formatMoney(analysis.averagePricePerPack)}/paket`
              : "—"}
          </p>
        </div>
      </div>

      {analysis.merchants.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800/70">
            İşyeri dağılımı
          </p>
          <ul>
            {analysis.merchants.map((m) => (
              <li
                key={m.name}
                className="flex items-baseline justify-between gap-3 border-b border-amber-200/50 py-2 last:border-0"
              >
                <span className="min-w-0 truncate text-sm text-amber-950">
                  {m.name}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-950">
                  {formatNumber(m.packs)} paket
                  <span className="text-amber-800/50"> · </span>
                  {formatMoney(m.spend)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TimelineCard({ hit }: { hit: PurchaseMemoryHit }) {
  const relative = formatRelativeDate(hit.date);
  const absolute = formatDate(hit.date);
  const qty =
    hit.quantity != null
      ? `${formatNumber(hit.quantity)}${hit.unit ? ` ${hit.unit}` : ""}`
      : null;

  return (
    <Link
      href={`/expense?id=${encodeURIComponent(hit.expenseId)}`}
      className="block rounded-2xl border border-black/[0.05] bg-white p-3.5 shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {hit.store || hit.itemName}
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
        {hit.unitPrice != null && (
          <span className="tabular-nums">
            Birim{" "}
            <span className="font-medium text-foreground/80">
              {formatUnitMoney(hit.unitPrice, hit.unitLabel, hit.currency)}
            </span>
          </span>
        )}
        {qty && (
          <span className="tabular-nums">
            Miktar <span className="font-medium text-foreground/80">{qty}</span>
          </span>
        )}
      </div>
    </Link>
  );
}

function PurchaseMemoryInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlQuery = params.get("q") ?? "";
  const { expenses, ready } = useWasteLessStore();
  const [query, setQuery] = useState(urlQuery);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPushedUrl = useRef(urlQuery.trim());

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
    () => searchPurchaseMemory(expenses, deferredQuery),
    [expenses, deferredQuery]
  );

  const tobacco = useMemo(() => {
    if (!isTobaccoQuery(deferredQuery)) return null;
    const analysis = getTobaccoAnalysis(expenses);
    return analysis.purchaseCount > 0 ? analysis : null;
  }, [expenses, deferredQuery]);

  const lastRelative = result?.last
    ? formatRelativeDate(result.last.date)
    : null;

  return (
    <AppShell>
      <header className="mb-5 flex items-start justify-between gap-3 animate-fade-up">
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-tight">Purchase Memory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ne aldığını, nereden ve kaça hatırla
          </p>
        </div>
        <Link
          href="/calendar"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-black/[0.05] bg-white px-3 text-sm font-semibold text-foreground/80 shadow-sm transition active:scale-95"
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
          // Never auto-focus: the mobile soft keyboard must not pop open when the
          // Hafıza tab is opened or when arriving from a dashboard chip. The user
          // taps the field when they want to type.
          enterKeyHint="search"
          inputMode="search"
        />
      </div>

      {ready && tobacco && (
        <div className="mb-4">
          <TobaccoAnalysisCard analysis={tobacco} />
        </div>
      )}

      {!ready && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}

      {ready && deferredQuery.trim().length < 2 && (
        <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-10 text-center animate-fade-up delay-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl">
            🧠
          </div>
          <p className="font-medium">Ürün veya mağaza ara</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Son fiyat, mağaza ve alım sıklığını anında gör.
          </p>
        </div>
      )}

      {result && result.hits.length === 0 && (
        <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-10 text-center">
          <p className="font-medium">Sonuç yok</p>
          <p className="mt-1 text-sm text-muted-foreground">
            “{result.query}” için kayıtlı alım bulunamadı.
          </p>
        </div>
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
              />
              <Badge
                label="İşyeri"
                value={`${result.merchantCount}`}
              />
              <Badge
                label="Son alım"
                value={lastRelative || "—"}
              />
              <Badge
                label="Ort. birim"
                value={formatUnitMoney(
                  result.averageUnitPrice ?? result.averagePrice,
                  result.unitLabel
                )}
              />
            </div>

            <div className="mt-4">
              <StatRow
                label="İlk alım"
                value={result.first ? formatDate(result.first.date) : "—"}
              />
              <StatRow
                label="Son alım"
                value={result.last ? formatDate(result.last.date) : "—"}
              />
              <StatRow
                label="Son işyeri"
                value={result.last.store || "—"}
              />
              <StatRow
                label="Son birim fiyat"
                value={formatUnitMoney(
                  result.latestUnitPrice ?? result.last.price,
                  result.unitLabel,
                  result.last.currency
                )}
              />
              <StatRow
                label="Ortalama birim"
                value={formatUnitMoney(
                  result.averageUnitPrice ?? result.averagePrice,
                  result.unitLabel
                )}
              />
              <StatRow
                label="En düşük"
                value={formatUnitMoney(
                  result.lowestUnitPrice ?? result.lowestPrice,
                  result.unitLabel
                )}
              />
              <StatRow
                label="En yüksek"
                value={formatUnitMoney(
                  result.highestUnitPrice ?? result.highestPrice,
                  result.unitLabel
                )}
              />
            </div>
          </section>

          <PriceChangeCard result={result} />

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
                  />
                )}
                {result.mostFrequentMerchant && (
                  <StatRow
                    label="En sık"
                    value={result.mostFrequentMerchant}
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
