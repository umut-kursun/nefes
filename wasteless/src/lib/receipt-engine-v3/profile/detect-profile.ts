import type { ReceiptProfile } from "../types";
import type { SemanticDocument } from "../types/semantic-block";
import { CARD_SLIP_LABEL, FUEL_LINE } from "../semantic/patterns";
import { scoreMerchantFingerprints } from "../merchant/knowledge-base";

/** Stage 4 — detect receipt profile before product parsing. */
export function detectReceiptProfile(doc: SemanticDocument): ReceiptProfile {
  const text = doc.blocks.map((b) => b.text).join("\n");
  const lower = text.toLowerCase();
  const fingerprints = scoreMerchantFingerprints(text);

  if (doc.blocks.some((b) => b.type === "POSBlock") || CARD_SLIP_LABEL.test(text)) {
    return "pos-slip";
  }
  if (doc.blocks.some((b) => b.type === "ProductBlock" && FUEL_LINE.test(b.text))) {
    return "fuel";
  }

  const topHint = fingerprints[0]?.profileHint;
  if (topHint && fingerprints[0]!.score >= 0.7) return topHint;

  if (/\b(migros|a101|bim|carrefour|macrocenter|sok|market)\b/i.test(text)) {
    return "market";
  }
  if (/\b(starbucks|cafe|kafe|coffee)\b/i.test(lower)) {
    return "cafe";
  }
  if (/\b(restaurant|restoran|lezzet|yemek)\b/i.test(lower)) {
    return "restaurant";
  }
  if (/\b(e-arşiv|e-arsiv|e-fatura)\b/i.test(lower)) {
    return "e-arsiv";
  }

  const productCount = doc.blocks.filter((b) => b.type === "ProductBlock").length;
  if (productCount >= 2) return "market";

  return productCount > 0 ? "generic" : "unknown";
}
