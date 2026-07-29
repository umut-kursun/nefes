"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { InsightCard } from "@/components/insight-card";
import { useWasteLessStore } from "@/hooks/use-store";
import { generateInsights } from "@/lib/insights";

export default function SmartInsightsPage() {
  const { expenses, categories, tags, ready } = useWasteLessStore();

  const insights = useMemo(
    () => generateInsights({ expenses, categories, tags }),
    [expenses, categories, tags]
  );

  return (
    <AppShell>
      <header className="mb-5 animate-fade-up">
        <BackButton label="Geri" />
        <h1 className="font-display text-2xl tracking-tight">Akıllı içgörüler</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Harcama alışkanlıklarından çıkan yerel desenler
        </p>
      </header>

      {!ready ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : insights.length === 0 ? (
        <div className="rounded-3xl border border-black/[0.05] bg-white px-6 py-14 text-center shadow-sm animate-fade-up">
          <p className="text-4xl" aria-hidden>
            🧠
          </p>
          <p className="mt-4 font-semibold text-[color:var(--ink)]">
            Henüz içgörü yok
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Birkaç satın alma ekle; WasteLess desenleri keşfetmeye başlasın.
          </p>
          <Link
            href="/add"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-95"
          >
            Harcama ekle
          </Link>
        </div>
      ) : (
        <ul className="space-y-3 animate-fade-up delay-1">
          {insights.map((insight, i) => (
            <li
              key={insight.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 6) * 0.04}s` }}
            >
              <InsightCard insight={insight} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
