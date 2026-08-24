import {
  isPollutedProductName,
  PRODUCT_POLLUTION_PATTERN,
} from "@/lib/receipt-accuracy-contract/patterns";
import { tokenizeLine } from "../tokenizer/tokenizeReceiptLines";
import { LineKind } from "../tokenizer/LineKind";
import {
  AMOUNT_ONLY_LINE,
  BARE_AMOUNT_LINE,
  CARD_METADATA,
  CHARGE_LINE,
  DATE_ONLY_LINE,
  DISCOUNT_SECTION,
  extractTrailingAmount,
  FUEL_PRODUCT,
  FUEL_QTY_LINE,
  HEADER_METADATA,
  PAYMENT_METHOD,
  PLATE_LINE,
  TOTAL_LABEL,
  VAT_LABEL,
  VAT_ONLY_LINE,
} from "./linePatterns";
import { LineRole, type RoleAnnotatedLine } from "./LineRole";

export { LineRole, type RoleAnnotatedLine } from "./LineRole";

/** Category/summary labels — not products when other item lines exist on the receipt. */
export const CATEGORY_SUBTOTAL_LABEL =
  /^(?:Y[İI]YECEK(?:\s*\/\s*İÇECEK)?|İÇECEK|ICECEK|YEMEK|İÇKI|GIDA|TÜRK\s*KAHVESI)\b/i;

