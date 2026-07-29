"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";

export type HeroBarRow = {
  id: string;
  label: string;
  color: string;
  total: number;
  count?: number;
};

export function HeroCategories({
  rows,
  max,
}: {
  rows: HeroBarRow[];
  max: number;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        En çok kategori
      </p>
      <div className="flex flex-1 flex-col justify-center gap-3">
        {rows.map((row) => {
          const pct = max > 0 ? Math.max(6, Math.round((row.total / max) * 100)) : 0;
          return (
            <Link
              key={row.id}
              href={`/category?id=${encodeURIComponent(row.id)}`}
              className="block rounded-lg transition active:scale-[0.99]"
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-primary">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  {row.label}
                  {row.count != null && (
                    <span className="font-normal text-muted-foreground">
                      · {row.count}
                    </span>
                  )}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatMoney(row.total)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.05]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: shown ? `${pct}%` : "0%",
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Bu dönemde kayıt yok.</p>
        )}
      </div>
    </div>
  );
}
