"use client";

import { Sparkles } from "lucide-react";

export function InsightCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-teal-800">
          Akıllı içgörü
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-teal-950">{text}</p>
    </div>
  );
}
