import type { CatalogProduct } from "../types";
import { foldTurkish, normalizeOcrText } from "../productNormalizer";
import { formatProductDisplay } from "../knowledgeBase";
import type { MappedColumns } from "./columnMapper";
import { getCell } from "./columnMapper";
import type { ParsedImportRow } from "./types";

const SIZE_IN_TEXT =
  /(\d+(?:[.,]\d+)?)\s*(ml|lt|l|litre|g|gr|gram|kg|adet|tablet|li|lu)\b/i;

function cleanField(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[|]/g, "I").trim();
}

function titleCaseTr(value: string): string {
  const v = cleanField(value);
  if (!v) return "";
  return v
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("tr-TR"));
}

export function normalizeUnit(raw: string): string {
  const u = foldTurkish(raw).toLowerCase().trim();
  if (!u) return "";
  if (/^(ml|milliliter|mililitre)$/.test(u)) return "ml";
  if (/^(l|lt|litre|liter)$/.test(u)) return "L";
  if (/^(g|gr|gram)$/.test(u)) return "g";
  if (/^(kg|kilogram|kilo)$/.test(u)) return "kg";
  if (/^(adet|adt|pcs|piece)$/.test(u)) return "adet";
  if (/tablet/.test(u)) return "tablet";
  return u;
}

function parsePrice(raw: string): number | null {
  const t = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function extractSizeFromText(text: string): { size: string; unit: string } {
  const m = text.match(SIZE_IN_TEXT);
  if (!m) return { size: "", unit: "" };
  const size = m[1]!.replace(",", ".");
  const unit = normalizeUnit(m[2]!);
  if (unit === "L" && size === "15") return { size: "1.5", unit: "L" };
  if (unit === "ml" && size.length >= 4 && !size.includes(".")) {
    const ml = Number(size);
    if (ml >= 1000 && ml % 1000 === 0) {
      return { size: String(ml / 1000), unit: "L" };
    }
  }
  return { size, unit };
}

export function slugifyProductId(
  brand: string,
  name: string,
  variant: string,
  size: string,
  unit: string
): string {
  const parts = [brand, name, variant, size && unit ? `${size}${unit}` : ""]
    .map((p) =>
      foldTurkish(p)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    )
    .filter(Boolean);
  return parts.join("-").slice(0, 120) || "product-unknown";
}

export function normalizeImportRow(
  row: Record<string, string>,
  rowIndex: number,
  columns: MappedColumns
): ParsedImportRow {
  const errors: string[] = [];
  let name = cleanField(getCell(row, columns.name));
  const description = cleanField(getCell(row, columns.description));
  if (!name && description) name = description;
  if (!name) {
    const firstVal = Object.values(row).find((v) => v.trim().length > 1);
    name = firstVal?.trim() ?? "";
  }

  let brand = titleCaseTr(getCell(row, columns.brand));
  const variant = titleCaseTr(getCell(row, columns.variant));
  const category = cleanField(getCell(row, columns.category)).toLowerCase();
  const barcodeRaw = getCell(row, columns.barcode).replace(/\D/g, "");
  const barcode = barcodeRaw.length >= 8 ? barcodeRaw : null;

  let size = getCell(row, columns.size).replace(",", ".");
  let unit = normalizeUnit(getCell(row, columns.unit));
  const price = parsePrice(getCell(row, columns.price));

  const combined = `${name} ${getCell(row, columns.size)}`;
  if (!size || !unit) {
    const extracted = extractSizeFromText(combined);
    if (!size) size = extracted.size;
    if (!unit) unit = extracted.unit;
  }

  if (name && !size) {
    const extracted = extractSizeFromText(name);
    if (extracted.size) {
      size = extracted.size;
      unit = unit || extracted.unit;
      name = name.replace(SIZE_IN_TEXT, "").trim();
    }
  }

  name = titleCaseTr(name);
  if (!brand && name.includes(" ")) {
    brand = name.split(/\s+/)[0] ?? "";
  }

  const aliasRaw = getCell(row, columns.alias);
  const aliases = aliasRaw
    ? aliasRaw.split(/[,;|]/).map((a) => normalizeOcrText(a)).filter(Boolean)
    : [];

  let confidence = 1;
  if (!name) {
    errors.push("Ürün adı bulunamadı");
    confidence = 0;
  } else if (name.length < 2) {
    errors.push("Ürün adı çok kısa");
    confidence = 0.3;
  }
  if (!brand) confidence = Math.min(confidence, 0.6);
  if (!category) confidence = Math.min(confidence, 0.7);

  return {
    rowIndex,
    raw: row,
    brand,
    name,
    variant,
    size,
    unit,
    category,
    barcode,
    price,
    aliases,
    confidence,
    errors,
  };
}

export function rowToCatalogProduct(row: ParsedImportRow): CatalogProduct {
  return {
    id: slugifyProductId(
      row.brand,
      row.name,
      row.variant,
      row.size,
      row.unit
    ),
    brand: row.brand,
    name: row.name,
    variant: row.variant,
    size: row.size,
    unit: row.unit,
    category: row.category || "market",
    barcode: row.barcode,
    status: "active",
    mergedIntoId: null,
  };
}

export function productDisplayKey(p: CatalogProduct): string {
  return normalizeOcrText(formatProductDisplay(p));
}