function isFooterZoneLine(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (VAT_LABEL.test(trimmed)) return true;
  if (TOTAL_LABEL.test(trimmed) && !isProductLikeTotalLine(trimmed)) return true;
  if (DISCOUNT_SECTION.test(trimmed)) return true;
  if (PAYMENT_METHOD.test(trimmed) && !/\*\d/.test(trimmed)) return true;
  if (CARD_METADATA.test(trimmed)) return true;
  if (/^\s*(?:SATIŞ|TUTAR|ONAY\s*KODU|AİD:|VISA|MASTERCARD)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

function isProductLikeTotalLine(raw: string): boolean {
  return (
    /[A-Za-zÇĞİÖŞÜ]{4,}/.test(raw) &&
    /\*\d/.test(raw) &&
    !TOTAL_LABEL.test((raw.split("*")[0] ?? "").trim())
  );
}

function isLineMetadataOrHeader(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (DATE_ONLY_LINE.test(trimmed)) return true;
  if (HEADER_METADATA.test(trimmed) && !/\*\d/.test(trimmed)) return true;
  if (PRODUCT_POLLUTION_PATTERN.test(trimmed)) return true;
  if (isPollutedProductName(trimmed)) return true;
  if (/^(?:MIGROS|FILE\s*MARKET|PETROL\s*OF[İI]S[İI])\b/i.test(trimmed) && !/\*\d/.test(trimmed)) {
    return true;
  }
  if (/(?:LTD\.?\s*[ŞS]T[İI]|A\.[ŞS]\.|T[İI]CARET\s+(?:LTD|A\.Ş))/i.test(trimmed)) {
    return true;
  }
  if (/(?:ŞUBES[İI]|SATIŞ\s*MAĞAZASI|MAĞAZACILIK)/i.test(trimmed)) return true;
  if (/^(?:SAAT|F[İI][ŞS]\s*NO|FIS\s*NO)\b/i.test(trimmed)) return true;
  return false;
}

function stripProductName(raw: string): string {
  return raw
    .replace(/\*[\d.,\-]+/g, "")
    .replace(/\s*%\s*\d+(?:[.,]\d+)?\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCategorySubtotalOnly(raw: string): boolean {
  const namePart = stripProductName(raw);
  if (!CATEGORY_SUBTOTAL_LABEL.test(namePart)) return false;
  const remainder = namePart
    .replace(CATEGORY_SUBTOTAL_LABEL, "")
    .replace(/%\s*\d+(?:[.,]\d+)?/g, "")
    .trim();
  return remainder.length < 3;
}

function hasPriceEvidence(raw: string): boolean {
  return extractTrailingAmount(raw) != null || BARE_AMOUNT_LINE.test(raw.trim());
}

function isCredibleProductNameLine(raw: string): boolean {
  const namePart = stripProductName(raw);
  if (namePart.length < 2) return false;
  if (isPollutedProductName(namePart)) return false;
  if (VAT_ONLY_LINE.test(namePart)) return false;
  if (BARE_AMOUNT_LINE.test(raw.trim())) return false;
  if (AMOUNT_ONLY_LINE.test(raw.trim())) return false;
  if (/^\d+$/.test(namePart)) return false;
  return /[A-Za-zÇĞİÖŞÜ]{2,}/.test(namePart);
}

function countSpecificBodyCandidates(
  lines: readonly string[],
  footerStartIndex: number
): number {
  let count = 0;
  for (let i = 0; i < footerStartIndex; i++) {
    const raw = (lines[i] ?? "").trim();
    if (!raw || isLineMetadataOrHeader(raw)) continue;
    if (isCategorySubtotalOnly(raw)) continue;
    if (hasPriceEvidence(raw) || FUEL_PRODUCT.test(raw) || FUEL_QTY_LINE.test(raw)) {
      count++;
      continue;
    }
    if (isCredibleProductNameLine(raw)) count++;
  }
  return count;
}

function isMerchantBannerCandidate(raw: string, index: number): boolean {
  if (index > 4) return false;
  if (hasPriceEvidence(raw)) return false;
  if (/(?:LTD|A\.Ş|T[İI]CARET\s+(?:LTD|A\.Ş))/i.test(raw)) return true;
  if (/(?:ŞUBES[İI]|SATIŞ\s*MAĞAZASI)/i.test(raw)) return true;
  if (index === 0 && /[A-Za-zÇĞİÖŞÜ]{4,}/.test(raw) && !/%\s*\d/.test(raw)) {
    return true;
  }
  return false;
}

function isMerchantBannerLine(
  raw: string,
  index: number,
  lines: readonly string[]
): boolean {
  for (let j = 0; j < index; j++) {
    const prior = (lines[j] ?? "").trim();
    if (!prior) continue;
    if (!isLineMetadataOrHeader(prior) && !isMerchantBannerCandidate(prior, j)) {
      return false;
    }
  }
  return isMerchantBannerCandidate(raw, index);
}

function findFirstBodyLineIndex(
  lines: readonly string[],
  footerStartIndex: number
): number {
  for (let i = 0; i < footerStartIndex; i++) {
    const raw = (lines[i] ?? "").trim();
    if (!raw || isLineMetadataOrHeader(raw)) continue;
    if (VAT_ONLY_LINE.test(raw)) continue;
    if (BARE_AMOUNT_LINE.test(raw)) return i;
    if (hasPriceEvidence(raw) && !isCategorySubtotalOnly(raw)) return i;
    if (FUEL_PRODUCT.test(raw)) return i;
    if (CHARGE_LINE.test(raw) && hasPriceEvidence(raw)) return i;
    if (
      isCredibleProductNameLine(raw) &&
      !isMerchantBannerLine(raw, i, lines)
    ) {
      return i;
    }
  }
  return footerStartIndex;
}

function classifyPreBodyLine(
  raw: string,
  index: number
): LineRole {
  if (isMerchantBannerCandidate(raw, index)) return LineRole.MerchantHeader;
  if (isLineMetadataOrHeader(raw)) {
    if (/(?:A\.[ŞS]\.|LTD|T[İI]CARET|MARKET|PETROL|RESTORAN|CAFE|KAHVE)/i.test(raw)) {
      return LineRole.MerchantHeader;
    }
    return LineRole.Metadata;
  }
  return LineRole.Metadata;
}

function classifyFooterRole(raw: string): LineRole {
  const trimmed = raw.trim();
  if (VAT_LABEL.test(trimmed)) return LineRole.FooterVat;
  if (TOTAL_LABEL.test(trimmed) && !isProductLikeTotalLine(trimmed)) {
    return LineRole.FooterTotal;
  }
  if (PAYMENT_METHOD.test(trimmed) || CARD_METADATA.test(trimmed)) {
    return LineRole.FooterPayment;
  }
  if (BARE_AMOUNT_LINE.test(trimmed) || AMOUNT_ONLY_LINE.test(trimmed)) {
    return LineRole.Ignore;
  }
  return LineRole.Ignore;
}

function inferBodyRole(
  raw: string,
  specificBodyCount: number
): LineRole {
  const trimmed = raw.trim();
  if (!trimmed) return LineRole.Ignore;

  if (isLineMetadataOrHeader(trimmed)) {
    if (
      /(?:A\.[ŞS]\.|LTD|T[İI]CARET|MARKET|PETROL|RESTORAN|CAFE|KAHVE)/i.test(trimmed) &&
      !PRODUCT_POLLUTION_PATTERN.test(trimmed)
    ) {
      return LineRole.MerchantHeader;
    }
    return LineRole.Metadata;
  }

  if (VAT_ONLY_LINE.test(trimmed)) return LineRole.Ignore;
  if (PLATE_LINE.test(trimmed) && trimmed.length < 25) return LineRole.Metadata;
  if (FUEL_QTY_LINE.test(trimmed)) return LineRole.Metadata;
  if (CHARGE_LINE.test(trimmed) && hasPriceEvidence(trimmed)) {
    return LineRole.BodyProduct;
  }
  if (FUEL_PRODUCT.test(trimmed)) {
    return LineRole.BodyProduct;
  }

  if (isCategorySubtotalOnly(trimmed)) {
    const others = specificBodyCount - 1;
    if (others > 0) return LineRole.CategorySubtotal;
    return LineRole.BodyProduct;
  }

  if (hasPriceEvidence(trimmed) && isCredibleProductNameLine(trimmed)) {
    return LineRole.BodyProduct;
  }
  if (hasPriceEvidence(trimmed) && !isPollutedProductName(stripProductName(trimmed))) {
    const namePart = stripProductName(trimmed);
    if (namePart.length >= 2 && !PRODUCT_POLLUTION_PATTERN.test(namePart)) {
      return LineRole.BodyProduct;
    }
  }

  if (BARE_AMOUNT_LINE.test(trimmed)) {
    return LineRole.BodyProduct;
  }

  if (isCredibleProductNameLine(trimmed)) {
    return LineRole.BodyProduct;
  }

  const token = tokenizeLine(trimmed);
  if (
    token.kind === LineKind.ProductCandidate ||
    token.kind === LineKind.ChargeCandidate ||
    token.kind === LineKind.QuantityDetail
  ) {
    if (isCredibleProductNameLine(trimmed) || hasPriceEvidence(trimmed)) {
      return LineRole.BodyProduct;
    }
  }

  return LineRole.Ignore;
}

/**
 * Authoritative semantic line roles for extraction.
 * Footer boundary aligns with footerFirstPass; body lines require credible product evidence.
 */
export function assignLineRoles(
  lines: readonly string[],
  footerStartIndex: number
): readonly RoleAnnotatedLine[] {
  const bodyStartIndex = findFirstBodyLineIndex(lines, footerStartIndex);
  const specificBodyCount = countSpecificBodyCandidates(lines, footerStartIndex);
  const result: RoleAnnotatedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();

    if (!trimmed) {
      result.push({ index: i, raw, role: LineRole.Ignore });
      continue;
    }

    if (i >= footerStartIndex || isFooterZoneLine(trimmed)) {
      result.push({ index: i, raw, role: classifyFooterRole(trimmed) });
      continue;
    }

    if (i < bodyStartIndex) {
      result.push({ index: i, raw, role: classifyPreBodyLine(trimmed, i) });
      continue;
    }

    result.push({
      index: i,
      raw,
      role: inferBodyRole(trimmed, specificBodyCount),
    });
  }

  return result;
}

export function findBodyProductLineIndices(
  roles: readonly RoleAnnotatedLine[]
): readonly number[] {
  return roles.filter((r) => r.role === LineRole.BodyProduct).map((r) => r.index);
}
