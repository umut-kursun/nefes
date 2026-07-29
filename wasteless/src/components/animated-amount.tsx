"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils";

/** Count-up money display — animates smoothly when the value changes. */
export function AnimatedAmount({
  value,
  currency = "TRY",
  className,
  duration = 450,
}: {
  value: number;
  currency?: string;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const [settled, setSettled] = useState(true);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      setSettled(true);
      return;
    }

    setSettled(false);
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
        setSettled(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const text = settled
    ? formatMoney(value, currency)
    : new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(display);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </span>
  );
}
