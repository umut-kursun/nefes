import type { LayoutRegion } from "../types/models/layout";
import { FOOTER_HINT, HAS_LETTERS } from "./patterns";
import { isFuelLine } from "../patterns/document";
import { isAmountOnlyLine } from "./lineUtils";

export function detectFooterStart(lines: string[]): number {
  let inFooter = false;
  let start = lines.length;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    const isFooterLine =
      FOOTER_HINT.test(line) ||
      (isAmountOnlyLine(line) && i >= lines.length - 4);

    if (isFooterLine) {
      inFooter = true;
      start = i;
      continue;
    }

    if (inFooter) break;
  }

  return start;
}

export function detectHeaderEnd(_lines: string[], bodyStart: number): number {
  if (bodyStart <= 0) return -1;
  return bodyStart - 1;
}

export function assignRegions(
  lines: string[],
  footerStart: number,
  headerEnd: number
): LayoutRegion[] {
  return lines.map((_, index) => {
    if (index <= headerEnd) return "header";
    if (index >= footerStart) return "footer";
    return "body";
  });
}

export function buildRegionIndices(regions: LayoutRegion[]): {
  header: number[];
  body: number[];
  footer: number[];
} {
  const header: number[] = [];
  const body: number[] = [];
  const footer: number[] = [];
  regions.forEach((region, index) => {
    if (region === "header") header.push(index);
    else if (region === "footer") footer.push(index);
    else body.push(index);
  });
  return { header, body, footer };
}

export function findBodyStart(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FOOTER_HINT.test(line)) break;
    if (isAmountOnlyLine(line)) continue;
    if (isFuelLine(line)) return i;
    if (/(\d+[,.]\d{2})\s*(?:tl|₺)?$/i.test(line) && HAS_LETTERS.test(line)) {
      return i;
    }
  }
  return Math.min(3, lines.length);
}
