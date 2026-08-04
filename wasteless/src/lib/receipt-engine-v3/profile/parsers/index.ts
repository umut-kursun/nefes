import type { FieldConfidence, ProductEntity, ReceiptProfile } from "../../types";
import type { SemanticDocument } from "../../types/semantic-block";
import {
  FUEL_LINE,
  FUEL_UNIT_PRICE,
  parseTrAmount,
  trailingAmount,
  AMOUNT_ONLY,
  CHARGE_LABEL,
  PAYMENT_LABEL,
  TOTAL_LABEL,
} from "../../semantic/patterns";

export type ProfileParser = {
  readonly profile: ReceiptProfile;
  parseProducts(doc: SemanticDocument): ProductEntity[];
};

function conf(value: number, ...reasons: string[]): FieldConfidence {
  return { value, reasons };
}

export const fuelProfileParser: ProfileParser = {
  profile: "fuel",
  parseProducts(doc) {
    const products: ProductEntity[] = [];
    for (const block of doc.blocks) {
      if (block.type !== "ProductBlock") continue;
      if (!FUEL_LINE.test(block.text)) continue;
      const parsed = parseFuelBlock(block.text);
      if (parsed) products.push(parsed);
    }
    return products;
  },
};

function parseFuelQuantity(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (/^\d+,\d{3}$/.test(trimmed)) {
    return Number(trimmed.replace(",", "."));
  }
  if (/^\d+\.\d{3}$/.test(trimmed)) {
    return Number(trimmed);
  }
  return parseTrAmount(trimmed);
}

export function parseFuelBlock(text: string): ProductEntity | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let detail = lines[0] ?? text;
  let amountLine = lines[1];

  if (lines[0] && AMOUNT_ONLY.test(lines[0]) && lines[1]) {
    detail = lines[1];
    amountLine = lines[0];
  }

  const nameMatch = detail.match(/\b(Benzin|Motorin|Dizel|LPG|Fuel)\b/i);
  const name =
    nameMatch?.[1] ??
    (detail.replace(/\s*\d.*$/, "").trim() || detail);

  const qtyMatch = detail.match(/(\d+(?:[.,]\d{1,3})?)\s*(LT|LITRE|L)\b/i);
  const unitPriceMatch = detail.match(FUEL_UNIT_PRICE);
  const quantity = qtyMatch ? parseFuelQuantity(qtyMatch[1]!) : undefined;
  const unit = qtyMatch?.[2]?.toUpperCase().startsWith("L") ? "LT" : undefined;
  const unitPrice = unitPriceMatch ? parseTrAmount(unitPriceMatch[1]!) : undefined;
  const lineTotal =
    (amountLine ? trailingAmount(amountLine) : undefined) ??
    trailingAmount(detail);

  if (!FUEL_LINE.test(detail) && quantity == null && lineTotal == null) {
    return null;
  }

  return {
    name: nameMatch?.[1]
      ? nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase()
      : name,
    quantity,
    unit,
    unitPrice,
    lineTotal,
    confidence: conf(0.82, "fuel-profile"),
  };
}


function parseMarketProductLine(text: string): ProductEntity | null {
  if (CHARGE_LABEL.test(text)) return null;
  if (PAYMENT_LABEL.test(text) || TOTAL_LABEL.test(text)) return null;
  const lineTotal = trailingAmount(text);
  if (lineTotal == null) return null;
  const vatMatch = text.match(/%\s*(\d+(?:[.,]\d+)?)/);
  const name = text
    .replace(/\s*%\s*\d+(?:[.,]\d+)?\s*[\d.,]+\s*$/, "")
    .replace(/\s*[\d.,]+\s*(?:TL)?\s*$/, "")
    .trim();
  if (!name) return null;
  return {
    name,
    lineTotal,
    vatRate: vatMatch ? parseTrAmount(vatMatch[1]!) : undefined,
    confidence: conf(0.78, "market-profile"),
  };
}

export const marketProfileParser: ProfileParser = {
  profile: "market",
  parseProducts(doc) {
    const products: ProductEntity[] = [];
    for (const block of doc.blocks) {
      if (block.type !== "ProductBlock") continue;
      if (FUEL_LINE.test(block.text)) continue;
      const subLines = block.text.split(/\n/).map((l) => l.trim()).filter(Boolean);
      const linesToParse = subLines.length > 1 ? subLines : [block.text];
      for (const line of linesToParse) {
        const parsed = parseMarketProductLine(line);
        if (parsed) products.push(parsed);
      }
    }
    return products;
  },
};

export const genericProfileParser: ProfileParser = {
  profile: "generic",
  parseProducts(doc) {
    return marketProfileParser.parseProducts(doc);
  },
};

export const restaurantProfileParser: ProfileParser = {
  profile: "restaurant",
  parseProducts(doc) {
    return marketProfileParser.parseProducts(doc);
  },
};

export function parserForProfile(profile: ReceiptProfile): ProfileParser {
  switch (profile) {
    case "fuel":
      return fuelProfileParser;
    case "market":
      return marketProfileParser;
    case "restaurant":
    case "cafe":
      return restaurantProfileParser;
    default:
      return genericProfileParser;
  }
}
