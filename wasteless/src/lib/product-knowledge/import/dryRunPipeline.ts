import type {
  BrandEntry,
  CatalogProduct,
  KnowledgeCategory,
} from "../types";
import {
  formatProductDisplay,
  loadKnowledgeBase,
} from "../knowledgeBase";
import { normalizeOcrKey, tokenize, tokenOverlapScore } from "../productNormalizer";
import type { KnowledgeOverlay } from "../kbStore";
import { detectColumns, getCell } from "./columnMapper";
import type { RawImportTable } from "./fileParser";
import {
  normalizeImportRow,
  rowToCatalogProduct,
} from "./rowNormalizer";
import type {
  ImportApplyPlan,
  ImportDryRunReport,
  ParsedImportRow,
} from "./types";

const DUPLICATE_THRESHOLD = 0.88;

function findExistingByBarcode(
  products: CatalogProduct[],
  barcode: string | null
): CatalogProduct | null {
  if (!barcode) return null;
  return (
    products.find((p) => p.barcode === barcode && p.status !== "deprecated") ??
    null
  );
}

function findExistingByKey(
  products: CatalogProduct[],
  key: string
): CatalogProduct | null {
  const nk = normalizeOcrKey(key);
  for (const p of products) {
    if (p.status === "deprecated") continue;
    if (normalizeOcrKey(formatProductDisplay(p)) === nk) return p;
  }
  return null;
}

function findDuplicateCandidate(
  products: CatalogProduct[],
  imported: CatalogProduct
): { product: CatalogProduct; reason: string; score: number } | null {
  const importKey = formatProductDisplay(imported);
  const exact = findExistingByKey(products, importKey);
  if (exact) {
    return { product: exact, reason: "Possible duplicate", score: 1 };
  }

  let best: { product: CatalogProduct; reason: string; score: number } | null =
    null;
  for (const p of products) {
    if (p.status === "deprecated") continue;
    const score = tokenOverlapScore(
      tokenize(normalizeOcrKey(formatProductDisplay(p))),
      tokenize(normalizeOcrKey(importKey))
    );
    if (score >= DUPLICATE_THRESHOLD) {
      const reason =
        score >= 0.95
          ? "Possible duplicate"
          : "Same product with different naming";
      if (!best || score > best.score) best = { product: p, reason, score };
    }
  }
  return best;
}

function diffProduct(
  existing: CatalogProduct,
  imported: CatalogProduct
): string[] {
  const changes: string[] = [];
  for (const field of [
    "brand",
    "name",
    "variant",
    "size",
    "unit",
    "category",
    "barcode",
  ] as const) {
    const a = existing[field] ?? "";
    const b = imported[field] ?? "";
    if (String(a) !== String(b)) changes.push(`${field}: "${a}" → "${b}"`);
  }
  return changes;
}

