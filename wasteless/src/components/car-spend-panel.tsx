"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  getCarSpendBreakdown,
  type CarSpendBucket,
} from "@/lib/analytics";
import { formatDate } from "@/lib/datetime";
import { formatPlate } from "@/lib/plate";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { Expense } from "@/lib/types";

function BucketCard({ bucket }: { bucket: CarSpendBucket }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl border border-black/[0.05] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{bucket.label}</p>
          <p className="text-xs text-muted-foreground">
            {bucket.count} kayıt
          </p>
        </div>
        <p className="font-amount text-[15px] font-bold">
          {formatMoney(bucket.total)}
        </p>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <ul className="space-y-2 border-t border-black/[0.05] px-3 pb-3 pt-2">
          {bucket.entries.slice(0, 15).map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/expense?id=${encodeURIComponent(entry.id)}`}
                className="flex items-start justify-between gap-2 rounded-xl px-1 py-1 text-sm hover:bg-black/[0.03]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {entry.fuel?.stationName ||
                      entry.merchantName ||
                      entry.subcategory ||
                      "Kayıt"}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(entry.date)}
                    {entry.fuel?.liters
                      ? ` · ${formatNumber(entry.fuel.liters)} L`
                      : ""}
                    {entry.fuel?.plate
                      ? ` · ${formatPlate(entry.fuel.plate)}`
                      : entry.subcategory
                        ? ` · ${entry.subcategory}`
                        : ""}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatMoney(entry.totalAmount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Araba kategorisi: yakıt / bakım / lastik / … kırılımı. */
export function CarSpendPanel({
  expenses,
}: {
  expenses: Expense[];
}) {
  const buckets = useMemo(() => getCarSpendBreakdown(expenses), [expenses]);
  if (buckets.length === 0) return null;

  const total = buckets.reduce((s, b) => s + b.total, 0);

  return (
    <section className="mb-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold">Arabaya göre kırılım</h2>
          <p className="text-xs text-muted-foreground">
            Yakıt, bakım, lastik… nereye ne kadar
          </p>
        </div>
        <p className="font-amount text-sm font-bold">{formatMoney(total)}</p>
      </div>
      <ul className="space-y-2">
        {buckets.map((b) => (
          <BucketCard key={b.kind} bucket={b} />
        ))}
      </ul>
    </section>
  );
}
