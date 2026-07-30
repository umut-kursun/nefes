import { FUEL_QUANTITY_LINE, FUEL_UNIT_PRICE } from "../../patterns/document";
import { parseTrNumber } from "../parsers/parseNumber";

export interface FuelLineFields {
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  lineTotal?: number;
  plate?: string;
}

/** Dedicated fuel receipt line parser — quantity in litres, not purchased count. */
export function parseFuelProductFields(
  label: string,
  lineTotal: number | null,
  unitPriceFromToken: number | null
): FuelLineFields {
  const fields: FuelLineFields = {};

  const qtyMatch = label.match(FUEL_QUANTITY_LINE);
  if (qtyMatch?.[1]) {
    fields.quantity = parseTrNumber(qtyMatch[1]);
    fields.unit = "LT";
  }

  const priceMatch = label.match(FUEL_UNIT_PRICE);
  if (priceMatch?.[1]) {
    fields.unitPrice = parseTrNumber(priceMatch[1]);
  } else if (unitPriceFromToken != null) {
    fields.unitPrice = unitPriceFromToken;
  }

  if (lineTotal != null) {
    fields.lineTotal = lineTotal;
  }

  return fields;
}

export function isFuelProductLabel(label: string): boolean {
  return (
    FUEL_UNIT_PRICE.test(label) ||
    (FUEL_QUANTITY_LINE.test(label) &&
      /\b(motorin|benzin|dizel|lpg|fuel|akaryakit|akaryakıt)\b/i.test(label))
  );
}
