"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/icons";
import type { Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 3333;
const PAUSE_AFTER_TOUCH_MS = 30000;

/**
 * One assistant observation at a time.
 * Auto-rotates every ~3.3s; pauses while touched/hovered and for 30s after interaction.
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
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const touchActive = useRef(false);
  const hoverActive = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const insightKey = useMemo(
    () => insights.map((i) => i.id).join("|"),
    [insights]
  );
  const count = insights.length;

  const scheduleResume = useCallback((delayMs: number) => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      if (!touchActive.current && !hoverActive.current) {
        setAutoplayEnabled(true);
      }
      resumeTimer.current = null;
    }, delayMs);
  }, []);

  const pauseAutoplay = useCallback(
    (delayMs = PAUSE_AFTER_TOUCH_MS) => {
      setAutoplayEnabled(false);
      scheduleResume(delayMs);
    },
    [scheduleResume]
  );

  const goTo = useCallback(
    (next: number, manual = false) => {
      if (count === 0) return;
      const i = ((next % count) + count) % count;
      setFade(false);
      window.setTimeout(() => {
        setIndex(i);
        setFade(true);
      }, 120);
      if (manual) pauseAutoplay(PAUSE_AFTER_TOUCH_MS);
    },
    [count, pauseAutoplay]
  );

  useEffect(() => {
    setIndex(0);
    setFade(true);
  }, [insightKey]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (count <= 1 || !autoplayEnabled) return;
    const id = window.setInterval(() => {
      setFade(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % count);
        setFade(true);
      }, 120);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, insightKey, autoplayEnabled]);

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
          className="text-xs font-semibold text-primary transition-all duration-200 hover:underline"
        >
          Tümü
        </Link>
      </div>

      <div
        className="relative touch-manipulation overflow-hidden rounded-3xl border border-teal-100/80 bg-gradient-to-br from-teal-50/40 via-white to-blue-50/30 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
        onPointerEnter={() => {
          hoverActive.current = true;
          setAutoplayEnabled(false);
        }}
        onPointerLeave={() => {
          hoverActive.current = false;
          if (!touchActive.current) {
            scheduleResume(400);
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "touch" || e.pointerType === "pen") {
            touchActive.current = true;
          }
          pauseAutoplay(PAUSE_AFTER_TOUCH_MS);
        }}
        onPointerUp={() => {
          touchActive.current = false;
          if (!hoverActive.current) {
            scheduleResume(PAUSE_AFTER_TOUCH_MS);
          }
        }}
        onPointerCancel={() => {
          touchActive.current = false;
          if (!hoverActive.current) {
            scheduleResume(PAUSE_AFTER_TOUCH_MS);
          }
        }}
        onTouchStart={(e) => {
          touchActive.current = true;
          pauseAutoplay(PAUSE_AFTER_TOUCH_MS);
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          touchActive.current = false;
          pauseAutoplay(PAUSE_AFTER_TOUCH_MS);

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
            "block min-h-[7.75rem] transition-all duration-200 active:scale-[0.99]",
            fade ? "opacity-100" : "opacity-0"
          )}
          onClick={() => pauseAutoplay(PAUSE_AFTER_TOUCH_MS)}
        >
          <div className="flex min-h-[7.75rem] items-start gap-4">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
              <AppIcon name={insight.icon} className="h-5 w-5" />
            </span>
            <div className="min-h-[5.5rem] min-w-0 flex-1 py-0.5">
              <p className="text-[13px] font-semibold text-foreground/70">
                {insight.title}
              </p>
              <p className="mt-1 min-h-[2.75rem] text-[15px] font-medium leading-snug text-[color:var(--ink)]">
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
                onPointerDown={(e) => {
                  e.stopPropagation();
                  pauseAutoplay(PAUSE_AFTER_TOUCH_MS);
                }}
                onClick={() => goTo(i, true)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
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
