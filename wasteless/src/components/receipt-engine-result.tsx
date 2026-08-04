import dynamic from "next/dynamic";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import { Button } from "@/components/ui/button";

const CopyAllDebugButton = dynamic(
  () =>
    import("@/components/copy-all-debug-button").then((m) => ({
      default: m.CopyAllDebugButton,
    })),
  { ssr: false }
);

type Props = {
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  imageDataUrl?: string;
  ocrRawText?: string;
  rawVisionResponse?: string;
  analyzeResult?: unknown;
  onBack: () => void;
};

function formatDate(purchase: PurchaseDraft): string {
  if (purchase.purchaseDate?.normalized) return purchase.purchaseDate.normalized;
  if (purchase.purchaseDate?.raw) return purchase.purchaseDate.raw;
  return "—";
}

function formatMoney(value: number | undefined): string {
  if (value === undefined) return "—";
  return value.toFixed(2);
}

export function ReceiptEngineResult({
  purchase,
  validation,
  imageDataUrl,
  ocrRawText,
  rawVisionResponse = "",
  analyzeResult,
  onBack,
}: Props) {
  const ocrText =
    ocrRawText?.trim() ||
    purchase.provenance.rawTexts.filter(Boolean).join("\n").trim() ||
    "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/75 p-4">
        <div>
          <h2 className="font-display text-lg">Receipt Engine</h2>
          <p className="text-sm text-muted-foreground">
            {purchase.merchant ?? "—"} · {formatDate(purchase)} ·{" "}
            {formatMoney(purchase.total?.amount)} TL · score{" "}
            {validation.score}/100
          </p>
        </div>
        <CopyAllDebugButton
          purchase={purchase}
          validation={validation}
          ocrText={ocrText}
          rawVisionResponse={rawVisionResponse}
          analyzeResult={analyzeResult}
        />
      </div>

      {imageDataUrl && (
        <div className="rounded-2xl border border-white/70 bg-white/75 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="Receipt"
            className="mx-auto max-h-48 w-auto rounded-lg"
          />
        </div>
      )}

      <Button variant="ghost" className="w-full" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
