import type { RawLine } from "../types/raw-line";
import { AMOUNT_ONLY, FUEL_LINE, trailingAmount } from "../semantic/patterns";

export type BBox = { x: number; y: number; w: number; h: number };

const DEFAULT_LINE_HEIGHT = 28;
const DEFAULT_CHAR_WIDTH = 9;
const PAGE_WIDTH = 320;
const LEFT_MARGIN = 12;
const RIGHT_MARGIN = 12;

/** Column-aware synthetic bbox when OCR does not supply coordinates. */
export function syntheticBBoxForLine(line: RawLine, lineHeight = DEFAULT_LINE_HEIGHT): BBox {
  const y = line.index * (lineHeight + 6);
  const w = Math.min(
    PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN,
    Math.max(40, line.text.length * DEFAULT_CHAR_WIDTH)
  );

  if (AMOUNT_ONLY.test(line.text)) {
    return { x: PAGE_WIDTH - w - RIGHT_MARGIN, y, w, h: lineHeight };
  }

  if (FUEL_LINE.test(line.text)) {
    return { x: LEFT_MARGIN, y, w: Math.min(w, PAGE_WIDTH * 0.62), h: lineHeight };
  }

  const trailing = trailingAmount(line.text);
  if (trailing != null && /\d,\d{2}\s*$/.test(line.text.trim())) {
    return { x: LEFT_MARGIN, y, w, h: lineHeight };
  }

  return { x: LEFT_MARGIN, y, w, h: lineHeight };
}

export function lineBounds(line: RawLine): BBox {
  return line.bbox ?? syntheticBBoxForLine(line);
}

export function bboxCenter(b: BBox): { x: number; y: number } {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

export function pageWidth(lines: readonly RawLine[]): number {
  let max = PAGE_WIDTH;
  for (const line of lines) {
    const b = lineBounds(line);
    max = Math.max(max, b.x + b.w);
  }
  return max;
}

export function median(values: number[]): number {
  if (values.length === 0) return DEFAULT_LINE_HEIGHT;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Cluster OCR lines into horizontal rows by Y center (order-independent). */
export function clusterRows(
  lines: readonly RawLine[],
  gapRatio = 0.55
): RawLine[][] {
  const sorted = [...lines].sort(
    (a, b) => bboxCenter(lineBounds(a)).y - bboxCenter(lineBounds(b)).y
  );
  const heights = sorted.map((l) => lineBounds(l).h);
  const rowGap = median(heights) * gapRatio;

  const rows: RawLine[][] = [];
  let current: RawLine[] = [];
  let anchorY = -Infinity;

  for (const line of sorted) {
    const cy = bboxCenter(lineBounds(line)).y;
    if (current.length === 0 || Math.abs(cy - anchorY) <= rowGap) {
      current.push(line);
      anchorY = current.length === 1 ? cy : (anchorY + cy) / 2;
    } else {
      rows.push(sortRowByX(current));
      current = [line];
      anchorY = cy;
    }
  }
  if (current.length) rows.push(sortRowByX(current));
  return rows;
}

function sortRowByX(row: RawLine[]): RawLine[] {
  return [...row].sort(
    (a, b) => bboxCenter(lineBounds(a)).x - bboxCenter(lineBounds(b)).x
  );
}

export function rightAligned(line: RawLine, pageW: number, threshold = 0.52): boolean {
  const c = bboxCenter(lineBounds(line));
  return c.x / pageW >= threshold;
}

export function leftAligned(line: RawLine, pageW: number, threshold = 0.48): boolean {
  const b = lineBounds(line);
  return b.x / pageW <= threshold;
}

export function verticalDistance(a: RawLine, b: RawLine): number {
  return Math.abs(bboxCenter(lineBounds(a)).y - bboxCenter(lineBounds(b)).y);
}

export function assignSyntheticBBoxes(lines: readonly RawLine[]): RawLine[] {
  return lines.map((line) => ({
    ...line,
    bbox: line.bbox ?? syntheticBBoxForLine(line),
  }));
}

/** Split a row into left (name) and right (amount) columns when spatially separated. */
export function splitRowColumns(
  row: readonly RawLine[],
  pageW: number
): { left: RawLine[]; right: RawLine[] } {
  const mid = pageW * 0.52;
  const left: RawLine[] = [];
  const right: RawLine[] = [];
  for (const line of row) {
    const c = bboxCenter(lineBounds(line)).x;
    if (c >= mid) right.push(line);
    else left.push(line);
  }
  return { left, right };
}
