import { parseTrNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/parseNumber";
import type { ParsedReceipt, ReceiptItem } from "../types/ParsedReceipt";
import {
  isStandaloneMultiplierProduct,
  parseMultiplierText,
} from "./mergeStandaloneMultiplierProducts";

const MIGROS_MERCHANT = /m[iİ]gros/i;

/** Product row with explicit printed quantity before price: `*1 *360,00`. */
const EXPLICIT_QTY_BEFORE_PRICE =
  /\*(\d{1,2})\s*\*+\s*(\d+(?:[.,]\d+)?)\s*$/;

/** Product row ending with printed line total, e.g. `LAKTOSUZ SÜT 200ML  *99.50`. */
const PRODUCT_LINE_WITH_TOTAL =
  /^(.+?)\s*\*+\s*(\d+(?:[.,]\d+)?)\s*$/;

const MIGROS_PLASTIC_BAG =
  /(?:migros\s+)?plastik\s+po[sş]et|alisveris\s+po[sş]et/i;

const NON_PRODUCT_LINE =
  /(?:İNDİRİM|INDIRIM|TOPLAM|TOPKDV|TOP\s*KDV|NAK[Iİ]T|KRED[Iİ]|BANKA|POS|F[Iİ][ŞS]NO|FIS\s*NO)/i;

function foldTurkishChars(value: string): string {
  return value
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c");
}

function normalizeNameKey(name: string): string {
  const stripped = name.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, "");
  return foldTurkishChars(stripped.toLocaleLowerCase("tr-TR"));
}

export function namesMatchLoosely(a: string, b: string): boolean {
  const ka = normalizeNameKey(a);
  const kb = normalizeNameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.length >= 4 && kb.includes(ka)) return true;
  if (kb.length >= 4 && ka.includes(kb)) return true;
  return false;
}

export function isMigrosReceipt(parsed: ParsedReceipt): boolean {
  return MIGROS_MERCHANT.test(parsed.merchant.title);
}

export function parseExplicitQuantityFromLine(line: string): number | null {
  const match = line.trim().match(EXPLICIT_QTY_BEFORE_PRICE);
  if (!match?.[1]) return null;
  const quantity = parseInt(match[1]!, 10);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) return null;
  return quantity;
}

function lineMatchesProductName(line: string, productName: string): boolean {
  const lineKey = normalizeNameKey(line.split("*")[0] ?? line);
  const productKey = normalizeNameKey(productName);
  if (!lineKey || !productKey) return false;
  if (lineKey.includes(productKey) || productKey.includes(lineKey)) return true;
  return namesMatchLoosely(line, productName);
}

/** When rawText contains `*N *PRICE` on the product row, quantity is authoritative. */
export function findExplicitQuantityForProduct(
  rawText: string,
  productName: string
): number | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!lineMatchesProductName(line, productName)) continue;
    const explicit = parseExplicitQuantityFromLine(line);
    if (explicit != null) return explicit;
  }
  return null;
}

/** True when Migros multiplier must not overwrite printed purchase quantity. */
export function migrosMultiplierMustPreserveQuantity(
  parsed: ParsedReceipt,
  product: ReceiptItem
): boolean {
  if (!isMigrosReceipt(parsed) || !parsed.rawText?.trim()) return false;
  return findExplicitQuantityForProduct(parsed.rawText, product.name) != null;
}

export function attachMigrosMultiplierMetadata(
  product: ReceiptItem
): ReceiptItem {
  const unitPrice = product.unitPrice ?? product.lineTotal;
  return {
    ...product,
    normalizedUnitPrice: unitPrice,
  };
}

function parseProductLineFromRaw(
  line: string
): { nameHint: string; lineTotal: number } | null {
  const match = line.trim().match(PRODUCT_LINE_WITH_TOTAL);
  if (!match) return null;

  const lineTotal = parseTrNumber(match[2]!);
  const nameHint = match[1]!.trim();
  if (!nameHint || lineTotal == null || lineTotal < 0) return null;

  return { nameHint, lineTotal };
}

