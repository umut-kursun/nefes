import type { DocumentSection } from "./types";
import {
  CARD_SLIP_MARKER,
  FOOTER_MARKER,
  LOYALTY_MARKER,
  PAYMENTS_MARKER,
  TOTALS_MARKER,
  VAT_SUMMARY_MARKER,
} from "./sectionMarkers";

/**
 * One-way section state machine.
 *
 * HEADER → PRODUCTS → TOTALS → PAYMENTS → VAT_SUMMARY → CARD_SLIP → LOYALTY → FOOTER → END
 *
 * The machine never returns to PRODUCTS after leaving it.
 */
export type SegmentState = DocumentSection;

const RANK: Record<DocumentSection, number> = {
  HEADER: 0,
  PRODUCTS: 1,
  TOTALS: 2,
  PAYMENTS: 3,
  VAT_SUMMARY: 4,
  CARD_SLIP: 5,
  LOYALTY: 6,
  FOOTER: 7,
  END: 8,
};

function canAdvance(from: DocumentSection, to: DocumentSection): boolean {
  return RANK[to] >= RANK[from];
}

function advance(
  state: DocumentSection,
  next: DocumentSection
): DocumentSection {
  return canAdvance(state, next) ? next : state;
}

export function detectTransitionTarget(
  line: string,
  state: DocumentSection
): DocumentSection | null {
  const text = line.trim();
  if (!text) return null;

  // Footer / card slip / loyalty can appear after payments; detect strongest.
  if (FOOTER_MARKER.test(text) && state !== "HEADER" && state !== "PRODUCTS") {
    return "FOOTER";
  }
  if (CARD_SLIP_MARKER.test(text) && RANK[state] >= RANK.TOTALS) {
    return "CARD_SLIP";
  }
  if (LOYALTY_MARKER.test(text) && RANK[state] >= RANK.TOTALS) {
    return "LOYALTY";
  }
  if (VAT_SUMMARY_MARKER.test(text) && RANK[state] >= RANK.TOTALS) {
    // Inline product VAT like "%1" is not a summary; require kdv/matrah style.
    if (/\bkdv\b|\bmatrah\b|^vat\b/i.test(text) || /kdv/i.test(text)) {
      return "VAT_SUMMARY";
    }
  }
  if (PAYMENTS_MARKER.test(text) && RANK[state] >= RANK.PRODUCTS) {
    return "PAYMENTS";
  }
  if (TOTALS_MARKER.test(text) && RANK[state] >= RANK.PRODUCTS) {
    return "TOTALS";
  }
  return null;
}

export function nextSectionState(
  state: DocumentSection,
  line: string
): DocumentSection {
  const target = detectTransitionTarget(line, state);
  if (!target) return state;
  return advance(state, target);
}

/**
 * Detect first PRODUCTS line: money + letters, before any totals marker.
 */
export function looksLikeProductStart(line: string): boolean {
  if (TOTALS_MARKER.test(line) || PAYMENTS_MARKER.test(line)) return false;
  if (FOOTER_MARKER.test(line) || CARD_SLIP_MARKER.test(line)) return false;
  return (
    /(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})\s*(?:tl|₺)?$/i.test(
      line
    ) && /[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(line)
  );
}
