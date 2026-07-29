"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";

export function TrendBadge({
  value,
  comparedTo,
  className,
}: {
  value: number | null;
  /** Required context when a percentage is shown, e.g. "Düne göre". */
  comparedTo?: string | null;
  className?: string;
}) {
  if (value == null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        önceki yok
      </span>
    );
  }

  const up = value > 0;
  const flat = value === 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-medium transition-colors",
        flat
          ? "text-muted-foreground"
          : up
            ? "text-rose-700"
            : "text-teal-700",
        className
      )}
    >
      <span className="inline-flex items-center gap-0.5">
        {!flat && <Icon className="h-3.5 w-3.5 shrink-0" />}
        {flat ? "aynı" : `${formatNumber(Math.abs(value), 0)}%`}
      </span>
      {comparedTo ? (
        <span className="font-normal text-muted-foreground">
          · {comparedTo}
        </span>
      ) : null}
    </span>
  );
}
