"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Brain, LineChart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@/lib/types";

const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "WasteLess'e hoş geldin",
    description:
      "Fişlerini tarat, harcamalarını anla. Tüm veriler cihazında kalır — gizlilik önceliğimiz.",
    accent: "from-teal-500/20 to-blue-500/10",
  },
  {
    id: "scan",
    icon: Camera,
    title: "Fiş tara, otomatik kaydet",
    description:
      "Market fişi veya banka ekran görüntüsü yükle; ürünler, tutarlar ve kategoriler otomatik çıkar.",
    accent: "from-blue-500/20 to-indigo-500/10",
  },
  {
    id: "memory",
    icon: Brain,
    title: "Satın alma hafızası",
    description:
      "Geçmiş alışverişlerini ara: süt ne zaman aldın, fiyat nasıl değişti? Tek dokunuşla bul.",
    accent: "from-violet-500/20 to-purple-500/10",
  },
  {
    id: "insights",
    icon: LineChart,
    title: "Akıllı içgörüler",
    description:
      "Harcama desenlerinden yerel içgörüler: yakıt trendi, tekrarlayan alışverişler, tasarruf fırsatları.",
    accent: "from-emerald-500/20 to-teal-500/10",
  },
] as const;

type BusyAction = "skip" | "next" | "back" | "scan" | "start" | null;

export function OnboardingFlow({
  settings,
  onComplete,
}: {
  settings: AppSettings;
  onComplete: (next: AppSettings) => Promise<void>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.displayName ?? "");
  const [busy, setBusy] = useState<BusyAction>(null);
  const finishingRef = useRef(false);

  const current = STEPS[step]!;
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const finish = useCallback(
    async (redirectTo: string, action: BusyAction) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setBusy(action);
      try {
        await onComplete({
          ...settings,
          displayName: name.trim() || settings.displayName || null,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        });
        router.replace(redirectTo);
      } catch {
        finishingRef.current = false;
        setBusy(null);
      }
    },
    [name, onComplete, router, settings]
  );

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === step ? "w-6 bg-teal-600" : "w-1.5 bg-black/15",
              i < step && "bg-teal-400"
            )}
          />
        ))}
      </div>

      <div
        className={cn(
          "wl-surface-hero relative flex flex-1 flex-col overflow-hidden p-6 animate-fade-up",
          `bg-gradient-to-br ${current.accent}`
        )}
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-card text-teal-700 shadow-sm">
            <Icon className="h-8 w-8" strokeWidth={1.8} />
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[color:var(--ink)]">
            {current.title}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>

          {isLast && (
            <div className="mt-8 w-full max-w-xs text-left">
              <Label htmlFor="onboarding-name" className="text-sm">
                Adın (isteğe bağlı)
              </Label>
              <Input
                id="onboarding-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Umut"
                maxLength={40}
                className="mt-2"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Ana sayfada seni selamlamak için kullanılır.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          {step > 0 && !isLast && (
            <Button
              type="button"
              variant="secondary"
              className="h-12 flex-1 rounded-2xl"
              onClick={() => setStep((s) => s - 1)}
              disabled={busy === "back"}
            >
              Geri
            </Button>
          )}
          {isLast ? (
            <div className="flex w-full flex-col gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 w-full rounded-2xl"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={busy != null}
                >
                  Geri
                </Button>
              )}
              <Button
                type="button"
                className="h-12 w-full rounded-2xl"
                onClick={() => void finish("/add?welcome=1", "scan")}
                disabled={busy === "scan"}
              >
                {busy === "scan" ? "Kaydediliyor…" : "İlk fişi tara"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-12 w-full rounded-2xl"
                onClick={() => void finish("/", "start")}
                disabled={busy === "start"}
              >
                {busy === "start" ? "Kaydediliyor…" : "Başla"}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="h-12 flex-1 rounded-2xl"
              onClick={() => setStep((s) => s + 1)}
              disabled={busy === "next"}
            >
              Devam
            </Button>
          )}
        </div>
      </div>

      {step < STEPS.length - 1 && (
        <button
          type="button"
          className="mt-4 min-h-11 text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          onClick={() => void finish("/", "skip")}
          disabled={busy === "skip"}
        >
          {busy === "skip" ? "Kaydediliyor…" : "Atla"}
        </button>
      )}
    </div>
  );
}