function recoverProductNameNearMultiplier(
  rawText: string,
  multiplierLine: string
): { name: string; lineTotal: number | null } | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const multKey = multiplierLine.trim().toLocaleLowerCase("tr-TR").slice(0, 14);
  let multIdx = lines.findIndex((l) =>
    l.toLocaleLowerCase("tr-TR").includes(multKey.slice(0, 8))
  );
  if (multIdx < 0) {
    multIdx = lines.findIndex((l) => parseMultiplierText(l) != null);
  }
  if (multIdx < 0) return null;

  for (const offset of [-1, 1, -2, 2]) {
    const idx = multIdx + offset;
    if (idx < 0 || idx >= lines.length) continue;
    const line = lines[idx]!;
    if (parseMultiplierText(line)) continue;
    if (NON_PRODUCT_LINE.test(line)) continue;

    const withTotal = parseProductLineFromRaw(line);
    if (withTotal && withTotal.nameHint.length >= 3) {
      if (parseMultiplierText(withTotal.nameHint)) continue;
      return { name: withTotal.nameHint, lineTotal: withTotal.lineTotal };
    }

    if (
      line.length >= 4 &&
      !/^\d/.test(line) &&
      !/\*/.test(line) &&
      !/%/.test(line)
    ) {
      return { name: line.trim(), lineTotal: null };
    }
  }

  return null;
}

/**
 * When vision only extracted a multiplier row, recover the real product name
 * from adjacent rawText lines (e.g. MARLBORO TBLUE PAKET above 4 AD x 115).
 */
export function recoverSplitMigrosProducts(parsed: ParsedReceipt): ParsedReceipt {
  if (!isMigrosReceipt(parsed) || !parsed.rawText?.trim()) return parsed;

  const products = parsed.products.map((item) => ({ ...item }));
  const remove = new Set<number>();
  const add: ReceiptItem[] = [];

  for (let i = 0; i < products.length; i++) {
    const item = products[i]!;
    if (!isStandaloneMultiplierProduct(item)) continue;

    const recovered = recoverProductNameNearMultiplier(parsed.rawText, item.name);
    if (!recovered) continue;

    const alreadyExists = products.some(
      (p, j) => !remove.has(j) && namesMatchLoosely(p.name, recovered.name)
    );
    if (alreadyExists) {
      remove.add(i);
      continue;
    }

    const explicitQty = findExplicitQuantityForProduct(
      parsed.rawText,
      recovered.name
    );
    const lineTotal = recovered.lineTotal ?? item.lineTotal;
    const quantity = explicitQty ?? 1;
    const unitPrice =
      quantity > 0 ? lineTotal / quantity : lineTotal;

    add.push({
      name: recovered.name,
      quantity,
      unit: "ad",
      unitPrice,
      lineTotal,
      normalizedUnitPrice: unitPrice,
    });
    remove.add(i);
  }

  if (remove.size === 0 && add.length === 0) return parsed;

  const kept = products.filter((_, idx) => !remove.has(idx));
  return {
    ...parsed,
    products: [...kept, ...add],
  };
}

/** MIGROS PLASTIK POSET must appear once — never as both product and charge. */
export function dedupeMigrosPlasticBag(parsed: ParsedReceipt): ParsedReceipt {
  if (!isMigrosReceipt(parsed)) return parsed;

  const hasBagProduct = parsed.products.some((p) =>
    MIGROS_PLASTIC_BAG.test(p.name)
  );

  if (
    !hasBagProduct &&
    !(parsed.platformCharges ?? []).some((c) => MIGROS_PLASTIC_BAG.test(c.name))
  ) {
    return parsed;
  }

  let products = parsed.products;
  if (hasBagProduct) {
    let seen = false;
    products = products.filter((p) => {
      if (!MIGROS_PLASTIC_BAG.test(p.name)) return true;
      if (seen) return false;
      seen = true;
      return true;
    });
  }

  const platformCharges = (parsed.platformCharges ?? []).filter(
    (c) => !(hasBagProduct && MIGROS_PLASTIC_BAG.test(c.name))
  );

  return {
    ...parsed,
    products,
    platformCharges: platformCharges.length > 0 ? platformCharges : undefined,
  };
}
