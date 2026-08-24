"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PipelineTrace } from "@/lib/receipt-engine-debug/tracePipeline";
import { CopyAllDebugButton } from "@/components/copy-all-debug-button";
import { StageTimingsPanel } from "@/components/stage-timings-panel";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";

function traceOcrText(trace: PipelineTrace): string {
  const ocrStage = trace.stages.ocr as { rawText?: string; lines?: string[] };
  return (
    ocrStage.rawText?.trim() ||
    ocrStage.lines?.join("\n").trim() ||
    ""
  );
}

export function ReceiptEngineDebugPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<PipelineTrace | null>(null);

  const runTrace = async (file: File) => {
    setLoading(true);
    setError(null);
    setTrace(null);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("sourceHint", "receipt");
      const res = await fetch("/api/receipt-engine/debug", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as PipelineTrace | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Trace failed.");
      }
      setTrace(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trace failed.");
    } finally {
      setLoading(false);
    }
  };

  const purchase = trace?.stages.purchaseDraft as PurchaseDraft | undefined;
  const validation = trace?.stages.validationReport as
    | ValidationReportGolden
    | undefined;
  const rawVision = trace?.rawVisionResponse ?? "";
  const ocrText = trace ? traceOcrText(trace) : "";

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Receipt Engine Debug
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a receipt, then use Copy All Debug to export everything in one
          plain-text blob.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void runTrace(file);
            }}
          />
          <Button
            type="button"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload receipt
          </Button>
          {trace && purchase && validation && (
            <CopyAllDebugButton
              purchase={purchase}
              validation={validation}
              ocrText={ocrText}
              rawVisionResponse={rawVision}
              analyzeResult={trace}
              stageTimings={trace.timings}
            />
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}
      </div>

      {trace && purchase && validation && (
        <div className="space-y-3">
          <StageTimingsPanel timings={trace.timings} />
          <div className="rounded-2xl border border-black/[0.05] bg-white p-3 shadow-sm text-xs text-muted-foreground">
            <span className="font-mono">{trace.traceId}</span>
            {trace.imageDataUrl && (
              <img
                src={trace.imageDataUrl}
                alt="Receipt"
                className="mt-3 max-h-40 rounded-lg border object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
