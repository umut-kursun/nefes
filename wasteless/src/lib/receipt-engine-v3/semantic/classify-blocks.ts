import type { LayoutBlock } from "../types/layout-block";
import type { SemanticBlock, SemanticBlockType, SemanticDocument } from "../types/semantic-block";
import {
  ADDRESS_LABEL,
  CARD_SLIP_LABEL,
  CHARGE_LABEL,
  CORPORATE_SUFFIX,
  DATE_LABEL,
  FUEL_LINE,
  NON_PRODUCT_LABEL,
  PAYMENT_LABEL,
  PHONE_LABEL,
  PLATE_LABEL,
  RECEIPT_NO_LABEL,
  TOTAL_LABEL,
  TIME_LABEL,
  VAT_LABEL,
  WEB_LABEL,
  Z_NO_LABEL,
  trailingAmount,
} from "./patterns";

/** Stage 3 — each block gets exactly one semantic type. */
export function classifySemanticBlocks(
  blocks: readonly LayoutBlock[]
): SemanticDocument {
  const semantic: SemanticBlock[] = blocks.map((block) => ({
    id: `semantic:${block.id}`,
    type: classifyBlock(block),
    source: block,
    text: block.text,
    lineIndices: block.lines.map((l) => l.index),
  }));
  return { blocks: semantic };
}

function classifyBlock(block: LayoutBlock): SemanticBlockType {
  const text = block.text;
  const upper = text.toUpperCase();

  if (CARD_SLIP_LABEL.test(text)) return "POSBlock";
  if (CORPORATE_SUFFIX.test(text) && !NON_PRODUCT_LABEL.test(text)) {
    return "MerchantBlock";
  }
  if (/\bfatura\s*no\b/i.test(text)) return "MetadataBlock";
  if (/\be[\s-]?arsiv\b/i.test(text) && trailingAmount(text) == null) return "MetadataBlock";
  if (RECEIPT_NO_LABEL.test(text) || Z_NO_LABEL.test(text)) return "MetadataBlock";
  if (DATE_LABEL.test(text) && !trailingAmount(text)) return "MetadataBlock";
  if (DATE_LABEL.test(text) && TIME_LABEL.test(text)) {
    const subLines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (subLines.some((l) => trailingAmount(l) != null && !DATE_LABEL.test(l))) {
      return "ProductBlock";
    }
    return "MetadataBlock";
  }
  if (PHONE_LABEL.test(text) || WEB_LABEL.test(text)) return "FooterBlock";
  if (ADDRESS_LABEL.test(text)) return "AddressBlock";
  if (PLATE_LABEL.test(text) && !FUEL_LINE.test(text) && !trailingAmount(text)) {
    return "MetadataBlock";
  }
  if (/\b(eczane|market|restoran|restaurant|cafe|kafe|starbucks|bosch|ispark|taksi|ogs|carrefoursa|macrocenter|a101|bim|sok)\b/i.test(text)) {
    if (/\bNO\s+\d+/i.test(text) || !trailingAmount(text)) {
      return "MerchantBlock";
    }
  }
  if (VAT_LABEL.test(text)) return "VATBlock";
  if (TOTAL_LABEL.test(text)) return "TotalBlock";
  if (PAYMENT_LABEL.test(text)) return "PaymentBlock";
  if (CHARGE_LABEL.test(text)) return "ChargeBlock";
  if (/\b(indirim|iskonto|discount)\b/i.test(text)) return "DiscountBlock";
  if (/\b(kasiyer|kasiyer:)\b/i.test(text)) return "FooterBlock";
  if (NON_PRODUCT_LABEL.test(text)) return "FooterBlock";

  if (FUEL_LINE.test(text)) return "ProductBlock";
  if (/\b(ilac|ürün|urun|ekmek|süt|sut)\b/i.test(text) && trailingAmount(text) != null) {
    return "ProductBlock";
  }
  if (trailingAmount(text) != null && !isFooterKeyword(upper) && !DATE_LABEL.test(text)) {
    return "ProductBlock";
  }

  return "UnknownBlock";
}

function isFooterKeyword(upper: string): boolean {
  return /^(TOPLAM|TOPKDV|KDV|NAKIT|KREDI|ORTAK|POS|FIS|FIŞ)/.test(upper);
}
