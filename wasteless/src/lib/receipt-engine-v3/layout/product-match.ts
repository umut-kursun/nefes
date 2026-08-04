import type { RawLine } from "../types/raw-line";
import {
  AMOUNT_ONLY,
  CORPORATE_SUFFIX,
  DATE_LABEL,
  FUEL_LINE,
  FUEL_UNIT_PRICE,
  NON_PRODUCT_LABEL,
  TIME_LABEL,
  trailingAmount,
} from "../semantic/patterns";
import {
  bboxCenter,
  clusterRows,
  leftAligned,
  lineBounds,
  rightAligned,
  verticalDistance,
} from "./geometry";

export type LinePair = {
  readonly name: RawLine;
  readonly amount: RawLine;
  readonly score: number;
};

function ADDRESS_LABEL(text: string): boolean {
  return /\b(mah\.?|cad\.?|sokak|sok\.|sk\.|no:|istanbul|ankara)\b/i.test(text);
}

function hasInlineLineTotal(line: RawLine): boolean {
  if (AMOUNT_ONLY.test(line.text)) return false;
  if (trailingAmount(line.text) == null) return false;
  if (FUEL_LINE.test(line.text)) return false;
  return true;
}

function isAmountCandidate(line: RawLine, pageW: number): boolean {
  if (NON_PRODUCT_LABEL.test(line.text)) return false;
  if (CORPORATE_SUFFIX.test(line.text)) return false;
  if (DATE_LABEL.test(line.text) && !AMOUNT_ONLY.test(line.text)) return false;
  if (FUEL_LINE.test(line.text) && !AMOUNT_ONLY.test(line.text)) return false;
  if (FUEL_UNIT_PRICE.test(line.text) && !AMOUNT_ONLY.test(line.text)) return false;

  if (AMOUNT_ONLY.test(line.text)) return true;

  const amt = trailingAmount(line.text);
  if (amt == null) return false;
  return rightAligned(line, pageW, 0.58);
}

function isNameCandidate(line: RawLine, pageW: number): boolean {
  if (NON_PRODUCT_LABEL.test(line.text)) return false;
  if (ADDRESS_LABEL(line.text)) return false;
  if (CORPORATE_SUFFIX.test(line.text) && !FUEL_LINE.test(line.text)) return false;
  if (DATE_LABEL.test(line.text) && TIME_LABEL.test(line.text)) return false;
  if (DATE_LABEL.test(line.text) && !FUEL_LINE.test(line.text)) return false;

  if (FUEL_LINE.test(line.text) || FUEL_UNIT_PRICE.test(line.text)) return true;
  if (hasInlineLineTotal(line)) return true;

  const amt = trailingAmount(line.text);
  if (amt != null && rightAligned(line, pageW, 0.55)) return false;
  return line.text.trim().length > 1;
}

/** Score name–amount pairing using geometry + numeric likelihood + semantics. */
export function scoreNameAmountPair(
  name: RawLine,
  amount: RawLine,
  pageW: number
): number {
  if (name.index === amount.index) {
    return hasInlineLineTotal(name) ? 1 : 0;
  }
  if (!isAmountCandidate(amount, pageW)) return 0;
  if (hasInlineLineTotal(name) && !AMOUNT_ONLY.test(amount.text)) return 0;
  if (CORPORATE_SUFFIX.test(name.text)) return 0;

  let score = 0.35;

  const vd = verticalDistance(name, amount);
  if (vd <= 35) score += 0.28;
  else if (vd <= 70) score += 0.18;
  else if (vd <= 100) score += 0.08;
  else return 0;

  if (rightAligned(amount, pageW, 0.48)) score += 0.18;
  if (leftAligned(name, pageW, 0.52)) score += 0.12;

  const sameRow = clusterRows([name, amount]).some(
    (row) => row.some((l) => l.index === name.index) && row.some((l) => l.index === amount.index)
  );
  if (sameRow) score += 0.15;

  if (FUEL_LINE.test(name.text) && AMOUNT_ONLY.test(amount.text)) score += 0.35;

  if (FUEL_LINE.test(name.text) || FUEL_UNIT_PRICE.test(name.text)) score += 0.2;

  const nameCenter = bboxCenter(lineBounds(name)).x / pageW;
  const amtCenter = bboxCenter(lineBounds(amount)).x / pageW;
  if (amtCenter - nameCenter > 0.15) score += 0.1;

  return Math.min(1, score);
}

/** Greedy best-match pairing — stable under OCR line reordering when bboxes reflect layout. */
export function matchProductPairs(
  lines: readonly RawLine[],
  pageW: number
): LinePair[] {
  const names = lines.filter((l) => isNameCandidate(l, pageW));
  const amounts = lines.filter((l) => isAmountCandidate(l, pageW));

  const candidates: LinePair[] = [];
  for (const name of names) {
    if (hasInlineLineTotal(name)) {
      candidates.push({ name, amount: name, score: 1 });
      continue;
    }
    for (const amount of amounts) {
      const score = scoreNameAmountPair(name, amount, pageW);
      if (score >= 0.45) candidates.push({ name, amount, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const used = new Set<number>();
  const matched: LinePair[] = [];

  for (const pair of candidates) {
    if (used.has(pair.name.index) || used.has(pair.amount.index)) continue;
    used.add(pair.name.index);
    used.add(pair.amount.index);
    matched.push(pair);
  }

  return matched;
}

export function unpairedLines(
  lines: readonly RawLine[],
  pairs: readonly LinePair[]
): RawLine[] {
  const used = new Set<number>();
  for (const p of pairs) {
    used.add(p.name.index);
    used.add(p.amount.index);
  }
  return lines.filter((l) => !used.has(l.index));
}
