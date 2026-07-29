"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export function HeroCarousel({
  pages,
}: {
  pages: { id: string; node: ReactNode }[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pageCount = pages.length;

  const pageKey = pages.map((p) => p.id).join("|");

  // Reset to first page when the page set changes (e.g. period switch).
  useEffect(() => {
    setIndex(0);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [pageKey]);

  const syncIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0) return;
    const i = Math.min(
      pageCount - 1,
      Math.max(0, Math.round(el.scrollLeft / el.clientWidth))
    );
    setIndex((prev) => (prev === i ? prev : i));
  }, [pageCount]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScrollEnd = () => syncIndex();
    el.addEventListener("scrollend", onScrollEnd);
    // Fallback while scrollend unsupported
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncIndex);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      // Keep current page aligned after width changes
      el.scrollTo({ left: index * el.clientWidth, behavior: "auto" });
      syncIndex();
    });
    ro.observe(el);
    return () => {
      el.removeEventListener("scrollend", onScrollEnd);
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [syncIndex, index]);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.min(pageCount - 1, Math.max(0, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  };

  if (pageCount === 0) return null;

  return (
    <div>
      <div
        ref={scrollerRef}
        className="flex h-[164px] snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {pages.map((p) => (
          <div
            key={p.id}
            className="h-full w-full min-w-full shrink-0 snap-center snap-always"
          >
            {p.node}
          </div>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Sayfa ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-4 bg-teal-700" : "w-1.5 bg-black/15"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