function slugifyId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function runImportDryRun(
  table: RawImportTable,
  overlay: KnowledgeOverlay,
  aiNormalizeRow?: (row: ParsedImportRow) => Promise<ParsedImportRow>
): Promise<{ report: ImportDryRunReport; plan: ImportApplyPlan }> {
  const t0 = Date.now();
  const columns = detectColumns(table.headers);
  const kb = loadKnowledgeBase([], overlay);
  const products = [...kb.products];
  const brands = new Map(kb.brandAliasIndex);
  const brandList = [...overlay.brands];
  const categories = new Map(kb.categories.map((c) => [c.id, c]));
  const aliasIndex = new Map(kb.aliasIndex);

  const report: ImportDryRunReport = {
    fileName: table.fileName,
    totalRows: table.rows.length,
    newProducts: [],
    updatedProducts: [],
    duplicateProducts: [],
    newBrands: [],
    newCategories: [],
    newAliases: [],
    invalidRows: [],
    conflicts: [],
    learnedProducts: [],
    learnedAliases: [],
    durationMs: 0,
  };

  const plan: ImportApplyPlan = {
    productsToUpsert: [],
    aliasesToAdd: [],
    brandsToUpsert: [],
    categoriesToUpsert: [],
    merges: [],
  };

  const seenIds = new Set<string>();

  for (let i = 0; i < table.rows.length; i++) {
    let parsed = normalizeImportRow(table.rows[i]!, i + 1, columns);

    if (parsed.confidence < 0.5 && aiNormalizeRow) {
      try {
        parsed = await aiNormalizeRow(parsed);
      } catch {
        /* keep local parse */
      }
    }

    if (!parsed.name || parsed.errors.some((e) => e.includes("bulunamadı"))) {
      report.invalidRows.push({
        rowIndex: parsed.rowIndex,
        reason: parsed.errors.join("; ") || "Geçersiz satır",
        raw: parsed.raw,
      });
      continue;
    }

    const product = rowToCatalogProduct(parsed);
    const display = formatProductDisplay(product);

    const byBarcode = findExistingByBarcode(products, product.barcode);
    const dup = byBarcode
      ? { product: byBarcode, reason: "Matching barcode", score: 1 }
      : findDuplicateCandidate(products, product);

    let targetId = product.id;

    if (dup && dup.score >= DUPLICATE_THRESHOLD) {
      targetId = dup.product.id;
      const existingDisplay = formatProductDisplay(dup.product);
      const changes = diffProduct(dup.product, product);

      if (changes.length > 0) {
        if (dup.score >= 0.92) {
          report.updatedProducts.push({
            id: dup.product.id,
            existing: existingDisplay,
            imported: display,
            changes,
          });
          plan.productsToUpsert.push({ ...product, id: dup.product.id });
        } else {
          report.conflicts.push({
            existingId: dup.product.id,
            existing: existingDisplay,
            imported: display,
            reason: dup.reason,
          });
        }
      } else {
        report.duplicateProducts.push({
          imported: display,
          existingId: dup.product.id,
          existing: existingDisplay,
          reason: dup.reason,
        });
      }
    } else if (products.some((p) => p.id === product.id)) {
      const existing = products.find((p) => p.id === product.id)!;
      const changes = diffProduct(existing, product);
      if (changes.length > 0) {
        report.updatedProducts.push({
          id: product.id,
          existing: formatProductDisplay(existing),
          imported: display,
          changes,
        });
        plan.productsToUpsert.push(product);
      } else {
        report.duplicateProducts.push({
          imported: display,
          existingId: existing.id,
          existing: formatProductDisplay(existing),
          reason: "Same product id",
        });
      }
      targetId = product.id;
    } else if (!seenIds.has(product.id)) {
      seenIds.add(product.id);
      report.newProducts.push({ id: product.id, display, row: parsed });
      report.learnedProducts.push(display);
      plan.productsToUpsert.push(product);
      products.push(product);
      targetId = product.id;
    }

    if (parsed.brand) {
      const brandKey = normalizeOcrKey(parsed.brand);
      if (!brands.has(brandKey)) {
        const id = slugifyId(parsed.brand);
        if (!brandList.some((b) => b.id === id)) {
          report.newBrands.push({ id, name: parsed.brand });
          const entry: BrandEntry = { id, name: parsed.brand, aliases: [] };
          brandList.push(entry);
          plan.brandsToUpsert.push(entry);
          brands.set(brandKey, id);
        }
      }
    }

    if (parsed.category) {
      const catId = slugifyId(parsed.category);
      if (!categories.has(catId)) {
        report.newCategories.push({ id: catId, name: parsed.category });
        const cat: KnowledgeCategory = {
          id: catId,
          name: parsed.category,
          parentId: "market",
        };
        categories.set(catId, cat);
        plan.categoriesToUpsert.push(cat);
      }
    }

    for (const alias of parsed.aliases) {
      const key = normalizeOcrKey(alias);
      if (!aliasIndex.has(key)) {
        report.newAliases.push({ ocr: alias, productId: targetId, display });
        report.learnedAliases.push({ ocr: alias, target: display });
        plan.aliasesToAdd.push({ ocr: alias, productId: targetId });
        aliasIndex.set(key, targetId);
      }
    }

    const rawName = getCell(parsed.raw, columns.name);
    if (rawName) {
      const ocr = rawName.toUpperCase();
      const key = normalizeOcrKey(ocr);
      if (!aliasIndex.has(key)) {
        report.newAliases.push({ ocr, productId: targetId, display });
        report.learnedAliases.push({ ocr, target: display });
        plan.aliasesToAdd.push({ ocr, productId: targetId });
        aliasIndex.set(key, targetId);
      }
    }
  }

  report.durationMs = Date.now() - t0;
  return { report, plan };
}
