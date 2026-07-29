"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "wasteless_install_dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 px-4">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-border/80 bg-white/95 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md animate-fade-up">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">WasteLess&apos;i yükle</p>
          <p className="text-xs text-muted-foreground">
            Ana ekrana ekle · uygulama gibi kullan
          </p>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setVisible(false);
            setDeferred(null);
          }}
        >
          Yükle
        </Button>
        <button
          type="button"
          aria-label="Kapat"
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setVisible(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
