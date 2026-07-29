"use client";

import { useEffect, useState } from "react";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import { formatMoney } from "@/lib/utils";

export function HeroTimeline({
  data,
}: {
  data: { date: string; total: number }[];
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [data]);

  const max = Math.max(...data.map((d) => d.total), 1);
  const BAR_MAX = 96; // px — percentage height of a flex parent is unreliable

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Son 7 gün
      </p>
      <div className="flex flex-1 items-end justify-between gap-2 pb-1">
        {data.map((d, i) => {
          const today = i === data.length - 1;
          const ratio = max > 0 ? d.total / max : 0;
          const h = shown ? Math.max(d.total > 0 ? 8 : 4, Math.round(ratio * BAR_MAX)) : 0;
          let label = "—";
          try {
            label = format(parseISO(`${d.date}T12:00:00`), "EEEEEE", {
              locale: tr,
            });
          } catch {
            /* ignore */
          }
          return (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center gap-1.5"
              title={`${label}: ${formatMoney(d.total)}`}
            >
              <div
                className="flex w-full items-end justify-center"
                style={{ height: BAR_MAX }}
              >
                <div
                  className="w-full max-w-[22px] rounded-md transition-[height] duration-700 ease-out"
                  style={{
                    height: h,
                    backgroundColor: today ? "#0F766E" : "#A7E8DD",
                  }}
                />
              </div>
              <span
                className={
                  today
                    ? "text-[10px] font-semibold text-foreground"
                    : "text-[10px] text-muted-foreground"
                }
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
