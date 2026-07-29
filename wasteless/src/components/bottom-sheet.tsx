"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal bottom sheet — matches confirm-modal portal patterns.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  headerStart,
  headerEnd,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional controls before the title (e.g. prev day). */
  headerStart?: ReactNode;
  /** Optional controls after the title, before close (e.g. next day). */
  headerEnd?: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <button
        type="button"
        aria-label="Kapat"
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[78dvh] w-full max-w-lg flex-col rounded-t-3xl border border-black/[0.06] bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.12)] transition duration-200",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        )}
      >
        <div className="relative flex items-center gap-1 border-b border-black/[0.04] px-3 pb-3 pt-4">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-black/10" />
          {headerStart}
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate pt-1 text-center font-display text-base tracking-tight sm:text-lg"
          >
            {title}
          </h2>
          {headerEnd}
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/60 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>,
    document.body
  );
}
