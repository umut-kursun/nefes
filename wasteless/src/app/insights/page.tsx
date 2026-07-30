"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { EmptyState } from "@/components/empty-state";
import { InsightCard } from "@/components/insight-card";
import { PremiumTeaser } from "@/components/premium-teaser";
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
        <EmptyState
          emoji="🧠"
          title="Henüz içgörü yok"
          description="Birkaç satın alma ekle; WasteLess desenleri keşfetmeye başlasın."
          actionLabel="Harcama ekle"
          actionHref="/add"
        />
      ) : (
        <>
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
          <PremiumTeaser
            className="mt-6"
            storageKey="wl_premium_teaser_insights"
          />
        </>
      )}
    </AppShell>
  );
}
