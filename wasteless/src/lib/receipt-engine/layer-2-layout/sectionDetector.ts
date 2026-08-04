import type {
  DocumentParserState,
  DocumentSegmentation,
  LineSemanticType,
  ReceiptSection,
  ReceiptSectionKind,
} from "../types/models/sections";
import type { LayoutRegion } from "../types/models/layout";
import {
  matchesCharge,
  matchesDate,
  matchesDiscount,
  matchesPayment,
  matchesReceiptNumber,
  matchesSubtotal,
  matchesTime,
  matchesTotal,
  matchesVatLabel,
  HAS_LETTERS,
} from "../patterns/neutral";
import {
  isCardSlipLine,
  isFuelLine,
  isGreetingLine,
  LEGAL_FOOTER_HINT,
  TOPKDV_HINT,
  WEB_FOOTER_HINT,
} from "../patterns/document";
import { isAmountOnlyLine } from "./lineUtils";

function sectionKindForState(state: DocumentParserState): ReceiptSectionKind {
  switch (state) {
    case "HEADER":
      return "header";
    case "PRODUCTS":
      return "products";
    case "TOTALS":
      return "totals";
    case "PAYMENTS":
      return "payments";
    case "VAT_SUMMARY":
      return "vat_summary";
    case "CARD_SLIP":
      return "card_slip";
    case "LOYALTY":
      return "loyalty";
    case "FOOTER":
    case "END":
      return "footer";
    default:
      return "footer";
  }
}

function isProductLikeLine(text: string): boolean {
  if (!text.trim()) return false;
  if (isFuelLine(text)) return true;
  if (matchesTotal(text) || matchesSubtotal(text)) return false;
  if (matchesPayment(text) || matchesVatLabel(text)) return false;
  if (matchesCharge(text) || matchesDiscount(text)) return false;
  if (isCardSlipLine(text)) return false;
  if (TOPKDV_HINT.test(text)) return false;
  if (isAmountOnlyLine(text)) return false;
  return HAS_LETTERS.test(text) && /(\d+[,.]\d{2})\s*(?:tl|₺)?$/i.test(text);
}

function classifyLineSection(
  text: string,
  region: LayoutRegion,
  state: DocumentParserState,
  totalsSeen: boolean
): { section: ReceiptSectionKind; nextState: DocumentParserState } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { section: sectionKindForState(state), nextState: state };
  }

  if (region === "header") {
    return { section: "header", nextState: "HEADER" };
  }

  if (TOPKDV_HINT.test(trimmed) || (matchesVatLabel(trimmed) && totalsSeen)) {
    return { section: "vat_summary", nextState: "VAT_SUMMARY" };
  }

  if (matchesPayment(trimmed)) {
    return { section: "payments", nextState: "PAYMENTS" };
  }

  if (isCardSlipLine(trimmed)) {
    return { section: "card_slip", nextState: totalsSeen ? "CARD_SLIP" : "CARD_SLIP" };
  }

  if (matchesTotal(trimmed) || matchesSubtotal(trimmed)) {
    return { section: "totals", nextState: "TOTALS" };
  }

  if (matchesDiscount(trimmed)) {
    return { section: totalsSeen ? "totals" : "products", nextState: totalsSeen ? "TOTALS" : state };
  }

  if (matchesCharge(trimmed)) {
    return { section: totalsSeen ? "totals" : "products", nextState: totalsSeen ? "TOTALS" : state };
  }

  if (WEB_FOOTER_HINT.test(trimmed) || LEGAL_FOOTER_HINT.test(trimmed)) {
    return { section: "footer", nextState: "FOOTER" };
  }

  if (totalsSeen) {
    if (matchesVatLabel(trimmed)) {
      return { section: "vat_summary", nextState: "VAT_SUMMARY" };
    }
    if (region === "footer") {
      return { section: "footer", nextState: "FOOTER" };
    }
    return { section: "totals", nextState: "TOTALS" };
  }

  if (isProductLikeLine(trimmed) || isFuelLine(trimmed)) {
    return { section: "products", nextState: "PRODUCTS" };
  }

  if (region === "footer") {
    return { section: "footer", nextState: "FOOTER" };
  }

  return { section: "products", nextState: state === "HEADER" ? "PRODUCTS" : state };
}

function buildSections(
  sectionByLine: ReceiptSectionKind[]
): ReceiptSection[] {
  if (sectionByLine.length === 0) return [];

  const sections: ReceiptSection[] = [];
  let start = 0;
  let current = sectionByLine[0]!;

  for (let i = 1; i <= sectionByLine.length; i++) {
    const kind = sectionByLine[i];
    if (i === sectionByLine.length || kind !== current) {
      sections.push(
        Object.freeze({
          kind: current,
          startLineIndex: start,
          endLineIndex: i - 1,
        })
      );
      if (i < sectionByLine.length) {
        start = i;
        current = kind!;
      }
    }
  }

  return Object.freeze(sections) as ReceiptSection[];
}

