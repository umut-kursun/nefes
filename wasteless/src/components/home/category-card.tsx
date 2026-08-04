"use client";

import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { TrendBadge } from "@/components/trend-badge";
import { formatMoney } from "@/lib/utils";

export type CategoryChildPreview = {
  label: string;
  total: number;
};

export function CategoryCard({
  href,
  icon,
  label,
  color,
  softColor,
  total,
  count,
  trend,
  trendComparedTo,
  progress,
  childrenPreview = [],
}: {
  href: string;
  icon: string;
  label: string;
  color: string;
  softColor: string;
  total: number;
  count: number;
  trend: number | null;
  trendComparedTo?: string | null;
  progress: number;
  childrenPreview?: CategoryChildPreview[];
}) {
  const shown = childrenPreview.slice(0, 3);
  const extra = childrenPreview.length - shown.length;

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-teal-100/70 bg-gradient-to-br from-white via-teal-50/25 to-blue-50/20 p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <span
        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: softColor, color }}
      >
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{label}</p>
          <p className="font-amount shrink-0 text-[15px] font-bold">
            {formatMoney(total)}
          </p>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
        {shown.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {shown.map((child) => (
              <li
                key={child.label}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span className="truncate">{child.label}</span>
                <span className="shrink-0 tabular-nums font-medium text-foreground/80">
                  {formatMoney(child.total)}
                </span>
              </li>
            ))}
            {extra > 0 && (
              <li className="text-[11px] text-muted-foreground">+{extra} daha</li>
            )}
          </ul>
        ) : (
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{count} kayıt</p>
            <TrendBadge value={trend} comparedTo={trendComparedTo} />
          </div>
        )}
        {shown.length > 0 && (
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">{count} kayıt</p>
            <TrendBadge value={trend} comparedTo={trendComparedTo} />
          </div>
        )}
      </div>
    </Link>
  );
}
