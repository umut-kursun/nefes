/** Logical receipt sections — parsers operate only within their section. */
export type ReceiptSectionKind =
  | "header"
  | "products"
  | "totals"
  | "payments"
  | "vat_summary"
  | "card_slip"
  | "loyalty"
  | "footer";

/** Deterministic parser states — forward-only after totals begins. */
export type DocumentParserState =
  | "HEADER"
  | "PRODUCTS"
  | "TOTALS"
  | "PAYMENTS"
  | "VAT_SUMMARY"
  | "CARD_SLIP"
  | "LOYALTY"
  | "FOOTER"
  | "END";

/** Semantic meaning of a single OCR line — one type per line. */
export type LineSemanticType =
  | "MerchantLine"
  | "AddressLine"
  | "DateLine"
  | "TimeLine"
  | "ReceiptNumberLine"
  | "ProductNameLine"
  | "QuantityLine"
  | "UnitPriceLine"
  | "LineTotalLine"
  | "VatSummaryLine"
  | "PaymentLine"
  | "TotalLine"
  | "SubtotalLine"
  | "ChargeLine"
  | "DiscountLine"
  | "CardSlipLine"
  | "LoyaltyLine"
  | "FuelLine"
  | "FooterLine"
  | "UnknownLine";

export interface ReceiptSection {
  readonly kind: ReceiptSectionKind;
  readonly startLineIndex: number;
  readonly endLineIndex: number;
}

export interface DocumentSegmentation {
  readonly sections: readonly ReceiptSection[];
  readonly sectionByLineIndex: readonly ReceiptSectionKind[];
  readonly lineTypes: readonly LineSemanticType[];
  readonly parserStates: readonly DocumentParserState[];
}
