import Dexie, { type Table } from "dexie";
import type {
  Expense,
  QuickButton,
  AppSettings,
  UserCategory,
  UserTag,
  OcrCorrection,
} from "@/lib/types";
import type { LearnedProductAlias } from "@/lib/product-knowledge/types";
import type { KbImportHistoryEntry } from "@/lib/product-knowledge/import/types";
import type {
  BrandEntry,
  CatalogProduct,
  KnowledgeCategory,
} from "@/lib/product-knowledge/types";
import type { KbGlobalAlias } from "@/lib/product-knowledge/kbStore";
import { DEFAULT_CATEGORIES, ARABA_CHILD_IDS } from "@/lib/categories";
import { normalizeMerchantName } from "@/lib/merchants";
import { computeUnitPrice, normalizeProductName } from "@/lib/products";
import {
  CAR_SPEND_TO_CATEGORY,
  classifyCarSpend,
  mapArabaSubcategoryToChildId,
} from "@/lib/analytics";
import { createId, todayISO } from "@/lib/utils";
import {
  readChargesField,
  readDiscountsField,
  readPaymentsField,
  readUnknownLinesField,
} from "@/lib/receipt-model";

export class WasteLessDB extends Dexie {
  expenses!: Table<Expense, string>;
  quickButtons!: Table<QuickButton, string>;
  categories!: Table<UserCategory, string>;
  tags!: Table<UserTag, string>;
  settings!: Table<AppSettings & { id: string }, string>;
  ocrCorrections!: Table<OcrCorrection, string>;
  productAliases!: Table<LearnedProductAlias, string>;
  kbProducts!: Table<CatalogProduct, string>;
  kbGlobalAliases!: Table<KbGlobalAlias, string>;
  kbBrands!: Table<BrandEntry, string>;
  kbCategories!: Table<KnowledgeCategory, string>;
  kbImportHistory!: Table<KbImportHistoryEntry, string>;

  constructor() {
    super("wasteless");
    this.version(1).stores({
      expenses: "id, date, category, createdAt, sourceType, merchantName",
      quickButtons: "id, sortOrder, category, updatedAt",
      settings: "id",
    });
    this.version(2)
      .stores({
        expenses: "id, date, category, createdAt, sourceType, merchantName",
        quickButtons: "id, sortOrder, category, updatedAt",
        categories: "id, sortOrder, updatedAt",
        settings: "id",
      })
      .upgrade(async (tx) => {
        const table = tx.table("categories");
        const count = await table.count();
        if (count === 0) {
          const now = new Date().toISOString();
          await table.bulkAdd(
            DEFAULT_CATEGORIES.map((c) => ({
              ...c,
              createdAt: now,
              updatedAt: now,
            }))
          );
        }
      });
    this.version(3)
      .stores({
        expenses: "id, date, category, createdAt, sourceType, merchantName",
        quickButtons: "id, sortOrder, category, updatedAt",
        categories: "id, sortOrder, updatedAt",
        tags: "id, sortOrder, updatedAt, label",
        settings: "id",
      })
      .upgrade(async (tx) => {
        const expenses = tx.table("expenses");
        await expenses.toCollection().modify((row) => {
          if (!Array.isArray(row.tagIds)) row.tagIds = [];
          if (Array.isArray(row.items)) {
            row.items = row.items.map(
              (item: Expense["items"][number] & { normalizedName?: string }) => ({
                ...item,
                normalizedName:
                  item.normalizedName ??
                  normalizeProductName(item.name) ??
                  null,
                rawText: item.rawText ?? item.name ?? null,
              })
            );
          }
        });
      });
    this.version(4).stores({
      expenses: "id, date, category, createdAt, sourceType, merchantName",
      quickButtons: "id, sortOrder, category, updatedAt",
      categories: "id, sortOrder, updatedAt",
      tags: "id, sortOrder, updatedAt, label",
      settings: "id",
      ocrCorrections: "id, merchantKey, field, createdAt",
    });
    this.version(5).stores({
      expenses: "id, date, category, createdAt, sourceType, merchantName",
      quickButtons: "id, sortOrder, category, updatedAt",
      categories: "id, sortOrder, updatedAt",
      tags: "id, sortOrder, updatedAt, label",
      settings: "id",
      ocrCorrections: "id, merchantKey, field, createdAt",
      productAliases: "id, ocr, productId, createdAt",
    });
    this.version(6).stores({
      expenses: "id, date, category, createdAt, sourceType, merchantName",
      quickButtons: "id, sortOrder, category, updatedAt",
      categories: "id, sortOrder, updatedAt",
      tags: "id, sortOrder, updatedAt, label",
      settings: "id",
      ocrCorrections: "id, merchantKey, field, createdAt",
      productAliases: "id, ocr, productId, createdAt",
      kbProducts: "id, brand, category, barcode, status",
      kbGlobalAliases: "id, ocr, productId, createdAt",
      kbBrands: "id, name",
      kbCategories: "id, name, parentId",
      kbImportHistory: "id, importedAt, status, fileName",
    });
  }
}

