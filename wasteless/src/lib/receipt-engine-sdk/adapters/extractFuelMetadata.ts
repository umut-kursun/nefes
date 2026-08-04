import type { ParsedReceipt } from "../types/ParsedReceipt";
import type { PurchaseFuelMetadata } from "@/lib/receipt-engine/types/models/purchase";
import { PLATE_HINT } from "@/lib/receipt-engine/patterns/document";

const FUEL_PRODUCT =
  /\b(motor[iİİI]n|benzin|dizel|diesel|lpg|fuel|akaryak[iı]t)\b/i;

function mapFuelType(name: string): string | null {
  const normalized = name.toLocaleLowerCase("tr-TR");
  if (/motor[iı]n|dizel|diesel/.test(normalized)) return "Motorin";
  if (/benzin/.test(normalized)) return "Benzin";
  if (/lpg/.test(normalized)) return "LPG";
  const m = name.match(FUEL_PRODUCT);
  if (!m?.[1]) return null;
  return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
}

function extractPlateFromText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  for (const line of text.split(/\r?\n/)) {
    const plakaMatch = line.match(/\bplaka\s*:?\s*(.+)$/i);
    if (plakaMatch?.[1]) {
      const plate = plakaMatch[1].match(PLATE_HINT);
      if (plate?.[1]) return plate[1].replace(/\s+/g, " ").trim();
    }
    const spaced = line.match(PLATE_HINT);
    if (spaced?.[1]) return spaced[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

function isFuelProduct(item: ParsedReceipt["products"][number]): boolean {
  return FUEL_PRODUCT.test(item.name);
}

/** Map vision ParsedReceipt fuel signals → PurchaseFuelMetadata. */
export function extractFuelMetadata(
  parsed: ParsedReceipt
): PurchaseFuelMetadata | null {
  const isFuelReceipt = parsed.merchant.category === "FUEL";
  const fuelProduct = parsed.products.find(isFuelProduct);
  if (!isFuelReceipt && !fuelProduct) return null;

  const product = fuelProduct ?? parsed.products[0];
  if (!product) return null;

  const fd = parsed.fuelDetails;
  const rawBlob = [
    parsed.rawText ?? "",
    ...parsed.products.map((p) => p.name),
  ].join("\n");

  const plateNumber =
    fd?.plateNumber?.trim() ||
    extractPlateFromText(rawBlob) ||
    extractPlateFromText(parsed.rawText) ||
    null;

  const fuelType = mapFuelType(product.name);
  const unitIsLiter =
    product.unit != null && product.unit.toUpperCase().startsWith("L");
  const liters =
    fd?.liters ??
    (unitIsLiter && product.quantity != null && product.quantity > 0
      ? product.quantity
      : null);

  let pricePerLiter = fd?.pricePerLiter ?? product.unitPrice ?? null;
  if (
    (pricePerLiter == null || pricePerLiter <= 0) &&
    liters != null &&
    liters > 0 &&
    product.lineTotal != null &&
    product.lineTotal > 0
  ) {
    pricePerLiter = Math.round((product.lineTotal / liters) * 100) / 100;
  }

  if (
    fuelType == null &&
    liters == null &&
    pricePerLiter == null &&
    plateNumber == null
  ) {
    return null;
  }

  return Object.freeze({
    fuelType,
    liters,
    pricePerLiter,
    plateNumber,
    stationName: parsed.merchant.title?.trim() || null,
  });
}
