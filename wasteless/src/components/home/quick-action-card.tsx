"use client";

import { AppIcon } from "@/components/icons";
import { formatMoney } from "@/lib/utils";

export function QuickActionCard({
  title,
  amount,
  icon,
  color,
  onClick,
}: {
  title: string;
  amount: number;
  icon: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[104px] shrink-0 rounded-2xl border border-black/[0.05] bg-white p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
    >
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
