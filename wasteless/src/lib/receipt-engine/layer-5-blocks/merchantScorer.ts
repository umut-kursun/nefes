import type { LayoutLine } from "../types/models/layout";
import type { LineSemanticType, ReceiptSectionKind } from "../types/models/sections";
import {
  ADDRESS_HINT,
  CORPORATE_SUFFIX,
  GREETING_HINT,
  isCorporateName,
  isGreetingLine,
  PHONE_HINT,
} from "../patterns/document";
import { HAS_LETTERS } from "../patterns/neutral";
import { matchesDate, matchesReceiptNumber, matchesTime } from "../patterns/neutral";

export interface MerchantCandidate {
  readonly lineIndex: number;
  readonly text: string;
  readonly score: number;
  readonly reasons: readonly string[];
}

/** Score header lines for merchant identity — prefer business names over greetings. */
export function scoreMerchantCandidates(
  headerLines: readonly Pick<LayoutLine, "index" | "text" | "lineSemanticType">[]
): MerchantCandidate[] {
  const candidates: MerchantCandidate[] = [];

  for (const line of headerLines) {
    const text = line.text.trim();
    if (!text || text.length < 2) continue;
    if (line.lineSemanticType === "DateLine") continue;
    if (line.lineSemanticType === "TimeLine") continue;
    if (line.lineSemanticType === "ReceiptNumberLine") continue;
    if (matchesDate(text) || matchesTime(text) || matchesReceiptNumber(text)) continue;

    let score = 0;
    const reasons: string[] = [];

    if (isGreetingLine(text) || GREETING_HINT.test(text)) {
      score -= 60;
      reasons.push("greeting");
    }
    if (ADDRESS_HINT.test(text)) {
      score -= 25;
      reasons.push("address");
    }
    if (PHONE_HINT.test(text)) {
      score -= 30;
      reasons.push("phone");
    }
    if (CORPORATE_SUFFIX.test(text)) {
      score += 45;
      reasons.push("corporate_suffix");
    }
    if (isCorporateName(text)) {
      score += 25;
      reasons.push("corporate_format");
    }
    if (HAS_LETTERS.test(text) && text.length >= 4) {
      score += 10;
      reasons.push("has_letters");
    }
    if (/^\d/.test(text)) {
      score -= 40;
      reasons.push("starts_with_digit");
    }
    if (line.lineSemanticType === "MerchantLine") {
      score += 15;
      reasons.push("merchant_line_type");
    }

    candidates.push(
      Object.freeze({
        lineIndex: line.index,
        text,
        score,
        reasons: Object.freeze(reasons),
      })
    );
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export function selectBestMerchant(
  headerLines: readonly Pick<LayoutLine, "index" | "text" | "lineSemanticType">[]
): string | null {
  const ranked = scoreMerchantCandidates(headerLines);
  const best = ranked.find((c) => c.score > 0);
  return best?.text ?? ranked[0]?.text ?? null;
}

export function sectionOfLine(
  segmentation: { sectionByLineIndex: readonly ReceiptSectionKind[] },
  lineIndex: number
): ReceiptSectionKind | null {
  return segmentation.sectionByLineIndex[lineIndex] ?? null;
}

export function lineTypeOfLine(
  segmentation: { lineTypes: readonly LineSemanticType[] },
  lineIndex: number
): LineSemanticType | null {
  return segmentation.lineTypes[lineIndex] ?? null;
}
