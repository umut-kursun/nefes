"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { AnimatedAmount } from "@/components/animated-amount";
import { TrendBadge } from "@/components/trend-badge";
import { SegmentedControl } from "@/components/segmented-control";
import { categoryHref, memorySearchHref } from "@/lib/insights";
import type { PeriodScope } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type HeroLargestCategory = {
  id: string;
  label: string;
  color: string;
  softColor: string;
  icon: string;
};

export type LatestPurchaseInfo = {
  merchant: string;
  timeLabel: string;
  href: string;
};

const PERIOD_OPTIONS: { value: PeriodScope; label: string }[] = [
  { value: "day", label: "Bugün" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Ay" },
  { value: "year", label: "Yıl" },
];

export function HeroCard({
  period,
  onPeriodChange,
  periodTitle,
  caption,
  total,
  trend,
  currency = "TRY",
  purchaseCount = 0,
  merchantCount = 0,
  productCount = 0,
  largestCategory,
  largestMerchant,
  latestPurchase,
  children,
}: {
  period: PeriodScope;
  onPeriodChange: (period: PeriodScope) => void;
  periodTitle: string;
  caption: string;
  total: number;
  trend: number | null;
  currency?: string;
  purchaseCount?: number;
  merchantCount?: number;
  productCount?: number;
  largestCategory?: HeroLargestCategory | null;
  largestMerchant?: string | null;
  latestPurchase?: LatestPurchaseInfo | null;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-teal-100/80 bg-gradient-to-br from-teal-50/40 via-white to-blue-50/30 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-5">
      <SegmentedControl
        value={period}
        onChange={onPeriodChange}
        options={PERIOD_OPTIONS}
        className="mb-3"
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {periodTitle}
        </p>
        <TrendBadge value={trend} comparedTo={caption} className="text-sm" />
      </div>

      <AnimatedAmount
        value={total}
        currency={currency}
        className="font-amount mt-2 block text-[2.6rem] font-extrabold leading-none text-[color:var(--ink)]"
      />

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold tabular-nums text-foreground">
            {purchaseCount}
          </span>{" "}
          alışveriş
        </span>
        <span className="text-black/15">·</span>
        <span>
          <span className="font-semibold tabular-nums text-foreground">
            {merchantCount}
          </span>{" "}
          işyeri
        </span>
        <span className="text-black/15">·</span>
        <span>
          <span className="font-semibold tabular-nums text-foreground">
            {productCount}
          </span>{" "}
          ürün
        </span>
      </div>

      {latestPurchase && (
        <Link
          href={latestPurchase.href}
          className={cn(
            "mt-3 flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2 transition active:scale-[0.99]"
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Son alışveriş
            </p>
            <p className="truncate text-sm font-semibold text-[color:var(--ink)]">
              {latestPurchase.merchant}
            </p>
          </div>
          <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {latestPurchase.timeLabel}
          </p>
        </Link>
      )}

      {(largestCategory || largestMerchant) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {largestCategory && (
            <Link
              href={categoryHref(largestCategory.id)}
              className="inline-flex min-h-9 max-w-full items-center gap-1.5 transition hover:text-foreground"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                style={{
                  backgroundColor: largestCategory.softColor,
                  color: largestCategory.color,
                }}
              >
                <AppIcon name={largestCategory.icon} className="h-3 w-3" />
              </span>
              <span className="truncate font-medium text-foreground/80">
                {largestCategory.label}
              </span>
            </Link>
          )}
          {largestMerchant && (
            <Link
              href={memorySearchHref(largestMerchant)}
              className="inline-flex min-h-9 items-center truncate font-medium text-foreground/80 transition hover:text-foreground"
            >
              {largestMerchant}
            </Link>
          )}
        </div>
      )}

      {children && (
        <div className="mt-4 border-t border-black/[0.05] pt-4">{children}</div>
      )}
    </div>
  );
}
