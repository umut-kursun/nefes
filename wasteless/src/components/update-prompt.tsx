"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaUpdate } from "@/hooks/use-pwa-update";

const DISMISS_KEY = "wasteless_update_dismissed_at";

function isDismissedRecently(): boolean {
  if (typeof localStorage === "undefined") return false;
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return false;
  return Date.now() - Number(dismissedAt) < 6 * 60 * 60 * 1000;
}

/** Shown when a new service worker is waiting — complements Settings → Güncelle. */
export function UpdatePrompt() {
  const { updateReady, applying, applyUpdate } = usePwaUpdate();
  const [hidden, setHidden] = useState(isDismissedRecently);

  useEffect(() => {
    if (updateReady) setHidden(isDismissedRecently());
  }, [updateReady]);

  if (!updateReady || hidden) return null;

  return (
    <div className="fixed inset-x-0 top-[calc(0.5rem+env(safe-area-inset-top))] z-50 px-4">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-teal-200/80 bg-teal-50/95 p-3 shadow-md backdrop-blur-md animate-fade-up">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
          <RefreshCw className={`h-4 w-4 ${applying ? "animate-spin" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-teal-950">Güncelleme hazır</p>
          <p className="text-xs text-teal-900/70">Yenilemek için dokun</p>
        </div>
        <Button
          size="sm"
          variant="default"
          className="bg-teal-700 hover:bg-teal-800"
          disabled={applying}
          onClick={() => void applyUpdate()}
        >
          Yenile
        </Button>
        <button
          type="button"
          aria-label="Kapat"
          className="rounded-lg p-1.5 text-teal-800/70 transition hover:bg-teal-100"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
