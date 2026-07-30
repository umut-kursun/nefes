"use client";

import { AppShell } from "@/components/app-shell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { useWasteLessStore } from "@/hooks/use-store";

export default function OnboardingPage() {
  const { settings, updateSettings, ready } = useWasteLessStore();

  if (!ready) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-6 animate-fade-up text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
          WasteLess
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          Hızlı tur
        </h1>
      </header>
      <OnboardingFlow settings={settings} onComplete={updateSettings} />
    </AppShell>
  );
}
