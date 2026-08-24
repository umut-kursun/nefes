import { displayMerchantName } from "@/lib/merchants";
import {
  ADDRESS_LIKE_MERCHANT,
  isPollutedProductName,
  LEGAL_ENTITY_MERCHANT,
} from "@/lib/receipt-accuracy-contract/patterns";
import { assignLineRoles } from "../extraction/assignLineRoles";
import { extractFooterFirst } from "../extraction/footerFirstPass";
import { LineRole } from "../extraction/LineRole";
import { HEADER_METADATA, DATE_ONLY_LINE } from "../extraction/linePatterns";

function isNonMerchantHeaderLine(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (DATE_ONLY_LINE.test(trimmed)) return true;
  if (HEADER_METADATA.test(trimmed) && !/(?:MARKET|MIGROS|PETROL|KAHVE|CAFE|RESTORAN|GIDA|HED[İI]YEL)/i.test(trimmed)) {
    return true;
  }
  if (isPollutedProductName(trimmed)) {
    if (/^(?:MIGROS|BİM|A101|ŞOK|FILE MARKET)$/i.test(trimmed)) return false;
    return true;
  }
  if (/^(?:E-FATURA|B[İI]LG[İI]\s+F[İI][ŞS]|FATURA\s*NO)/i.test(trimmed)) return true;
  if (/(?:T[İI]C\.?\s*S[İI]C|L[İI]SANS\s*NO|EPDK|MERS[İI]S\s*NO|B\.?\s*M[ÜU]KELLEFLER)/i.test(trimmed)) {
    return true;
  }
  return false;
}

const BRAND_TOKEN =
  /(?:MARKET|MIGROS|PETROL|KAHVE|CAFE|GIDA|HED[İI]YEL|T[İI]K[İI]|BEACH|ŞENGÜL|ÇEHRE|ALTIN|FILE|OPET|SHELL|ÖZY[İI]LD[İI]Z)/i;

function scoreMerchantCandidate(name: string, raw: string): number {
  let score = 0;
  if (name.length >= 3 && name.length <= 40) score += 2;
  if (!LEGAL_ENTITY_MERCHANT.test(name)) score += 3;
  if (!ADDRESS_LIKE_MERCHANT.test(name)) score += 2;
  if (!/\d{5,}/.test(name)) score += 1;
  if (/(?:TEL|VD\.|VKN|TCKN|MAH\.|CAD\.)/i.test(name)) score -= 5;
  if (BRAND_TOKEN.test(raw)) score += 4;
  if (/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$/u.test(name) && !BRAND_TOKEN.test(raw)) {
    score -= 3;
  }
  return score;
}

/**
 * Resolve a consumer-facing merchant title from OCR header lines and optional hints.
 * Generalized registry normalization — not receipt-specific patches.
 */
export function resolveMerchantFromLines(
  lines: readonly string[],
  hints: {
    rawVisionName?: string | null;
    merchantOverride?: string | null;
  } = {}
): string | null {
  if (hints.merchantOverride?.trim()) {
    return displayMerchantName(hints.merchantOverride);
  }

  const footer = extractFooterFirst(lines);
  const roles = assignLineRoles(lines, footer.footerStartIndex);

  const headerCandidates: string[] = [];
  for (const role of roles) {
    if (role.index >= 12) break;
    if (role.role !== LineRole.MerchantHeader && role.role !== LineRole.Metadata) continue;
    const raw = (lines[role.index] ?? "").trim();
    if (!raw || isNonMerchantHeaderLine(raw)) continue;
    if (role.role === LineRole.Metadata && !/(?:MARKET|MIGROS|PETROL|KAHVE|CAFE|GIDA|HED[İI]YEL|T[İI]K[İI]|BEACH|ŞENGÜL|ÇEHRE|ALTIN)/i.test(raw)) {
      continue;
    }
    headerCandidates.push(raw);
  }

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const raw = (lines[i] ?? "").trim();
    if (!raw || isNonMerchantHeaderLine(raw)) continue;
    if (!headerCandidates.includes(raw)) headerCandidates.unshift(raw);
  }

  let best: { name: string; score: number } | null = null;
  for (const raw of headerCandidates) {
    const normalized = displayMerchantName(raw);
    if (!normalized) continue;
    const score = scoreMerchantCandidate(normalized, raw);
    if (!best || score > best.score) {
      best = { name: normalized, score };
    }
  }

  if (best && best.score >= 4) return best.name;

  if (hints.rawVisionName?.trim()) {
    const fromVision = displayMerchantName(hints.rawVisionName);
    if (fromVision && scoreMerchantCandidate(fromVision, hints.rawVisionName) >= 3) return fromVision;
  }

  return best?.name ?? null;
}
