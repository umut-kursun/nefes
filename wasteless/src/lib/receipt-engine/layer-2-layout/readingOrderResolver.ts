import type { LayoutRegion } from "../types/models/layout";

/** Top-to-bottom order; footer totals keep natural OCR sequence. */
export function resolveReadingOrder(lineCount: number): number[] {
  return Array.from({ length: lineCount }, (_, i) => i);
}

export function regionOrderedIndices(regions: LayoutRegion[]): number[] {
  const header: number[] = [];
  const body: number[] = [];
  const footer: number[] = [];
  regions.forEach((region, index) => {
    if (region === "header") header.push(index);
    else if (region === "footer") footer.push(index);
    else body.push(index);
  });
  return [...header, ...body, ...footer];
}
