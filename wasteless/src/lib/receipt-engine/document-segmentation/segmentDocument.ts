import type {
  DocumentSection,
  DocumentSegmentation,
  SegmentedLine,
} from "./types";
import { sectionToCoarseRegion } from "./types";
import {
  looksLikeProductStart,
  nextSectionState,
} from "./sectionStateMachine";
import { TOTALS_MARKER } from "./sectionMarkers";

function emptySectionMap(): Record<DocumentSection, number[]> {
  return {
    HEADER: [],
    PRODUCTS: [],
    TOTALS: [],
    PAYMENTS: [],
    VAT_SUMMARY: [],
    CARD_SLIP: [],
    LOYALTY: [],
    FOOTER: [],
    END: [],
  };
}

/**
 * Segment OCR lines into document sections via a one-way state machine.
 *
 * Flow: HEADER → PRODUCTS → TOTALS → PAYMENTS → … → FOOTER
 * Never returns to PRODUCTS after TOTALS (or later).
 */
export function segmentDocument(lines: readonly string[]): DocumentSegmentation {
  const sections = emptySectionMap();
  const segmented: SegmentedLine[] = [];

  let state: DocumentSection = "HEADER";
  let productsEndIndex = lines.length;
  let enteredProducts = false;

  for (let i = 0; i < lines.length; i++) {
    const text = (lines[i] ?? "").trim();
    if (!text) {
      const section = state === "HEADER" ? "HEADER" : state;
      const line: SegmentedLine = {
        index: i,
        text: lines[i] ?? "",
        section,
        region: sectionToCoarseRegion(section),
      };
      segmented.push(line);
      sections[section].push(i);
      continue;
    }

    // Transition HEADER → PRODUCTS on first product-like line.
    if (state === "HEADER" && looksLikeProductStart(text)) {
      state = "PRODUCTS";
      enteredProducts = true;
    }

    // Apply marker-driven transitions (one-way).
    const before = state;
    state = nextSectionState(state, text);

    // First time we leave PRODUCTS for TOTALS+, freeze products end.
    if (
      enteredProducts &&
      before === "PRODUCTS" &&
      state !== "PRODUCTS" &&
      productsEndIndex === lines.length
    ) {
      productsEndIndex = i;
    }

    // If totals marker appears while still in HEADER (no products), jump.
    if (state === "HEADER" && TOTALS_MARKER.test(text)) {
      state = "TOTALS";
      productsEndIndex = Math.min(productsEndIndex, i);
    }

    const line: SegmentedLine = {
      index: i,
      text: lines[i] ?? text,
      section: state,
      region: sectionToCoarseRegion(state),
    };
    segmented.push(line);
    sections[state].push(i);
  }

  return {
    lines: Object.freeze(segmented),
    sections: Object.freeze(
      Object.fromEntries(
        Object.entries(sections).map(([k, v]) => [k, Object.freeze([...v])])
      ) as Record<DocumentSection, readonly number[]>
    ),
    productsEndIndex,
  };
}
