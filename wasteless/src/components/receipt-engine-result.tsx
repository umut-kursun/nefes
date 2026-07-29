import dynamic from "next/dynamic";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptDebugExport } from "@/lib/receipt-engine-debug/exportSchema";
import { Button } from "@/components/ui/button";

const ReceiptEngineDebugExportButtons = dynamic(
  () =>
    import("@/components/receipt-engine-debug-export").then((m) => ({
      default: m.ReceiptEngineDebugExportButtons,
    })),
  { ssr: false }
);

type Props = {
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  imageDataUrl?: string;
  debugExport?: ReceiptDebugExport;
  /** Verbatim OCR text from Layer 1 (preferred over provenance join). */
  ocrRawText?: string;
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
  debugExport,
  ocrRawText,
  onBack,
}: Props) {
  const issues = [...validation.errors, ...validation.warnings];
  const ocrText =
    ocrRawText?.trim() ||
    purchase.provenance.rawTexts.filter(Boolean).join("\n").trim() ||
    "";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="font-display text-lg">Receipt Engine Sonucu</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Merchant</dt>
            <dd className="text-right font-medium">
              {purchase.merchant ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Receipt Date</dt>
            <dd className="text-right">{formatDate(purchase)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-right font-medium">
              {formatMoney(purchase.total?.amount)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Validation Score</dt>
            <dd className="text-right">
              {validation.score}/100 {validation.isValid ? "(valid)" : "(invalid)"}
            </dd>
          </div>
        </dl>
      </div>

      {imageDataUrl && (
        <div className="rounded-2xl border border-white/70 bg-white/75 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="Receipt"
            className="mx-auto max-h-64 w-auto rounded-lg"
          />
        </div>
      )}

      {ocrText ? (
        <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
          <h3 className="font-semibold">OCR metni</h3>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/85">
            {ocrText}
          </pre>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          OCR metni alınamadı.
        </div>
      )}

      <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
        <h3 className="font-semibold">Validation Issues</h3>
        {issues.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No issues.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {issues.map((issue) => (
              <li key={issue.id}>
                <span className="font-medium">[{issue.severity}]</span>{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
        <h3 className="font-semibold">Product List</h3>
        {purchase.products.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No products.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {purchase.products.map((line, index) => (
              <li key={`${line.name}-${index}`} className="flex justify-between gap-4 py-2">
                <span>{line.name}</span>
                <span>{formatMoney(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {debugExport && imageDataUrl && (
        <ReceiptEngineDebugExportButtons
          debugExport={debugExport}
          imageDataUrl={imageDataUrl}
        />
      )}

      <Button variant="ghost" className="w-full" onClick={onBack}>
        Yeni tarama
      </Button>
    </div>
  );
}
