import { FOOTER_MARKER, GREETING_MARKER } from "../document-segmentation/sectionMarkers";
import { HEADER_HINT } from "../patterns/neutral";

export interface MerchantCandidate {
  readonly text: string;
  readonly lineIndex: number;
  readonly score: number;
  readonly reasons: readonly string[];
}

const COMPANY_SUFFIX =
  /\b(a\.?\s*[sş]\.?|aş|ltd\.?|limited|tic\.?|ticaret|san\.?|sanayi|market|petrol|akaryakıt|akaryakit|eczane|pharmacy|restaurant|restoran)\b/i;

const ADDRESS_LIKE =
  /\b(mah\.?|mahalle|cad\.?|caddesi|sok\.?|sokak|no\s*:?\s*\d|kat\s*:?\s*\d|ilçe|ilce|istanbul|ankara|izmir)\b/i;

const TAX_ID = /\b(vd\.?|vergi\s*daire|vn\s*:|vkn|tckn)\b/i;

/**
 * Score a header-region line as a merchant candidate.
 * Company names score high; greetings / address / footer score near zero.
 */
export function scoreMerchantLine(
  text: string,
  lineIndex: number
): MerchantCandidate {
  const raw = text.trim();
  const reasons: string[] = [];
  let score = 0.25;

  if (!raw || raw.length < 2) {
    return { text: raw, lineIndex, score: 0, reasons: ["empty"] };
  }

  if (GREETING_MARKER.test(raw)) {
    return {
      text: raw,
      lineIndex,
      score: 0.02,
      reasons: ["greeting"],
    };
  }

  if (FOOTER_MARKER.test(raw) || /^www\.|^http/i.test(raw)) {
    return {
      text: raw,
      lineIndex,
      score: 0,
      reasons: ["footer_or_url"],
    };
  }

  if (ADDRESS_LIKE.test(raw)) {
    score = 0.15;
    reasons.push("address_like");
  }

  if (TAX_ID.test(raw)) {
    score = Math.min(score, 0.2);
    reasons.push("tax_id_line");
  }

  if (COMPANY_SUFFIX.test(raw) || HEADER_HINT.test(raw)) {
    score = Math.max(score, 0.85);
    reasons.push("company_or_org");
  }

  if (/[A-ZÇĞİÖŞÜ]{3,}/.test(raw) && raw.length >= 4 && raw.length <= 48) {
    score = Math.max(score, 0.55);
    reasons.push("caps_brand");
  }

  if (lineIndex === 0) {
    score = Math.min(1, score + 0.1);
    reasons.push("first_line");
  } else if (lineIndex <= 2) {
    score = Math.min(1, score + 0.05);
    reasons.push("early_header");
  }

  return {
    text: raw,
    lineIndex,
    score: Math.max(0, Math.min(1, score)),
    reasons,
  };
}

export function pickBestMerchant(
  lines: readonly { text: string; index: number }[]
): MerchantCandidate | null {
  let best: MerchantCandidate | null = null;
  for (const line of lines) {
    const scored = scoreMerchantLine(line.text, line.index);
    if (!best || scored.score > best.score) best = scored;
  }
  return best;
}
