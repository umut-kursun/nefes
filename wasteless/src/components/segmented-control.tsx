"use client";

import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid rounded-2xl bg-stone-900/[0.05] p-1",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl px-2 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97]",
              active
                ? "bg-white text-foreground shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
