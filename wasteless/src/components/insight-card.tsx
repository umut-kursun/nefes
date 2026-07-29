"use client";

import Link from "next/link";
import { AppIcon } from "@/components/icons";
import type { Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

export function InsightCard({
  insight,
  className,
}: {
  insight: Insight;
  className?: string;
}) {
  return (
    <Link
      href={insight.href}
      className={cn(
        "block rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800"
          aria-hidden
        >
          <AppIcon name={insight.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-tight text-[color:var(--ink)]">
            {insight.title}
          </h3>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {insight.description}
          </p>
          <p className="mt-2 text-xs font-medium text-primary">Detaya git →</p>
        </div>
      </div>
    </Link>
  );
}
