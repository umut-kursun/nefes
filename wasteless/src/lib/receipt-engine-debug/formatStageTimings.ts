import type { PipelineLayerTimings } from "./tracePipeline";
import type { VisionPipelineStageTimings } from "@/lib/receipt-engine-sdk/vision/pipelineStageTiming";

export type ReceiptStageTimings = Partial<
  PipelineLayerTimings & VisionPipelineStageTimings
> & {
  /** End-to-end client wall time (upload + server), when measured on device. */
  clientTotalMs?: number;
  /** Network + server handler before pipeline (FormData upload). */
  networkMs?: number;
  /** Receipt engine version used for this scan. */
  engine?: "v1" | "v2";
  /** V2 semantic extraction wall time on server. */
  extractionMs?: number;
  /** V2 line normalization wall time on server. */
  normalizationMs?: number;
};

type TimingRow = { readonly label: string; readonly ms: number };

const VISION_ROWS: ReadonlyArray<{
  key: keyof ReceiptStageTimings;
  label: string;
}> = [
  { key: "preprocessMs", label: "Image preprocessing (client)" },
  { key: "resizeMs", label: "Image resize (client)" },
  { key: "base64EncodeMs", label: "Base64 encoding" },
  { key: "networkMs", label: "Upload / network" },
  { key: "openAiRequestMs", label: "OCR (Vision API)" },
  { key: "ocrMs", label: "OCR" },
  { key: "jsonParseMs", label: "JSON parsing" },
  { key: "extractionMs", label: "Semantic extraction (server)" },
  { key: "normalizationMs", label: "Normalization (server)" },
  { key: "layoutMs", label: "Layout" },
  { key: "graphMs", label: "Receipt graph" },
  { key: "classificationMs", label: "Classification" },
  { key: "blockMs", label: "Block document" },
  { key: "purchaseDraftMs", label: "Purchase draft" },
  { key: "purchaseMs", label: "Purchase draft (legacy)" },
  { key: "validationMs", label: "Validation" },
];

function formatMs(ms: number): string {
  if (ms >= 1000) {
    const sec = ms / 1000;
    return `${Math.round(ms)} ms (${sec.toFixed(1)} s)`;
  }
  return `${Math.round(ms)} ms`;
}

function collectTimingRows(timings: ReceiptStageTimings): TimingRow[] {
  const rows: TimingRow[] = [];
  const seen = new Set<string>();

  for (const { key, label } of VISION_ROWS) {
    const value = timings[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    if (seen.has(label)) continue;
    seen.add(label);
    rows.push({ label, ms: value });
  }

  return rows;
}

export function formatStageTimingsSection(timings: ReceiptStageTimings): string {
  const rows = collectTimingRows(timings);
  if (rows.length === 0) {
    return "===== STAGE TIMINGS =====\n(no timing data)";
  }

  const lines = rows.map((row) => `  ${row.label}: ${formatMs(row.ms)}`);

  const totalMs =
    typeof timings.clientTotalMs === "number" && timings.clientTotalMs > 0
      ? timings.clientTotalMs
      : typeof timings.totalMs === "number" && timings.totalMs > 0
        ? timings.totalMs
        : null;

  if (totalMs != null) {
    lines.push(`  ---`);
    lines.push(`  Total: ${formatMs(totalMs)}`);
  }

  const jsonBlock = JSON.stringify(timings, null, 2);

  return ["===== STAGE TIMINGS =====", ...lines, "", jsonBlock].join("\n");
}

export function extractPerformanceTimings(
  analyzeResult: unknown
): ReceiptStageTimings | undefined {
  if (!analyzeResult || typeof analyzeResult !== "object") return undefined;
  const perf = (analyzeResult as { performance?: ReceiptStageTimings }).performance;
  if (!perf || typeof perf !== "object") return undefined;
  return perf;
}
