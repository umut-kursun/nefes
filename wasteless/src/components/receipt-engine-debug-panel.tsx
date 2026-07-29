"use client";

/* eslint-disable @next/next/no-img-element -- debug page previews receipt data URLs */

import { useRef, useState } from "react";
import { Loader2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PipelineTrace } from "@/lib/receipt-engine-debug/tracePipeline";
import { STAGE_FILENAMES } from "@/lib/receipt-engine-debug/stageFilenames";

const STAGES: {
  key: keyof PipelineTrace["stages"];
  label: string;
  layer: string;
}[] = [
  { key: "ocr", label: "OCR", layer: "L1" },
  { key: "layout", label: "Layout", layer: "L2" },
  { key: "receiptGraph", label: "ReceiptGraph", layer: "L3" },
  { key: "classifiedGraph", label: "ClassifiedGraph", layer: "L4" },
  { key: "blockDocument", label: "BlockDocument", layer: "L5" },
  { key: "purchaseDraft", label: "PurchaseDraft", layer: "L6" },
  { key: "validationReport", label: "ValidationReport", layer: "L7" },
];

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReceiptEngineDebugPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<PipelineTrace | null>(null);
  const [activeStage, setActiveStage] =
    useState<(typeof STAGES)[number]["key"]>("ocr");
  const [view, setView] = useState<"json" | "text">("json");

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
      setActiveStage("ocr");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trace failed.");
    } finally {
      setLoading(false);
    }
  };

  const stageJson = trace?.stages[activeStage];
  const stageText = trace?.textDebug[activeStage];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Receipt Engine — Pipeline Debug
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload one receipt to capture OCR → Layout → Graph → Classify →
          Blocks → Purchase → Validation. Compare stages to find where output
          first diverges from the fiş.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
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
            Fiş yükle ve izle
          </Button>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}
      </div>

      {trace && (
        <>
          <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Trace ID</dt>
                <dd className="font-mono text-xs">{trace.traceId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{trace.createdAt}</dd>
              </div>
              {trace.savedTo && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Saved to disk</dt>
                  <dd className="font-mono text-xs break-all">{trace.savedTo}</dd>
                </div>
              )}
            </dl>

            {trace.imageDataUrl && (
              <img
                src={trace.imageDataUrl}
                alt="Receipt"
                className="mt-4 max-h-48 rounded-xl border object-contain"
              />
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadJson(`${trace.traceId}-full-trace.json`, trace)
                }
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Full trace
              </Button>
              {STAGES.map((stage) => (
                <Button
                  key={stage.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadJson(
                      STAGE_FILENAMES[stage.key] ??
                        `${stage.key}.json`,
                      trace.stages[stage.key]
                    )
                  }
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  {STAGE_FILENAMES[stage.key]?.replace(".json", "") ??
                    stage.key}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.05] bg-white shadow-sm">
            <div className="flex flex-wrap gap-1 border-b border-black/[0.05] p-2">
              {STAGES.map((stage) => (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setActiveStage(stage.key)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    activeStage === stage.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {stage.layer} {stage.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 border-b border-black/[0.05] px-3 py-2">
              <button
                type="button"
                onClick={() => setView("json")}
                className={`text-xs font-medium ${
                  view === "json" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() => setView("text")}
                className={`text-xs font-medium ${
                  view === "text" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Text summary
              </button>
            </div>

            <pre className="max-h-[min(60vh,520px)] overflow-auto p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
              {view === "json"
                ? JSON.stringify(stageJson, null, 2)
                : stageText}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
