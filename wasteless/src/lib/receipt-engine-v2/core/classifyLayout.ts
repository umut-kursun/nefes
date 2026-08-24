import { LineKind } from "../tokenizer/LineKind";
import type { TokenizedLine } from "../tokenizer/TokenizedLine";
import type { VisionResult } from "../vision/types";
import type { ClassificationResult, LayoutFamily } from "./types";

const MERCHANT_SIGNALS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly family: LayoutFamily;
  readonly weight: number;
  readonly label: string;
}> = [
  { pattern: /\bMIGROS\b/i, family: "supermarket", weight: 0.35, label: "merchant:migros" },
  { pattern: /\bB[İI]M\b/i, family: "supermarket", weight: 0.35, label: "merchant:bim" },
  { pattern: /\bA101\b/i, family: "supermarket", weight: 0.35, label: "merchant:a101" },
  { pattern: /\bCARREFOUR/i, family: "supermarket", weight: 0.35, label: "merchant:carrefour" },
  { pattern: /AKARYAKIT|PETROL|OPET\b|SHELL\b|MOTOR[İI]N|BENZ[İI]N/i, family: "fuel", weight: 0.4, label: "merchant:fuel" },
  { pattern: /\bMcD\b|MCDONALD/i, family: "fast_food", weight: 0.4, label: "merchant:mcdonalds" },
  { pattern: /BURGER\s*KING/i, family: "fast_food", weight: 0.35, label: "merchant:burger_king" },
  { pattern: /ECZANE|PHARMACY/i, family: "pharmacy", weight: 0.35, label: "merchant:pharmacy" },
  { pattern: /LCW|LC\s*WAIKIKI|TOYZZ|MAĞAZA/i, family: "retail", weight: 0.3, label: "merchant:retail" },
  { pattern: /PROF[İI]TEROL|RESTORAN|CAFE|CAFÉ|KAFE|PASTANE/i, family: "restaurant", weight: 0.3, label: "merchant:restaurant" },
];

type FamilyScore = {
  readonly family: LayoutFamily;
  readonly score: number;
  readonly signals: string[];
};

function scoreFromTokens(tokens: readonly TokenizedLine[]): FamilyScore[] {
  const counts = new Map<LineKind, number>();
  for (const token of tokens) {
    counts.set(token.kind, (counts.get(token.kind) ?? 0) + 1);
  }

  const qtyCount = counts.get(LineKind.QuantityDetail) ?? 0;
  const chargeCount = counts.get(LineKind.ChargeCandidate) ?? 0;
  const productCount = counts.get(LineKind.ProductCandidate) ?? 0;
  const hasSubtotal = (counts.get(LineKind.Subtotal) ?? 0) > 0;
  const hasVatTotal = (counts.get(LineKind.VatTotal) ?? 0) > 0;

  const hasFuelQty = tokens.some(
    (t) =>
      t.kind === LineKind.QuantityDetail &&
      /\b(?:LT|L)\b/i.test(t.raw) &&
      /\bx\b/i.test(t.raw)
  );
  const hasComboLine = tokens.some(
    (t) => t.kind === LineKind.Unknown && /^\s*\([^)]+\)\s*$/.test(t.raw)
  );
  const hasInterleavedQty = qtyCount >= 2 && productCount >= 3;

  const scores: FamilyScore[] = [];

  if (hasFuelQty) {
    scores.push({
      family: "fuel",
      score: 0.55,
      signals: ["layout:fuel_lt_qty_line"],
    });
  }

  if (qtyCount >= 1 && chargeCount >= 1 && hasSubtotal) {
    scores.push({
      family: "supermarket",
      score: 0.45 + Math.min(qtyCount, 4) * 0.05,
      signals: ["layout:pos_vat_star_with_qty", `qty_lines:${qtyCount}`],
    });
  } else if (hasInterleavedQty) {
    scores.push({
      family: "supermarket",
      score: 0.5,
      signals: ["layout:interleaved_qty"],
    });
  }

  if (hasComboLine) {
    scores.push({
      family: "fast_food",
      score: 0.5,
      signals: ["layout:combo_parenthetical"],
    });
  }

  if (productCount <= 3 && !qtyCount && !chargeCount && (hasSubtotal || hasVatTotal)) {
    scores.push({
      family: "restaurant",
      score: 0.4,
      signals: ["layout:simple_pos"],
    });
  }

  if (productCount >= 1 && productCount <= 5 && !qtyCount && !chargeCount) {
    scores.push({
      family: "retail",
      score: 0.25,
      signals: ["layout:minimal_products"],
    });
  }

  return scores;
}

function scoreFromMerchant(vision: VisionResult): FamilyScore[] {
  const haystack = [
    vision.merchant?.rawName ?? "",
    vision.merchant?.rawAddress ?? "",
    ...vision.lines.slice(0, 6),
  ].join("\n");

  const byFamily = new Map<LayoutFamily, FamilyScore>();

  for (const signal of MERCHANT_SIGNALS) {
    if (!signal.pattern.test(haystack)) continue;
    const existing = byFamily.get(signal.family);
    if (existing) {
      byFamily.set(signal.family, {
        family: signal.family,
        score: existing.score + signal.weight,
        signals: [...existing.signals, signal.label],
      });
    } else {
      byFamily.set(signal.family, {
        family: signal.family,
        score: signal.weight,
        signals: [signal.label],
      });
    }
  }

  return [...byFamily.values()];
}

function mergeScores(scores: readonly FamilyScore[]): ClassificationResult {
  const merged = new Map<LayoutFamily, FamilyScore>();

  for (const entry of scores) {
    const existing = merged.get(entry.family);
    if (existing) {
      merged.set(entry.family, {
        family: entry.family,
        score: existing.score + entry.score,
        signals: [...existing.signals, ...entry.signals],
      });
    } else {
      merged.set(entry.family, entry);
    }
  }

  const ranked = [...merged.values()].sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (!best || best.score < 0.25) {
    return {
      family: "generic",
      confidence: 0.3,
      signals: ["fallback:low_signal"],
    };
  }

  const confidence =
    best.signals.some((signal) => signal.startsWith("merchant:"))
      ? Math.max(best.score, 0.55)
      : best.score;

  return {
    family: best.family,
    confidence: Math.min(confidence, 1),
    signals: best.signals,
  };
}

/** Classify receipt layout from vision + tokenized lines (no LLM). */
export function classifyLayout(
  vision: VisionResult,
  tokens: readonly TokenizedLine[]
): ClassificationResult {
  const scores = [...scoreFromMerchant(vision), ...scoreFromTokens(tokens)];
  return mergeScores(scores);
}
