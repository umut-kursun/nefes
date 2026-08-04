"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { GroupedExpenseList } from "@/components/grouped-expense-list";
import { TrendBadge } from "@/components/trend-badge";
import { useWasteLessStore } from "@/hooks/use-store";
import { getTagInsights, formatSamePeriodMonthCaption } from "@/lib/analytics";
import { getCategoryMeta } from "@/lib/categories";
import { formatMoney } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function TagDetailInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const { tags, expenses, categories, ready } = useWasteLessStore();

  const tag = tags.find((t) => t.id === id) ?? null;
  const tagged = useMemo(
    () => expenses.filter((e) => (e.tagIds ?? []).includes(id || "")),
    [expenses, id]
  );
  const insights = useMemo(() => getTagInsights(tagged), [tagged]);

  if (!ready) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </AppShell>
    );
  }

  if (!tag) {
    return (
      <AppShell>
        <p className="font-medium">Etiket bulunamadı</p>
        <Link href="/tags" className="mt-3 inline-block text-sm text-primary">
          Etiketlere dön
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-5 flex items-start gap-3 animate-fade-up">
        <BackButton fallback="/tags" className="mt-0.5" />
        <div>
          <span
            className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.label}
          </span>
          <h1 className="font-display text-2xl tracking-tight">Etiket detayı</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bu etiketteki satın alma hafızası
          </p>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-2 animate-fade-up delay-1">
        <Stat label="Toplam" value={formatMoney(insights.totalSpend)} />
        <Stat label="Kayıt" value={String(insights.count)} />
        <Stat label="Ortalama" value={formatMoney(insights.averageSpend)} />
        <div className="rounded-2xl border border-white/70 bg-white/75 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Aylık trend
          </p>
          <div className="mt-1">
            <TrendBadge
              value={insights.monthlyTrend}
              comparedTo={formatSamePeriodMonthCaption(new Date())}
            />
          </div>
        </div>
      </section>

      {insights.categoriesBreakdown.length > 0 && (
        <section className="mb-4 rounded-2xl border border-white/70 bg-white/75 p-4 animate-fade-up delay-2">
          <h2 className="mb-3 text-sm font-semibold">Kategori dağılımı</h2>
          <ul className="space-y-2">
            {insights.categoriesBreakdown.map((row) => {
              const meta = getCategoryMeta(row.category, categories);
              return (
                <li
                  key={row.category}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{meta.label}</span>
                  <span className="tabular-nums font-semibold">
                    {formatMoney(row.total)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {row.count}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {insights.topMerchants.length > 0 && (
        <section className="mb-4 rounded-2xl border border-white/70 bg-white/75 p-4 animate-fade-up delay-2">
          <h2 className="mb-3 text-sm font-semibold">En çok alışveriş</h2>
          <ul className="space-y-2">
            {insights.topMerchants.map((m) => (
              <li
                key={m.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate">{m.name}</span>
                <span className="tabular-nums font-semibold">
                  {formatMoney(m.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {insights.monthlySeries.length > 0 && (
        <section className="mb-4 rounded-2xl border border-white/70 bg-white/75 p-4 animate-fade-up delay-3">
          <h2 className="mb-3 text-sm font-semibold">Aylık seyir</h2>
          <ul className="space-y-2">
            {insights.monthlySeries.map((row) => (
              <li
                key={row.month}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-muted-foreground">{row.month}</span>
                <span className="tabular-nums font-semibold">
                  {formatMoney(row.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="animate-fade-up delay-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground/80">
          Son harcamalar
        </h2>
        <GroupedExpenseList
          expenses={tagged}
          emptyTitle="Bu etikette kayıt yok"
          emptyDescription="Harcama eklerken bu etiketi seç."
        />
      </section>
    </AppShell>
  );
}

export default function TagDetailPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        </AppShell>
      }
    >
      <TagDetailInner />
    </Suspense>
  );
}
