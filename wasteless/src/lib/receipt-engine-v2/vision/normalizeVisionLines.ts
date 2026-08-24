import type { VisionResult } from "./types";

function splitRawText(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function countStarAmounts(text: string): number {
  return (text.match(/\*[\d.,\-]+/g) ?? []).length;
}

/**
 * Prefer the line source that preserves the most monetary anchors.
 * Live Vision sometimes omits right-column prices from `lines` but keeps them in `rawText`.
 */
export function normalizeVisionLines(vision: VisionResult): readonly string[] {
  const fromLines = vision.lines.filter((l) => l.trim().length > 0);
  const fromRaw = splitRawText(vision.rawText);

  if (fromLines.length === 0) return fromRaw;
  if (fromRaw.length === 0) return fromLines;

  const lineStars = countStarAmounts(fromLines.join("\n"));
  const rawStars = countStarAmounts(vision.rawText);

  if (rawStars > lineStars) return fromRaw;
  if (fromRaw.length > fromLines.length + 3 && rawStars >= lineStars) return fromRaw;

  return fromLines;
}

export function applyNormalizedLines(vision: VisionResult): VisionResult {
  const lines = normalizeVisionLines(vision);
  if (lines === vision.lines) return vision;
  return { ...vision, lines };
}
