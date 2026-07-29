"use client";

import Link from "next/link";
import { AppIcon } from "@/components/icons";
import type { Insight } from "@/lib/insights";

export function HeroInsight({ insight }: { insight: Insight }) {
  return (
    <Link
      href={insight.href}
      className="flex h-full flex-col rounded-lg transition active:scale-[0.99]"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Akıllı içgörü
      </p>
      <div className="flex flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white">
          <AppIcon name={insight.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground/80">
            {insight.title}
          </p>
          <p className="mt-0.5 text-[15px] font-medium leading-snug text-foreground">
            {insight.description}
          </p>
          <p className="mt-1.5 text-xs font-medium text-primary">Neden? →</p>
        </div>
      </div>
    </Link>
  );
}