export const db = typeof window !== "undefined" ? new WasteLessDB() : null;

const DEFAULT_BUTTONS: Omit<
  QuickButton,
  "id" | "createdAt" | "updatedAt" | "sortOrder"
>[] = [
  {
    title: "Sigara",
    category: "sigara",
    defaultAmount: 80,
    unit: "paket",
    notes: null,
    icon: "cigarette",
    color: "#B45309",
  },
  {
    title: "Kahve",
    category: "yeme_icme",
    defaultAmount: 90,
    unit: "adet",
    notes: null,
    icon: "coffee",
    color: "#0F766E",
  },
  {
    title: "Öğle yemeği",
    category: "yeme_icme",
    defaultAmount: 250,
    unit: null,
    notes: null,
    icon: "utensils",
    color: "#0F766E",
  },
  {
    title: "Akaryakıt",
    category: "akaryakit",
    defaultAmount: 1000,
    unit: "litre",
    notes: null,
    icon: "fuel",
    color: "#1D4ED8",
  },
];

/**
 * One-time, per-device merge of categories introduced after a user's DB was
 * first seeded. Respects later deletions (guarded by a localStorage flag so a
 * removed category is never resurrected on the next launch).
 */
async function mergeNewDefaultCategories(): Promise<void> {
  if (!db) return;
  const FLAG = "wl_defaults_araba_faturalar_ev";
  const newIds = ["araba", "faturalar", "ev"];
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(FLAG)) {
      return;
    }
  } catch {
    /* localStorage unavailable — fall through and merge once */
  }

  const existing = new Set((await db.categories.toArray()).map((c) => c.id));
  const missing = DEFAULT_CATEGORIES.filter(
    (c) => newIds.includes(c.id) && !existing.has(c.id)
  );
  if (missing.length > 0) {
    const now = new Date().toISOString();
    await db.categories.bulkAdd(
      missing.map((c) => ({ ...c, createdAt: now, updatedAt: now }))
    );
  }

  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(FLAG, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Refresh icon / color / description for seed categories that still use an
 * older built-in look (so Sağlık, Faturalar, Ev pick up their new icons).
 * Never overwrites a category the user has customized away from known seeds.
 */
async function syncSeedCategoryMeta(): Promise<void> {
  if (!db) return;
  const FLAG = "wl_seed_meta_v3_parent";
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(FLAG)) {
      return;
    }
  } catch {
    /* fall through */
  }

  const now = new Date().toISOString();
  const rows = await db.categories.toArray();
  const byId = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

  // Older defaults we are willing to replace when still present.
  const LEGACY: Record<string, { icons: string[]; colors: string[] }> = {
    saglik: { icons: ["heart"], colors: ["#BE123C"] },
    faturalar: { icons: ["receipt"], colors: ["#EA580C"] },
    ev: { icons: ["home"], colors: ["#0891B2"] },
    araba: { icons: ["car"], colors: ["#4F46E5"] },
    akaryakit: { icons: ["fuel"], colors: ["#1D4ED8"] },
  };

  for (const row of rows) {
    const seed = byId.get(row.id);
    const legacy = LEGACY[row.id];
    if (!seed || !legacy) continue;
    const stillDefault =
      legacy.icons.includes(row.icon) || legacy.colors.includes(row.color);
    if (!stillDefault) continue;
    await db.categories.put({
      ...row,
      icon: seed.icon,
      color: seed.color,
      softColor: seed.softColor,
      description: seed.description,
      parentId: seed.parentId ?? row.parentId ?? null,
      specialType: seed.specialType ?? row.specialType ?? null,
      updatedAt: now,
    });
  }

  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(FLAG, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Seed Araba child categories + migrate legacy araba expenses onto leaf ids.
 * One-time per device (localStorage flag).
 */
async function migrateArabaHierarchy(): Promise<void> {
  if (!db) return;
  const FLAG = "wl_seed_meta_v4_hierarchy";
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(FLAG)) {
      return;
    }
  } catch {
    /* fall through */
  }

  const now = new Date().toISOString();
  const existing = await db.categories.toArray();
  const existingIds = new Set(existing.map((c) => c.id));
  const bySeed = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

  // Ensure akaryakit.parentId = araba
  const fuel = existing.find((c) => c.id === "akaryakit");
  if (fuel && fuel.parentId !== "araba") {
    await db.categories.put({
      ...fuel,
      parentId: "araba",
      specialType: fuel.specialType ?? "fuel",
      updatedAt: now,
    });
  }

  // Add missing Araba children
  const missingChildren = ARABA_CHILD_IDS.filter((id) => !existingIds.has(id))
    .map((id) => bySeed.get(id))
    .filter(Boolean) as (typeof DEFAULT_CATEGORIES)[number][];

  if (missingChildren.length > 0) {
    await db.categories.bulkAdd(
      missingChildren.map((c) => ({
        ...c,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  // Migrate expenses still on araba (or fuel-tagged without akaryakit)
  const expenses = await db.expenses.toArray();
  const childSet = new Set<string>(ARABA_CHILD_IDS);

  for (const expense of expenses) {
    let nextCategory = expense.category;

    if (expense.category === "araba") {
      const fromSub = mapArabaSubcategoryToChildId(expense.subcategory);
      if (fromSub) {
        nextCategory = fromSub;
      } else {
        const kind = classifyCarSpend(expense);
        nextCategory = CAR_SPEND_TO_CATEGORY[kind] ?? "araba";
      }
    } else if (
      expense.fuel &&
      expense.category !== "akaryakit" &&
      !childSet.has(expense.category)
    ) {
      // Fuel details on a non-child category → move to akaryakit
      if (expense.category === "araba" || !expense.category) {
        nextCategory = "akaryakit";
      }
    }

    if (nextCategory !== expense.category) {
      await db.expenses.put({
        ...expense,
        category: nextCategory,
        updatedAt: now,
      });
    }
  }

  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(FLAG, "1");
  } catch {
    /* ignore */
  }
}

export async function ensureSeedData(): Promise<void> {
  if (!db) return;

  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    const now = new Date().toISOString();
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        createdAt: now,
        updatedAt: now,
      }))
    );
  } else {
    await mergeNewDefaultCategories();
    await syncSeedCategoryMeta();
    await migrateArabaHierarchy();
  }

  const buttonCount = await db.quickButtons.count();
  if (buttonCount === 0) {
    const now = new Date().toISOString();
    await db.quickButtons.bulkAdd(
      DEFAULT_BUTTONS.map((button, index) => ({
        ...button,
        id: createId("qb"),
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  const settings = await db.settings.get("app");
  if (!settings) {
    await db.settings.put({
      id: "app",
      theme: "light",
      onboardingCompleted: false,
    });
  }
}

export async function getAllExpenses(): Promise<Expense[]> {
  if (!db) return [];
  const rows = await db.expenses.orderBy("date").reverse().toArray();
  // Same purchase date → newest entry first
  rows.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  return rows.map(normalizeExpenseRow);
}

function normalizeExpenseRow(expense: Expense): Expense {
  const merchantRaw = expense.merchantRaw ?? expense.merchantName ?? null;
  const items = (expense.items ?? []).map((item) => {
    const normalizedName = normalizeProductName(item.name) ?? item.normalizedName ?? null;
    const unitInfo = computeUnitPrice({
      totalPrice: item.totalPrice,
      quantity: item.quantity,
      unit: item.unit,
      name: item.name,
      existingUnitPrice: item.unitPrice,
    });
    return {
      ...item,
      rawText: item.rawText ?? item.name ?? null,
      normalizedName,
      unitPrice: unitInfo.unitPrice ?? item.unitPrice,
      quantity: item.quantity ?? unitInfo.packAmount,
      unit: item.unit ?? unitInfo.packUnit,
    };
  });
  return {
    ...expense,
    tagIds: Array.isArray(expense.tagIds) ? expense.tagIds : [],
    time: expense.time ?? null,
    merchantRaw,
    merchantName: normalizeMerchantName(expense.merchantName ?? merchantRaw),
    aiResponseJson: expense.aiResponseJson ?? null,
    imageDataUrl: expense.imageDataUrl ?? null,
    rawText: expense.rawText ?? null,
    items,
    charges: readChargesField(expense as unknown as Record<string, unknown>),
    discounts: readDiscountsField(expense as unknown as Record<string, unknown>),
    payments: readPaymentsField(expense as unknown as Record<string, unknown>),
    unknownLines: readUnknownLinesField(expense as unknown as Record<string, unknown>),
  };
}

export async function saveExpense(expense: Expense): Promise<void> {
  if (!db) throw new Error("Database unavailable");
  const items = (expense.items ?? []).map((item) => {
    const normalizedName = normalizeProductName(item.name) ?? item.normalizedName ?? null;
    const unitInfo = computeUnitPrice({
      totalPrice: item.totalPrice,
      quantity: item.quantity,
      unit: item.unit,
      name: item.name,
      existingUnitPrice: item.unitPrice,
    });
    return {
      ...item,
      rawText: item.rawText ?? item.name ?? null,
      normalizedName,
      unitPrice: unitInfo.unitPrice ?? item.unitPrice,
      quantity: item.quantity ?? unitInfo.packAmount,
      unit: item.unit ?? unitInfo.packUnit,
    };
  });
  await db.expenses.put({
    ...expense,
    tagIds: expense.tagIds ?? [],
    merchantName: normalizeMerchantName(
      expense.merchantName ?? expense.merchantRaw
    ),
    items,
  });
}

export async function deleteExpense(id: string): Promise<void> {
  if (!db) return;
  await db.expenses.delete(id);
}

export async function getCategories(): Promise<UserCategory[]> {
  if (!db) return [];
  const rows = await db.categories.orderBy("sortOrder").toArray();
  return rows.map((c) => ({
    ...c,
    parentId: c.parentId ?? null,
    specialType: c.specialType ?? null,
  }));
}

export async function saveCategory(category: UserCategory): Promise<void> {
  if (!db) throw new Error("Database unavailable");
  await db.categories.put(category);
}

export async function deleteCategory(id: string): Promise<void> {
  if (!db) return;
  if (id === "other") return;

  await db.transaction("rw", db.expenses, db.categories, async () => {
    const orphans = await db!.expenses.where("category").equals(id).toArray();
    const now = new Date().toISOString();
    await Promise.all(
      orphans.map((expense) =>
        db!.expenses.put({
          ...expense,
          category: "other",
          updatedAt: now,
        })
      )
    );
    await db!.categories.delete(id);
  });
}

export async function reorderCategories(ids: string[]): Promise<void> {
  if (!db) return;
  await db.transaction("rw", db.categories, async () => {
    await Promise.all(
      ids.map((id, index) =>
        db!.categories.update(id, {
          sortOrder: index,
          updatedAt: new Date().toISOString(),
        })
      )
    );
  });
}

export async function getTags(): Promise<UserTag[]> {
  if (!db) return [];
  return db.tags.orderBy("sortOrder").toArray();
}

export async function saveTag(tag: UserTag): Promise<void> {
  if (!db) throw new Error("Database unavailable");
  await db.tags.put(tag);
}

export async function deleteTag(id: string): Promise<void> {
  if (!db) return;
  await db.transaction("rw", db.expenses, db.tags, async () => {
    const linked = await db!.expenses
      .filter((e) => (e.tagIds ?? []).includes(id))
      .toArray();
    const now = new Date().toISOString();
    await Promise.all(
      linked.map((expense) =>
        db!.expenses.put({
          ...expense,
          tagIds: (expense.tagIds ?? []).filter((t) => t !== id),
          updatedAt: now,
        })
      )
    );
    await db!.tags.delete(id);
  });
}

export async function getQuickButtons(): Promise<QuickButton[]> {
  if (!db) return [];
  return db.quickButtons.orderBy("sortOrder").toArray();
}

export async function saveQuickButton(button: QuickButton): Promise<void> {
  if (!db) throw new Error("Database unavailable");
  await db.quickButtons.put(button);
}

export async function deleteQuickButton(id: string): Promise<void> {
  if (!db) return;
  await db.quickButtons.delete(id);
}

export async function reorderQuickButtons(ids: string[]): Promise<void> {
  if (!db) return;
  await db.transaction("rw", db.quickButtons, async () => {
    await Promise.all(
      ids.map((id, index) =>
        db!.quickButtons.update(id, {
          sortOrder: index,
          updatedAt: new Date().toISOString(),
        })
      )
    );
  });
}

export async function createExpenseFromQuickButton(
  button: QuickButton
): Promise<Expense> {
  const now = new Date().toISOString();
  const cats = await getCategories();
  const meta = cats.find((c) => c.id === button.category);
  const expense: Expense = {
    id: createId("exp"),
    sourceType: "quick_button",
    date: todayISO(),
    time: new Date().toTimeString().slice(0, 5),
    merchantName: button.title,
    merchantRaw: button.title,
    category: button.category,
    subcategory: null,
    tagIds: [],
    totalAmount: button.defaultAmount,
    currency: "TRY",
    notes: button.notes,
    createdAt: now,
    updatedAt: now,
    rawText: null,
    confidence: 1,
    imageDataUrl: null,
    aiResponseJson: null,
    fuel:
      meta?.specialType === "fuel" || button.category === "akaryakit"
        ? {
            fuelType: null,
            liters: null,
            pricePerLiter: null,
            stationName: null,
            odometer: null,
            plate: null,
          }
        : null,
    packCount:
      meta?.specialType === "cigarette" || button.category === "sigara"
        ? 1
        : null,
    quickButtonId: button.id,
    items: [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
  };
  await saveExpense(expense);
  return expense;
}

export async function exportAllData() {
  if (!db) return null;
  const [expenses, quickButtons, categories, tags, settings, ocrCorrections] =
    await Promise.all([
      db.expenses.toArray(),
      db.quickButtons.toArray(),
      db.categories.toArray(),
      db.tags.toArray(),
      db.settings.toArray(),
      db.ocrCorrections.toArray(),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    expenses,
    quickButtons,
    categories,
    tags,
    settings,
    ocrCorrections,
  };
}

export async function clearAllData(): Promise<void> {
  if (!db) return;
  await Promise.all([
    db.expenses.clear(),
    db.quickButtons.clear(),
    db.categories.clear(),
    db.tags.clear(),
    db.settings.clear(),
    db.ocrCorrections.clear(),
  ]);
  await ensureSeedData();
}

export async function getOcrCorrectionsForMerchant(
  merchantKey: string
): Promise<OcrCorrection[]> {
  if (!db || !merchantKey) return [];
  return db.ocrCorrections.where("merchantKey").equals(merchantKey).toArray();
}

export async function getAllOcrCorrections(): Promise<OcrCorrection[]> {
  if (!db) return [];
  return db.ocrCorrections.toArray();
}

export async function saveOcrCorrections(
  rows: OcrCorrection[]
): Promise<void> {
  if (!db || rows.length === 0) return;
  await db.ocrCorrections.bulkPut(rows);
}

export async function getAllProductAliases(): Promise<LearnedProductAlias[]> {
  if (!db) return [];
  return db.productAliases.toArray();
}

export async function saveProductAlias(
  row: LearnedProductAlias
): Promise<void> {
  if (!db) return;
  await db.productAliases.put(row);
}

export async function saveProductAliases(
  rows: LearnedProductAlias[]
): Promise<void> {
  if (!db || rows.length === 0) return;
  await db.productAliases.bulkPut(rows);
}

export async function getSettings(): Promise<AppSettings> {
  if (!db) {
    return { theme: "light", displayName: null, onboardingCompleted: false };
  }
  const row = await db.settings.get("app");
  if (!row) {
    return { theme: "light", displayName: null, onboardingCompleted: false };
  }
  return {
    theme: row.theme ?? "light",
    displayName: row.displayName ?? null,
    // Existing installs without the field skip onboarding; new seeds set false explicitly.
    onboardingCompleted: row.onboardingCompleted ?? true,
    onboardingCompletedAt: row.onboardingCompletedAt,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (!db) return;
  await db.settings.put({ id: "app", ...settings });
}
