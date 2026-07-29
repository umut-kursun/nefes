"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { memorySearchHref } from "@/lib/insights";

export function HeroMerchants({
  rows,
}: {
  rows: { name: string; total: number }[];
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        En çok işyeri
      </p>
      <div className="flex flex-1 flex-col justify-center gap-2.5">
        {rows.map((row) => {
          const pct = Math.max(6, Math.round((row.total / max) * 100));
          return (
            <Link
              key={row.name}
              href={memorySearchHref(row.name)}
              className="block rounded-lg transition active:scale-[0.99]"
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate pr-2 font-medium text-primary">
                  {row.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatMoney(row.total)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.05]">
                <div
                  className="h-full rounded-full bg-teal-700 transition-[width] duration-700 ease-out"
                  style={{ width: shown ? `${pct}%` : "0%" }}
                />
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">İşyeri verisi yok.</p>
        )}
      </div>
    </div>
  );
}