/**
 * Deterministic forward-only state machine for document segmentation.
 * Once TOTALS begins, lines never return to PRODUCTS.
 */
export function segmentDocument(
  lines: readonly string[],
  regions: readonly LayoutRegion[]
): DocumentSegmentation {
  const sectionByLineIndex: ReceiptSectionKind[] = [];
  const parserStates: DocumentParserState[] = [];
  let state: DocumentParserState = "HEADER";
  let totalsSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? "";
    const region = regions[i] ?? "body";

    if (region === "header") {
      state = "HEADER";
    } else if (region === "body" && state === "HEADER") {
      state = "PRODUCTS";
    }

    const { section, nextState } = classifyLineSection(
      text,
      region,
      state,
      totalsSeen
    );

    if (section === "totals" && matchesTotal(text)) {
      totalsSeen = true;
    }
    if (section === "totals" && matchesSubtotal(text)) {
      totalsSeen = true;
    }

    if (totalsSeen && section === "products") {
      sectionByLineIndex.push("totals");
      parserStates.push("TOTALS");
      continue;
    }

    state = totalsSeen && section === "products" ? "TOTALS" : nextState;
    sectionByLineIndex.push(section);
    parserStates.push(state);
  }

  const lineTypes = lines.map((text, index) =>
    inferLineSemanticType(text, sectionByLineIndex[index]!, regions[index] ?? "body")
  );

  return Object.freeze({
    sections: Object.freeze(buildSections(sectionByLineIndex)),
    sectionByLineIndex: Object.freeze(sectionByLineIndex),
    lineTypes: Object.freeze(lineTypes),
    parserStates: Object.freeze(parserStates),
  });
}

function inferLineSemanticType(
  text: string,
  section: ReceiptSectionKind,
  region: LayoutRegion
): LineSemanticType {
  const trimmed = text.trim();
  if (!trimmed) return "UnknownLine";

  if (section === "header") {
    if (matchesDate(trimmed)) return "DateLine";
    if (matchesTime(trimmed)) return "TimeLine";
    if (matchesReceiptNumber(trimmed)) return "ReceiptNumberLine";
    if (isGreetingLine(trimmed)) return "FooterLine";
    if (region === "header" && HAS_LETTERS.test(trimmed)) return "MerchantLine";
    return "AddressLine";
  }

  if (section === "card_slip") return "CardSlipLine";

  if (section === "vat_summary") return "VatSummaryLine";

  if (section === "payments" || matchesPayment(trimmed)) return "PaymentLine";

  if (section === "loyalty") return "LoyaltyLine";

  if (section === "footer") return "FooterLine";

  if (matchesTotal(trimmed)) return "TotalLine";
  if (matchesSubtotal(trimmed)) return "SubtotalLine";
  if (matchesDiscount(trimmed)) return "DiscountLine";
  if (matchesCharge(trimmed)) return "ChargeLine";

  if (section === "products") {
    if (isAmountOnlyLine(trimmed)) return "LineTotalLine";
    if (isFuelLine(trimmed)) return "FuelLine";
    return "ProductNameLine";
  }

  if (section === "totals") {
    if (matchesVatLabel(trimmed)) return "VatSummaryLine";
    if (matchesPayment(trimmed)) return "PaymentLine";
    if (matchesTotal(trimmed)) return "TotalLine";
    if (matchesSubtotal(trimmed)) return "SubtotalLine";
  }

  return "UnknownLine";
}

export function isProductsSection(section: ReceiptSectionKind | undefined): boolean {
  return section === "products";
}

export function isProductLineType(lineType: LineSemanticType | undefined): boolean {
  return lineType === "ProductNameLine" || lineType === "FuelLine";
}

export function isExcludedFromProducts(
  section: ReceiptSectionKind | undefined,
  lineType: LineSemanticType | undefined
): boolean {
  if (!section) return false;
  if (section !== "products") return true;
  if (!lineType) return false;
  return (
    lineType === "PaymentLine" ||
    lineType === "TotalLine" ||
    lineType === "SubtotalLine" ||
    lineType === "VatSummaryLine" ||
    lineType === "ChargeLine" ||
    lineType === "DiscountLine" ||
    lineType === "CardSlipLine" ||
    lineType === "FooterLine" ||
    lineType === "LoyaltyLine"
  );
}
