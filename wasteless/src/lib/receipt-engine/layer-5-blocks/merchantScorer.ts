import type { LayoutLine } from "../types/models/layout";
import type { LineSemanticType, ReceiptSectionKind } from "../types/models/sections";
import {
  ADDRESS_HINT,
  CORPORATE_SUFFIX,
  GREETING_HINT,
  isCorporateName,
  isGreetingLine,
  PHONE_HINT,
  PLATE_HINT,
  truncateMerchantTitle,
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
    if (/^\s*(ep[oö]k|epdk|lisans|license|mersis|ada\s*no)\s*:/i.test(text)) {
      continue;
    }
    if (PLATE_HINT.test(text.replace(/\s/g, ""))) continue;

    let score = 0;
    const reasons: string[] = [];

    if (isGreetingLine(text) || GREETING_HINT.test(text)) {
      score -= 80;
      reasons.push("greeting");
    }
    if (/\b(opet|migros|shell|bim\b|a101|carrefour|toyzz|waikiki|eczane|mepet|metro\s*petrol|metropetrol)\b/i.test(text)) {
      score += 40;
      reasons.push("known_brand");
    }
    if (/\bakaryak[iı]t\b|\bpetrol\b/i.test(text)) {
      score += 70;
      reasons.push("fuel_merchant");
    }
    if (CORPORATE_SUFFIX.test(text) && text.replace(CORPORATE_SUFFIX, "").trim().length < 4) {
      score -= 45;
      reasons.push("suffix_only");
    }
    if (/\bmarket\b/i.test(text) && CORPORATE_SUFFIX.test(text)) {
      score += 20;
      reasons.push("market_corporate");
    }
    if (ADDRESS_HINT.test(text)) {
      score -= 60;
      reasons.push("address");
    }
    if (/\b(restoran|restaurant|gida|gıda|market|eczane|akaryak[iı]t)\b/i.test(text)) {
      score += 25;
      reasons.push("business_type");
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
  if (!best) return null;
  const joined = joinCorporateMerchantLines(headerLines, best.lineIndex) ?? best.text;
  return truncateMerchantTitle(joined);
}

function joinCorporateMerchantLines(
  headerLines: readonly Pick<LayoutLine, "index" | "text" | "lineSemanticType">[],
  startLineIndex: number
): string | null {
  const start = headerLines.find((l) => l.index === startLineIndex);
  if (!start) return null;

  const parts = [start.text.trim()];
  const ordered = [...headerLines].sort((a, b) => a.index - b.index);
  const startPos = ordered.findIndex((l) => l.index === startLineIndex);
  if (startPos < 0) return parts.join(" ");

  for (let i = startPos + 1; i < ordered.length; i++) {
    const line = ordered[i]!;
    const text = line.text.trim();
    if (!text) break;
    if (matchesDate(text) || matchesTime(text) || matchesReceiptNumber(text)) break;
    if (ADDRESS_HINT.test(text) || PHONE_HINT.test(text)) break;
    if (PLATE_HINT.test(text.replace(/\s/g, ""))) break;
    if (CORPORATE_SUFFIX.test(text)) {
      parts.push(text);
      break;
    }
    if (isCorporateName(text) && text.length <= 48) {
      parts.push(text);
      continue;
    }
    break;
  }

  return truncateMerchantTitle(parts.join(" ").replace(/\s+/g, " ").trim());
}

/** Scan all OCR lines when header region is incomplete (common with reorder/noise). */
export function selectBestMerchantFromLines(
  lines: readonly string[]
): string | null {
  const indexed = lines
    .map((text, index) => ({
      index,
      text: text.trim(),
      lineSemanticType: "UnknownLine" as LineSemanticType,
    }))
    .filter((l) => l.text.length >= 3);
  return selectBestMerchant(indexed);
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
