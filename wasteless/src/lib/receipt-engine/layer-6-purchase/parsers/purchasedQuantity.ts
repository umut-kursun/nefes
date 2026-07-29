/**
 * Purchased quantity vs package attributes.
 *
 * Package sizes (150 GR, 330 ML, 1 L) are product attributes — never
 * purchased quantity. Purchased qty only from explicit expressions
 * (x2, 2 ADET) or sold-by-weight / dispensed fuel patterns.
 */

import {
  EXPLICIT_PURCHASE_QTY,
  PACKAGE_ATTRIBUTE,
  SOLD_QUANTITY_PATTERN,
} from "../../document-segmentation/sectionMarkers";
import { parseTrNumber } from "./parseNumber";
import { parseUnit } from "./unitParser";

export interface PurchasedQuantity {
  readonly raw: string;
  readonly value?: number;
  readonly unit?: string;
  readonly kind: "explicit" | "sold_weight" | "none";
}

export function extractPurchasedQuantity(text: string): PurchasedQuantity {
  const raw = text.trim();
  if (!raw) return { raw: text, kind: "none" };

  const sold = raw.match(SOLD_QUANTITY_PATTERN);
  if (sold) {
    const value = parseTrNumber(sold[1] ?? "");
    const unitRaw = sold[2];
    const unit = unitRaw ? parseUnit(unitRaw).normalized : undefined;
    return {
      raw: sold[0]!,
      ...(value !== undefined ? { value } : {}),
      ...(unit ? { unit } : {}),
      kind: "sold_weight",
    };
  }

  const explicit = raw.match(EXPLICIT_PURCHASE_QTY);
  if (explicit) {
    const num = explicit[1] ?? explicit[2] ?? explicit[3];
    const value = parseTrNumber(num ?? "");
    return {
      raw: explicit[0]!.trim(),
      ...(value !== undefined ? { value } : {}),
      unit: explicit[2] ? "adet" : undefined,
      kind: "explicit",
    };
  }

  return { raw, kind: "none" };
}

export function extractPackageAttribute(
  text: string
): { raw: string; value?: number; unit?: string } | null {
  const raw = text.trim();
  // Do not treat sold-weight as mere package attribute.
  if (SOLD_QUANTITY_PATTERN.test(raw)) return null;
  const m = raw.match(PACKAGE_ATTRIBUTE);
  if (!m) return null;
  const value = parseTrNumber(m[1] ?? "");
  const unit = m[2] ? parseUnit(m[2]).normalized : undefined;
  return {
    raw: m[0]!,
    ...(value !== undefined ? { value } : {}),
    ...(unit ? { unit } : {}),
  };
}

/** Token to store on layout for graph quantity nodes — purchased only. */
export function purchasedQuantityToken(text: string): string | null {
  const q = extractPurchasedQuantity(text);
  if (q.kind === "none") return null;
  return q.raw;
}

/** Unit price embedded in sold-weight / dispensed patterns (`N kg x 89,90`). */
export function extractSoldUnitPrice(
  text: string
): { amount: number; raw: string } | undefined {
  const sold = text.match(SOLD_QUANTITY_PATTERN);
  if (!sold?.[3]) return undefined;
  const amount = parseTrNumber(sold[3]);
  if (amount === undefined) return undefined;
  return { amount, raw: sold[3]! };
}
