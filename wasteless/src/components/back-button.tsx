"use client";

import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "@/hooks/use-smart-back";
import { cn } from "@/lib/utils";

export function BackButton({
  fallback = "/",
  className,
  label,
}: {
  fallback?: string;
  className?: string;
  /** When set, renders text next to the icon (e.g. "Geri"). */
  label?: string;
}) {
  const goBack = useSmartBack(fallback);

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        label
          ? "mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          : "rounded-xl p-2 hover:bg-white/70",
        className
      )}
      aria-label={label || "Geri"}
    >
      <ArrowLeft className={cn("shrink-0", label ? "h-4 w-4" : "h-5 w-5")} />
      {label ? <span>{label}</span> : null}
    </button>
  );
}
