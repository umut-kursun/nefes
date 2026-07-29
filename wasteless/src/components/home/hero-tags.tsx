"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/utils";

export function HeroTags({
  items,
}: {
  items: { id: string; label: string; color: string; total: number }[];
}) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Etiketler
      </p>
      <div className="flex flex-1 flex-wrap content-center gap-2">
        {items.map((t) => (
          <Link
            key={t.id}
            href={`/tag?id=${encodeURIComponent(t.id)}`}
            className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-xs shadow-sm transition duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="font-medium text-foreground/80">{t.label}</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(t.total)}
            </span>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Etiketli harcama yok.</p>
        )}
      </div>
    </div>
  );
}
