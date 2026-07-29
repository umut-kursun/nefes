"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/icons";
import type { Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

const AUTO_MS = 5000;
const PAUSE_MS = 12000;

/**
 * One assistant observation at a time.
 * Auto-rotates every 5s; pauses ~12s after manual swipe/tap on dots.
 */
export function AssistantCard({
  insights,
  className,
}: {
  insights: Insight[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const pauseUntil = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const insightKey = useMemo(
    () => insights.map((i) => i.id).join("|"),
    [insights]
  );
  const count = insights.length;

  const goTo = useCallback(
    (next: number, manual = false) => {
      if (count === 0) return;
      const i = ((next % count) + count) % count;
      setFade(false);
      window.setTimeout(() => {
        setIndex(i);
        setFade(true);
      }, 120);
      if (manual) pauseUntil.current = Date.now() + PAUSE_MS;
    },
    [count]
  );

  useEffect(() => {
    setIndex(0);
    setFade(true);
  }, [insightKey]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      setFade(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % count);
        setFade(true);
      }, 120);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [count, insightKey]);

  if (count === 0) return null;

  const insight = insights[Math.min(index, count - 1)]!;

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Asistan
        </p>
        <Link
          href="/insights"
          className="text-xs font-semibold text-primary transition hover:underline"
        >
          Tümü
        </Link>
      </div>

      <div
        className="relative overflow-hidden rounded-3xl border border-black/[0.04] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null || count <= 1) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const dx = end - start;
          if (Math.abs(dx) < 40) return;
          goTo(index + (dx < 0 ? 1 : -1), true);
        }}
      >
        <Link
          href={insight.href}
          className={cn(
            "block transition-opacity duration-300 active:scale-[0.99]",
            fade ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
              <AppIcon name={insight.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground/70">
                {insight.title}
              </p>
              <p className="mt-1 text-[15px] font-medium leading-snug text-[color:var(--ink)]">
                {insight.description}
              </p>
              <p className="mt-2 text-xs font-medium text-primary">Detaya git →</p>
            </div>
          </div>
        </Link>

        {count > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {insights.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Gözlem ${i + 1}`}
                aria-current={i === index}
                onClick={() => goTo(i, true)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-4 bg-teal-700" : "w-1.5 bg-black/15"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
