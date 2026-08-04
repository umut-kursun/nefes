import { normalizeKey } from "@/lib/merchants";
import { cleanProductName } from "@/lib/product-name-cleaner";
import {
  normalizeMeasureForPricing,
  normalizeProductName,
  parsePackSize,
  type PackUnit,
} from "@/lib/products";

export type BaseUnit = "L" | "kg" | "ad";

export interface ItemMetricsInput {
  readonly name: string;
  readonly quantity?: number;
  readonly unitPrice?: number;
  readonly lineTotal: number;
  readonly unit?: string | null;
}

export interface NormalizedItemMetrics {
  readonly baseUnit: BaseUnit;
  readonly normalizedUnitPrice: number;
  readonly variantSize: string | null;
  readonly productKey: string;
  readonly cleanedName: string;
}

const WEIGHT_UNITS = new Set(["g", "gr", "gram", "kg"]);
const VOLUME_UNITS = new Set(["ml", "cc", "cl", "l", "lt", "litre", "liter"]);
const PIECE_UNITS = new Set(["ad", "adet", "paket", "pk"]);

function parseUnitToken(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const u = unit.trim().toLocaleLowerCase("tr-TR");
  return u || null;
}

function isWeightUnit(unit: string): boolean {
  return WEIGHT_UNITS.has(unit);
}

function isVolumeUnit(unit: string): boolean {
  return VOLUME_UNITS.has(unit);
}

function isPieceUnit(unit: string): boolean {
  return PIECE_UNITS.has(unit);
}

function toPackUnit(unit: string): PackUnit {
  if (unit === "ml" || unit === "cc" || unit === "cl") return "ml";
  if (unit === "l" || unit === "lt" || unit === "litre" || unit === "liter") return "l";
  if (unit === "kg") return "kg";
  if (unit === "g" || unit === "gr" || unit === "gram") return "g";
  return "adet";
}

function formatVariantSize(amount: number, unit: PackUnit): string {
  if (unit === "l") {
    const text = Number.isInteger(amount) ? String(amount) : String(amount).replace(".", ",");
    return `${text}L`;
  }
  if (unit === "ml") return `${amount}ml`;
  if (unit === "kg") {
    const text = Number.isInteger(amount) ? String(amount) : String(amount).replace(".", ",");
    return `${text}kg`;
  }
  if (unit === "g") return `${amount}g`;
  return `${amount} ad`;
}

function weightedQuantityFromName(name: string): boolean {
  return /\bkg\b/i.test(name);
}

function inferWeightedKgQuantity(quantity: number, name: string, explicitUnit: string | null): boolean {
  if (explicitUnit && isWeightUnit(explicitUnit) && explicitUnit !== "kg") return false;
  if (explicitUnit === "kg") return true;
  if (weightedQuantityFromName(name)) return true;
  if (quantity > 0 && quantity < 20 && !Number.isInteger(quantity)) return true;
  return false;
}

function quantityInBaseUnits(
  quantity: number,
  baseUnit: BaseUnit,
  variantAmount: number | null,
  variantUnit: PackUnit | null,
  explicitUnit: string | null,
  name: string
): number {
  if (baseUnit === "ad") {
    return Math.max(quantity, 1);
  }

  if (baseUnit === "kg") {
    if (explicitUnit && isWeightUnit(explicitUnit)) {
      return normalizeMeasureForPricing(quantity, toPackUnit(explicitUnit)).amount;
    }
    if (inferWeightedKgQuantity(quantity, name, explicitUnit)) {
      return quantity;
    }
    if (variantAmount != null && variantUnit && variantUnit !== "adet") {
      const perItem = normalizeMeasureForPricing(variantAmount, variantUnit).amount;
      return perItem * Math.max(quantity, 1);
    }
    return quantity;
  }

  // volume → litres
  if (explicitUnit && isVolumeUnit(explicitUnit)) {
    return normalizeMeasureForPricing(quantity, toPackUnit(explicitUnit)).amount;
  }
  if (variantAmount != null && variantUnit && (variantUnit === "ml" || variantUnit === "l")) {
    const perItem = normalizeMeasureForPricing(variantAmount, variantUnit).amount;
    return perItem * Math.max(quantity, 1);
  }
  return quantity;
}

function resolveBaseUnit(
  explicitUnit: string | null,
  variantUnit: PackUnit | null,
  quantity: number,
  name: string
): BaseUnit {
  if (explicitUnit) {
    if (isVolumeUnit(explicitUnit)) return "L";
    if (isWeightUnit(explicitUnit)) return "kg";
    if (isPieceUnit(explicitUnit)) return "ad";
  }
  if (variantUnit === "ml" || variantUnit === "l") return "L";
  if (variantUnit === "g" || variantUnit === "kg") return "kg";
  if (inferWeightedKgQuantity(quantity, name, explicitUnit)) return "kg";
  return "ad";
}

function buildProductKey(cleanedName: string, variantSize: string | null): string {
  const canonical = normalizeProductName(cleanedName) || cleanedName;
  const sized = variantSize ? `${canonical} ${variantSize}` : canonical;
  return normalizeKey(sized);
}

/**
 * Normalize receipt line metrics to comparable base units (TL/L, TL/kg, TL/ad).
 */
export function normalizeItemMetrics(input: ItemMetricsInput): NormalizedItemMetrics {
  const cleanedName = cleanProductName(input.name) || input.name.trim();
  const quantity = input.quantity ?? 1;
  const lineTotal = input.lineTotal;
  const explicitUnit = parseUnitToken(input.unit ?? null);
  const pack = parsePackSize(cleanedName) ?? parsePackSize(input.name);
  const variantSize = pack ? formatVariantSize(pack.amount, pack.unit) : null;
  const baseUnit = resolveBaseUnit(explicitUnit, pack?.unit ?? null, quantity, cleanedName);
  const baseQty = quantityInBaseUnits(
    quantity,
    baseUnit,
    pack?.amount ?? null,
    pack?.unit ?? null,
    explicitUnit,
    cleanedName
  );
  const safeQty = baseQty > 0 ? baseQty : 1;
  const normalizedUnitPrice = Math.round((lineTotal / safeQty) * 100) / 100;

  return Object.freeze({
    baseUnit,
    normalizedUnitPrice,
    variantSize,
    productKey: buildProductKey(cleanedName, variantSize),
    cleanedName,
  });
}
