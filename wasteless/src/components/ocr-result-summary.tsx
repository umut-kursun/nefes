"use client";

import { formatMoney } from "@/lib/utils";
import type { LineItemIssue } from "@/lib/receipt-quality";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function OcrResultSummary({
  productCount,
  reviewCount,
  totalVerified,
  issues = [],
}: {
  productCount: number;
  reviewCount: number;
  totalVerified: boolean;
  issues?: LineItemIssue[];
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm">
      <div className="flex items-center gap-2 text-teal-900">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>
          {productCount} ürün tanındı
        </span>
      </div>
      {reviewCount > 0 && (
        <div className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{reviewCount} ürün kontrol gerektiriyor</span>
        </div>
      )}
      {totalVerified ? (
        <div className="flex items-center gap-2 text-teal-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Fiş toplamı doğrulandı</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Fiş toplamı uyuşmuyor</span>
        </div>
      )}
      {issues.length > 0 && (
        <ul className="mt-2 space-y-2 border-t border-black/[0.06] pt-2">
          {issues.slice(0, 5).map((issue, i) => (
            <li key={i} className="rounded-xl bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
              <p className="font-semibold">{issue.name}</p>
              <p className="mt-0.5 text-amber-900/90">{issue.reason}</p>
              {issue.expected != null && issue.parsed != null && (
                <p className="mt-0.5 tabular-nums">
                  Beklenen: {formatMoney(issue.expected)} · Okunan:{" "}
                  {formatMoney(issue.parsed)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
