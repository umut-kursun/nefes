import {
  FUEL_QUANTITY_LINE,
  FUEL_UNIT_PRICE,
  TOPKDV_HINT,
} from "../../patterns/document";
import { parseTrNumber } from "../parsers/parseNumber";

export interface FuelLineFields {
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  lineTotal?: number;
  plate?: string;
  name?: string;
  vatRate?: number;
}

/** Turkish-safe fuel type token (handles MOTORİN / MOTORIN OCR). */
const FUEL_TYPE = /motor[iİİI]n|benzin|dizel|lpg|fuel|akaryak[iİI]t/i;

function displayFuelName(token: string, fullLine?: string): string {
  const line = fullLine ?? token;
  const ascii = token
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .replace(/ı/g, "i");
  const lower = ascii.toLowerCase();
  if (lower.includes("motorin") && /euro/i.test(line)) return "Motorin Euro";
  if (lower.includes("motorin")) return "Motorin";
  if (lower.includes("benzin")) return "Benzin";
  if (lower.includes("dizel")) return "Dizel";
  if (lower.includes("lpg")) return "LPG";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

export function isFuelVatStarLine(text: string): boolean {
  return /^[xX×]\s*\d{1,2}\s*\*/.test(text.trim());
}

function parseFuelQtyToken(raw: string): number | undefined {
  if (/^\d+,\d{3}$/.test(raw)) return Number(raw.replace(",", "."));
  return parseTrNumber(raw);
}

/** Shell-style split lines: "29,766 LT X 79,17" + "MOTORIN %20 *2.356,10". */
export function parseMultiLineFuelBlock(
  rawLines: readonly string[],
  label: string
): FuelLineFields {
  const fields: FuelLineFields = {};
  const lines = [...rawLines].filter(Boolean);
  const labelTrim = label?.trim();
  if (
    labelTrim &&
    !lines.some((l) => l.trim() === labelTrim) &&
    !/[xX×]\s*\d{1,2}/.test(labelTrim) &&
    !FUEL_QUANTITY_LINE.test(labelTrim)
  ) {
    lines.push(labelTrim);
  }

  for (const line of lines) {
    if (TOPKDV_HINT.test(line)) continue;

    const shellQtyPrice = line.match(
      /(\d+,\d{3})\s*L[Iİiİ]K\s+(\d+(?:,\d+)?)/i
    );
    if (shellQtyPrice?.[1] && shellQtyPrice[2]) {
      fields.quantity = parseFuelQtyToken(shellQtyPrice[1]);
      fields.unit = "LT";
      fields.unitPrice = parseTrNumber(shellQtyPrice[2]);
    }

    const vatStarLine = line.match(
      /^[xX×]\s*(\d{1,2})\s*\*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/
    );
    if (vatStarLine?.[1] && vatStarLine[2]) {
      fields.vatRate = Number(vatStarLine[1]);
      const amt = parseTrNumber(vatStarLine[2].replace(/\./g, ""));
      if (amt != null && amt >= 200) fields.lineTotal = amt;
    }

    const starAmt = line.match(/\*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/);
    if (starAmt?.[1]) {
      const amt = parseTrNumber(starAmt[1].replace(/\./g, ""));
      if (amt != null && amt >= 200) {
        fields.lineTotal = amt;
      }
    }

    const plainTotal = line.match(
      /^(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)\s*TL\b/i
    );
    if (plainTotal?.[1]) {
      const amt = parseTrNumber(plainTotal[1].replace(/\./g, ""));
      if (amt != null && amt >= 200) fields.lineTotal = amt;
    }

    const qtyMatch = line.match(FUEL_QUANTITY_LINE);
    if (qtyMatch?.[1]) {
      fields.quantity = parseFuelQtyToken(qtyMatch[1]);
      fields.unit = "LT";
      const afterQty = line.match(
        /(?:LT|LİK|LITRE|L)\s*[xX×]?\s*(\d+(?:,\d+)?)/i
      );
      if (afterQty?.[1]) {
        fields.unitPrice = parseTrNumber(afterQty[1]);
      }
    }

    const fuelName = line.match(FUEL_TYPE);
    if (fuelName?.[0]) {
      fields.name = displayFuelName(fuelName[0], line);
      const starAmt = line.match(/\*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/);
      if (starAmt?.[1]) {
        fields.lineTotal = parseTrNumber(starAmt[1].replace(/\./g, ""));
      }
    }
  }

  if (fields.lineTotal == null && fields.quantity != null && fields.unitPrice != null) {
    const roundedUnit = Math.round(fields.unitPrice * 100) / 100;
    fields.lineTotal =
      Math.round(fields.quantity * roundedUnit * 100) / 100;
  }

  if (
    fields.quantity != null &&
    !fields.name &&
    lines.some((l) => /L[Iİiı]K/i.test(l))
  ) {
    fields.name = "Motorin";
  }

  return fields;
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
    fields.quantity = parseFuelQtyToken(qtyMatch[1]);
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
    FUEL_QUANTITY_LINE.test(label) ||
    (FUEL_TYPE.test(label) && /\d/.test(label))
  );
}

export function isFuelProductBlock(rawLines: readonly string[], label: string): boolean {
  const blob = [...rawLines, label].join("\n");
  if (TOPKDV_HINT.test(blob)) return false;
  return (
    isFuelProductLabel(label) ||
    rawLines.some((l) => FUEL_QUANTITY_LINE.test(l)) ||
    rawLines.some((l) => FUEL_TYPE.test(l)) ||
    (rawLines.some((l) => FUEL_QUANTITY_LINE.test(l)) &&
      (rawLines.some((l) => isFuelVatStarLine(l)) || isFuelVatStarLine(label)))
  );
}
