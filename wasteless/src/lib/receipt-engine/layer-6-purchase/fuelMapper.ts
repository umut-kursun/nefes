/**
 * Fuel receipt mapping helpers.
 *
 * Supports liters, TL/L unit price, fuel type, and vehicle plate.
 * Does not invent products outside the PRODUCTS section.
 */

import type { PurchaseLine } from "../types/models/purchase";
import {
  FUEL_UNIT_PRICE,
  SOLD_QUANTITY_PATTERN,
  VEHICLE_PLATE,
} from "../document-segmentation/sectionMarkers";
import { parseTrNumber } from "./parsers/parseNumber";

export interface FuelDetailsDraft {
  readonly fuelType: string | null;
  readonly liters: number | null;
  readonly pricePerLiter: number | null;
  readonly plate: string | null;
  readonly pumpNumber: string | null;
}

const FUEL_TYPE =
  /\b(kurşunsuz|kursunsuz|benzin|motorin|dizel|diesel|lpg|euro\s*diesel|gasoline)\b/i;

const PUMP_NO = /\b(?:pompa|pump|tabanca)\s*:?\s*(\d{1,3})\b/i;

export function extractFuelFromProductLines(
  products: readonly PurchaseLine[],
  rawTexts: readonly string[]
): FuelDetailsDraft | null {
  let liters: number | null = null;
  let pricePerLiter: number | null = null;
  let fuelType: string | null = null;
  let plate: string | null = null;
  let pumpNumber: string | null = null;

  const corpus = [
    ...products.flatMap((p) => p.provenance.rawTexts),
    ...rawTexts,
  ].join("\n");

  const plateMatch = corpus.match(VEHICLE_PLATE);
  if (plateMatch) plate = plateMatch[1]!.replace(/\s+/g, " ").trim();

  const pumpMatch = corpus.match(PUMP_NO);
  if (pumpMatch) pumpNumber = pumpMatch[1] ?? null;

  const typeMatch = corpus.match(FUEL_TYPE);
  if (typeMatch) fuelType = typeMatch[1] ?? null;

  for (const product of products) {
    const text = product.provenance.rawTexts.join(" ");
    const sold = text.match(SOLD_QUANTITY_PATTERN);
    if (sold && /lt|l|litre/i.test(sold[2] ?? "")) {
      liters = parseTrNumber(sold[1] ?? "") ?? liters;
      if (sold[3]) {
        pricePerLiter = parseTrNumber(sold[3]) ?? pricePerLiter;
      }
    }
    const unitPrice = text.match(FUEL_UNIT_PRICE);
    if (unitPrice) {
      pricePerLiter = parseTrNumber(unitPrice[1] ?? "") ?? pricePerLiter;
    }
    if (product.unit && /lt|l|litre/i.test(product.unit) && product.quantity != null) {
      liters = product.quantity;
    }
    if (product.unitPrice != null && liters != null) {
      pricePerLiter = product.unitPrice;
    }
  }

  if (liters == null && pricePerLiter == null && !fuelType && !plate) {
    return null;
  }

  return {
    fuelType,
    liters,
    pricePerLiter,
    plate,
    pumpNumber,
  };
}
