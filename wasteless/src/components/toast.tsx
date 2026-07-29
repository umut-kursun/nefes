"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "danger";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastApi = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toast = useCallback((message: string, tone: ToastTone = "default") => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] flex flex-col items-center gap-2 px-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "animate-fade-up pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-lg",
                  item.tone === "success" && "bg-teal-800 text-white",
                  item.tone === "danger" && "bg-rose-700 text-white",
                  item.tone === "default" && "bg-stone-900 text-white"
                )}
              >
                {item.message}
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
