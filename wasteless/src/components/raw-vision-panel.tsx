"use client";

import { cn } from "@/lib/utils";

type Props = {
  rawVision: string;
  className?: string;
  maxHeightClassName?: string;
};

/** Read-only raw vision preview — use Copy All Debug to copy. */
export function RawVisionPanel({
  rawVision,
  className,
  maxHeightClassName = "max-h-48",
}: Props) {
  if (!rawVision) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-200/80 bg-stone-950/95 p-3",
        className
      )}
    >
      <p className="text-[11px] font-medium text-violet-200/90">Raw Vision</p>
      <pre
        className={cn(
          "mt-2 overflow-auto whitespace-pre-wrap break-words select-text text-[11px] leading-relaxed text-amber-100",
          maxHeightClassName
        )}
      >
        {rawVision}
      </pre>
    </div>
  );
}
