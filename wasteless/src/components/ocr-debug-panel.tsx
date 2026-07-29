"use client";

/* eslint-disable @next/next/no-img-element -- dev-only OCR preview uses data URLs */

import { useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OcrDebugSuccess } from "@/lib/ocr-debug/runOcrDebug";

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

export function OcrDebugPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrDebugSuccess | null>(null);
  const [view, setView] = useState<"text" | "content" | "json">("text");

  const runOcr = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/ocr/debug", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as OcrDebugSuccess | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "OCR debug failed.");
      }
      setResult(data);
      setView("text");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR debug failed.");
    } finally {
      setLoading(false);
    }
  };

  const displayText =
    result?.rawText ??
    result?.rawContent ??
    "No OCR text returned.";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          OCR Debug — OpenAI Vision Only
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload one receipt image to call OpenAI Vision directly. No Receipt
          Engine pipeline — raw OCR text and full API response only.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void runOcr(file);
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
            Fiş yükle ve OCR çalıştır
          </Button>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}
      </div>

      {result && (
        <>
          <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Trace ID</dt>
                <dd className="font-mono text-xs">{result.traceId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-mono text-xs">{result.model}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duration</dt>
                <dd>{result.durationMs} ms</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Prompt tokens</dt>
                <dd>{result.usage.prompt_tokens}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Completion tokens</dt>
                <dd>{result.usage.completion_tokens}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total tokens</dt>
                <dd>{result.usage.total_tokens}</dd>
              </div>
              {result.savedTo && (
                <div className="col-span-full">
                  <dt className="text-muted-foreground">Saved to disk</dt>
                  <dd className="font-mono text-xs break-all">{result.savedTo}</dd>
                </div>
              )}
            </dl>

            {result.imageDataUrl && (
              <img
                src={result.imageDataUrl}
                alt="Receipt"
                className="mt-4 max-h-48 rounded-xl border object-contain"
              />
            )}

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadJson(`${result.traceId}-raw-response.json`, result)
                }
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Download raw JSON
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.05] bg-white shadow-sm">
            <div className="flex gap-2 border-b border-black/[0.05] px-3 py-2">
              <button
                type="button"
                onClick={() => setView("text")}
                className={`text-xs font-medium ${
                  view === "text" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Raw OCR text
              </button>
              <button
                type="button"
                onClick={() => setView("content")}
                className={`text-xs font-medium ${
                  view === "content" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Message content
              </button>
              <button
                type="button"
                onClick={() => setView("json")}
                className={`text-xs font-medium ${
                  view === "json" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Full API response
              </button>
            </div>

            <pre className="max-h-[min(60vh,520px)] overflow-auto p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
              {view === "text"
                ? displayText
                : view === "content"
                  ? result.rawContent
                  : JSON.stringify(result.rawApiResponse, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
