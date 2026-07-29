import type { AnalysisResult } from "@/lib/types";
import { applyReceiptIntelligence } from "./receipt-intelligence";
import { LOW_CONFIDENCE_THRESHOLD, safeParseAnalysisResult } from "./validation";

/** @deprecated Use receipt-pipeline OCR/PARSER prompts. Kept for reference in tests. */
export const ANALYZE_SYSTEM_PROMPT = `Legacy combined prompt — see receipt-pipeline/stages`;

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return JSON");
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Parse Vision JSON and apply receipt intelligence — used by pipeline stage 4. */
export function parseVisionContent(
  content: string
):
  | { analysis: AnalysisResult; content: string }
  | { error: string; details?: unknown; raw?: unknown; status: number } {
  let parsed: unknown;
  try {
    parsed = extractJson(content);
  } catch {
    return { error: "Model JSON döndürmedi.", status: 502 };
  }

  const validated = safeParseAnalysisResult(parsed);
  if (!validated.success) {
    return {
      error: "JSON doğrulaması başarısız.",
      details: validated.error.flatten(),
      raw: parsed,
      status: 422,
    };
  }

  const intelligent = applyReceiptIntelligence(
    validated.data as AnalysisResult
  );
  return { analysis: intelligent.analysis, content };
}

export { LOW_CONFIDENCE_THRESHOLD };
