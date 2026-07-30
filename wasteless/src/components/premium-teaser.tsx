"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "wl_premium_teaser_dismissed";

const FREE_FEATURES = [
  "Fiş tarama & OCR",
  "Yerel harcama geçmişi",
  "Temel kategoriler",
  "Satın alma hafızası",
  "Yerel içgörüler",
];

const PRO_FEATURES = [
  "Gelişmiş AI içgörüleri",
  "Sınırsız geçmiş",
  "Fiyat uyarıları",
  "Dışa aktarma & yedekleme",
  "Bütçe hedefleri",
];

export function PremiumTeaser({
  className,
  storageKey = DISMISS_KEY,
}: {
  className?: string;
  /** Override localStorage key for per-page dismiss. */
  storageKey?: string;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  };

  if (dismissed) return null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50/90 via-white to-blue-50/60 p-5 shadow-sm animate-fade-up",
        className
      )}
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={dismiss}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-muted-foreground transition hover:bg-white active:scale-95"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-700">
            WasteLess Pro
          </p>
          <p className="mt-1 font-display text-lg font-semibold tracking-tight text-[color:var(--ink)]">
            Ücretsiz vs Pro
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Yakında — ödeme entegrasyonu yok, şimdilik önizleme.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/[0.06] bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ücretsiz
          </p>
          <ul className="mt-2 space-y-1.5">
            {FREE_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-1.5 text-xs text-foreground/80"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-600" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            Pro
          </p>
          <ul className="mt-2 space-y-1.5">
            {PRO_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-1.5 text-xs text-teal-950/90"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-600" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-white/70 px-3 py-2 text-xs text-muted-foreground">
        Pro özellikler tasarım aşamasında. Geri bildiriminle şekillenecek.
      </p>
    </section>
  );
}
