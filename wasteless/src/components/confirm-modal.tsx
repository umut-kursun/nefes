"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const titleId = useId();

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      setOptions(null);
      resolver.current?.(value);
      resolver.current = null;
    }, 180);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted &&
        open &&
        options &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
            <button
              type="button"
              aria-label="Kapat"
              className={cn(
                "absolute inset-0 bg-black/40 transition-opacity duration-200",
                visible ? "opacity-100" : "opacity-0"
              )}
              onClick={() => close(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={cn(
                "relative z-10 w-full max-w-sm rounded-2xl border border-border/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition duration-200",
                visible
                  ? "translate-y-0 opacity-100 scale-100"
                  : "translate-y-3 opacity-0 scale-[0.98]"
              )}
            >
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {options.title}
              </h2>
              {options.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {options.description}
                </p>
              )}
              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => close(false)}
                >
                  {options.cancelLabel ?? "İptal"}
                </Button>
                <Button
                  type="button"
                  variant={options.destructive === false ? "default" : "destructive"}
                  className="flex-1"
                  onClick={() => close(true)}
                >
                  {options.confirmLabel ?? "Sil"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}
