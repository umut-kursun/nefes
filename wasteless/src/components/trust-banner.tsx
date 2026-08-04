"use client";

import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveTrustLevel,
  shouldShowOcrTrustBanner,
  type TrustLevel,
} from "@/lib/ocr-trust";

export { resolveTrustLevel, shouldShowOcrTrustBanner, type TrustLevel };

const TRUST_COPY: Record<
  TrustLevel,
  { message: string; icon: React.ReactNode; className: string }
> = {
  high: {
    message: "Yüksek güven — yine de kontrol et",
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: "border-teal-200 bg-teal-50 text-teal-950",
  },
  medium: {
    message: "Bazı alanları kontrol et",
    icon: <Info className="h-4 w-4" />,
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  low: {
    message: "Düşük güven — alanları dikkatle kontrol et",
    icon: <AlertTriangle className="h-4 w-4" />,
    className: "border-amber-300 bg-amber-50 text-amber-950",
  },
};

export function TrustBanner({
  confidence,
  className,
}: {
  confidence: number | null | undefined;
  className?: string;
}) {
  const level = resolveTrustLevel(confidence);
  if (level == null || confidence == null) return null;
  const config = TRUST_COPY[level];
  const pct = Math.round(confidence * 100);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        config.className,
        className
      )}
    >
      <span className="mt-0.5 shrink-0">{config.icon}</span>
      <div>
        <p className="font-semibold">{config.message}</p>
        <p className="mt-0.5 text-xs opacity-80">
          Genel güven skoru: %{pct}
          {level === "low" &&
            " — tutar, işyeri ve ürünleri kaydetmeden önce doğrula."}
        </p>
      </div>
    </div>
  );
}
