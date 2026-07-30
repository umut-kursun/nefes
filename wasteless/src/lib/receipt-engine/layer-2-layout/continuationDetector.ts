import type { LayoutRegion } from "../types/models/layout";
import { isFuelLine } from "../patterns/document";
import { BARCODE_NOISE, HAS_LETTERS, SEPARATOR_NOISE, VAT_STANDALONE } from "./patterns";
import { isAmountOnlyLine } from "./lineUtils";

export function markContinuations(
  lines: string[],
  regions: LayoutRegion[],
  trailingAmounts: Array<number | null>
): boolean[] {
  return lines.map((line, index) => {
    if (regions[index] !== "body") return false;
    if (isFuelLine(line)) return false;
    if (trailingAmounts[index] != null) return false;
    if (isAmountOnlyLine(line)) return false;
    if (VAT_STANDALONE.test(line)) return false;
    if (BARCODE_NOISE.test(line.replace(/\s/g, ""))) return false;
    if (SEPARATOR_NOISE.test(line)) return false;
    if (!HAS_LETTERS.test(line)) return false;
    const nextHasAmount =
      index + 1 < lines.length &&
      regions[index + 1] === "body" &&
      trailingAmounts[index + 1] != null;
    const prevOpen =
      index > 0 &&
      regions[index - 1] === "body" &&
      trailingAmounts[index - 1] == null;
    return nextHasAmount || prevOpen || line.length < 48;
  });
}
