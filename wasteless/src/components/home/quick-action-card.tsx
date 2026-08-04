"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { AppIcon } from "@/components/icons";
import { triggerHaptic } from "@/lib/haptics";
import { cn, formatMoney } from "@/lib/utils";

const LONG_PRESS_MS = 520;

export function QuickActionCard({
  title,
  amount,
  icon,
  color,
  onClick,
  onLongPress,
}: {
  title: string;
  amount: number;
  icon: string;
  color: string;
  onClick: () => void;
  onLongPress?: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    longPressTriggered.current = false;
    clearTimer();
    if (!onLongPress) return;
    timerRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      triggerHaptic("medium");
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const handleClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    triggerHaptic("light");
    setConfirmed(true);
    window.setTimeout(() => setConfirmed(false), 1200);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "relative min-w-[104px] shrink-0 rounded-2xl border border-black/[0.05] bg-white p-3 text-left shadow-sm",
        "transition duration-200 hover:-translate-y-0.5 active:scale-[0.97]",
        confirmed && "ring-2 ring-teal-200/80"
      )}
    >
      {confirmed && (
        <span
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm"
          aria-hidden
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <span
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: color }}
      >
        <AppIcon name={icon} className="h-4 w-4" />
      </span>
      <p className="truncate text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatMoney(amount)}
      </p>
    </button>
  );
}
