import type { AnalysisResult, OcrCorrection } from "@/lib/types";
import { applyCorrectionsToAnalysis } from "@/lib/ocr-correction-memory";

export type LearningResult = {
  analysis: AnalysisResult;
  appliedCount: number;
  notes: string[];
};

/**
 * Stage 8 — apply locally stored user corrections to OCR patterns.
 */
export function applyLearningStage(
  analysis: AnalysisResult,
  corrections: OcrCorrection[] = []
): LearningResult {
  if (corrections.length === 0) {
    return { analysis, appliedCount: 0, notes: [] };
  }

  const before = JSON.stringify(analysis.items?.map((i) => i.name));
  const next = applyCorrectionsToAnalysis(analysis, corrections);
  const after = JSON.stringify(next.items?.map((i) => i.name));

  const appliedCount = before !== after ? 1 : 0;
  const notes: string[] = [];
  if (appliedCount > 0) {
    notes.push("Önceki düzeltmeler otomatik uygulandı.");
  }

  return { analysis: next, appliedCount, notes };
}
