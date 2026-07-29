import type { DocumentType } from "../types";

const FUEL =
  /\b(litre|litre|lt\b|lpg|benzin|motorin|mazot|akaryakit|akaryakıt|plaka|pompa)\b/i;
const PHARMACY = /\b(eczane|pharmacy|ilac|ilaç|reçete|recete)\b/i;
const RESTAURANT =
  /\b(garson|masa|menu|menü|yemek|restoran|cafe|kafe|fastfood|sandviç|sandvic)\b/i;
const E_ARSIV =
  /\b(e-arşiv|e arşiv|e-arsiv|earsiv|fatura no|vergi dairesi|vkn|tckn)\b/i;
const PDF_INVOICE = /\b(pdf|fatura|invoice|proforma)\b/i;
const BANK =
  /\b(havale|eft|fast|iban|banka|transfer|kart\s*no|pos\s*ref)\b/i;
const SUPERMARKET =
  /\b(file(\s*market)?|migros|a101|bim|sok|şok|carrefour|macrocenter)\b/i;

const SUPERMARKET_HINT =
  "Supermarket receipt: product name | VAT % | line total columns; poşet/kargo/bez çanta are charges (type bag/shipping) not products; default quantity=1 when not shown.";

/**
 * Stage 1 — infer document type from source hint and raw OCR text.
 * Different types may adjust parser strategy downstream.
 */
export function detectDocumentType(
  sourceHint: string,
  rawText: string | null | undefined
): DocumentType {
  if (sourceHint === "bank_screenshot") return "bank_screenshot";

  const text = (rawText ?? "").toLocaleLowerCase("tr-TR");
  if (!text.trim()) return "unknown";

  if (BANK.test(text) && !/\bfis\b|fiş|toplam\s*urun/i.test(text)) {
    return "bank_screenshot";
  }
  if (E_ARSIV.test(text)) return "e_arsiv";
  if (PDF_INVOICE.test(text) && E_ARSIV.test(text)) return "pdf_invoice";
  if (FUEL.test(text)) return "fuel_receipt";
  if (PHARMACY.test(text)) return "pharmacy_receipt";
  if (RESTAURANT.test(text)) return "restaurant_receipt";

  // Narrow thermal-style receipts
  if (/\b(toplam|kdv|nakit|pos|fiş|fis)\b/i.test(text)) {
    return "thermal_receipt";
  }

  return "unknown";
}

export function isSupermarketReceipt(
  rawText: string | null | undefined
): boolean {
  return SUPERMARKET.test((rawText ?? "").toLocaleLowerCase("tr-TR"));
}

export function parserHintForDocument(
  type: DocumentType,
  rawText?: string | null
): string {
  switch (type) {
    case "fuel_receipt":
      return "Fuel receipt: extract liters, price/L, plate, fuel type. Products are fuel only.";
    case "pharmacy_receipt":
      return "Pharmacy receipt: medicine names may be abbreviated; keep dosage in product identity.";
    case "restaurant_receipt":
      return "Restaurant: menu items with quantities; ignore zero-priced bundled sides.";
    case "e_arsiv":
    case "pdf_invoice":
      return "E-invoice: line items in table; charges/discounts at footer.";
    case "bank_screenshot":
      return "Bank transfer screenshot: single payment, no product lines.";
    case "thermal_receipt":
      return isSupermarketReceipt(rawText)
        ? SUPERMARKET_HINT
        : "Standard retail receipt: product name | VAT % | line total; poşet/kargo are charges; quantity=1 when not explicit.";
    default:
      return isSupermarketReceipt(rawText)
        ? SUPERMARKET_HINT
        : "Standard retail receipt.";
  }
}
