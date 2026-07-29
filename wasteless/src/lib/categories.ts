import type { UserCategory } from "@/lib/types";

export type CategoryMeta = Pick<
  UserCategory,
  | "id"
  | "label"
  | "description"
  | "icon"
  | "color"
  | "softColor"
  | "specialType"
  | "parentId"
> & {
  shortLabel?: string;
  /** @deprecated use color */
  accent?: string;
  /** @deprecated use softColor */
  soft?: string;
};

/** Seed categories — stable ids keep existing expense rows valid. */
export const DEFAULT_CATEGORIES: Omit<
  UserCategory,
  "createdAt" | "updatedAt"
>[] = [
  {
    id: "yeme_icme",
    label: "Yeme-İçme",
    description: "Kafe, restoran ve yemek",
    icon: "utensils",
    color: "#0F766E",
    softColor: "#CCFBF1",
    specialType: null,
    parentId: null,
    sortOrder: 0,
  },
  {
    id: "market",
    label: "Market",
    description: "Market ve günlük alışveriş",
    icon: "shopping",
    color: "#047857",
    softColor: "#D1FAE5",
    specialType: null,
    parentId: null,
    sortOrder: 1,
  },
  {
    id: "araba",
    label: "Araba",
    description: "Araç harcamaları (üst kategori)",
    icon: "car",
    color: "#4F46E5",
    softColor: "#E0E7FF",
    specialType: null,
    parentId: null,
    sortOrder: 2,
  },
  {
    id: "akaryakit",
    label: "Akaryakıt",
    description: "Benzin, motorin, LPG — plakaya göre araç takibi",
    icon: "fuel",
    color: "#1D4ED8",
    softColor: "#DBEAFE",
    specialType: "fuel",
    parentId: "araba",
    sortOrder: 3,
  },
  {
    id: "araba_otoyol",
    label: "Otoyol / HGS",
    description: "Otoyol, HGS, köprü",
    icon: "car",
    color: "#4338CA",
    softColor: "#E0E7FF",
    specialType: null,
    parentId: "araba",
    sortOrder: 4,
  },
  {
    id: "araba_sigorta",
    label: "Sigorta",
    description: "Kasko, trafik sigortası",
    icon: "card",
    color: "#3730A3",
    softColor: "#E0E7FF",
    specialType: null,
    parentId: "araba",
    sortOrder: 5,
  },
  {
    id: "araba_bakim",
    label: "Bakım",
    description: "Servis, yağ, filtre, mekanik",
    icon: "wrench",
    color: "#312E81",
    softColor: "#E0E7FF",
    specialType: null,
    parentId: "araba",
    sortOrder: 6,
  },
  {
    id: "araba_otopark",
    label: "Otopark",
    description: "Otopark ve park ücreti",
    icon: "car",
    color: "#6366F1",
    softColor: "#E0E7FF",
    specialType: null,
    parentId: "araba",
    sortOrder: 7,
  },
  {
    id: "araba_ceza",
    label: "Ceza",
    description: "Trafik cezası",
    icon: "receipt",
    color: "#DC2626",
    softColor: "#FEE2E2",
    specialType: null,
    parentId: "araba",
    sortOrder: 8,
  },
  {
    id: "araba_yikama",
    label: "Yıkama",
    description: "Oto yıkama",
    icon: "sparkles",
    color: "#0284C7",
    softColor: "#E0F2FE",
    specialType: null,
    parentId: "araba",
    sortOrder: 9,
  },
  {
    id: "araba_mtv",
    label: "MTV",
    description: "Motorlu taşıtlar vergisi",
    icon: "receipt",
    color: "#B45309",
    softColor: "#FEF3C7",
    specialType: null,
    parentId: "araba",
    sortOrder: 10,
  },
  {
    id: "araba_lastik",
    label: "Lastik",
    description: "Lastik alım ve değişim",
    icon: "car",
    color: "#475569",
    softColor: "#F1F5F9",
    specialType: null,
    parentId: "araba",
    sortOrder: 11,
  },
  {
    id: "sigara",
    label: "Sigara",
    description: "Sigara ve tütün",
    icon: "cigarette",
    color: "#B45309",
    softColor: "#FEF3C7",
    specialType: "cigarette",
    parentId: null,
    sortOrder: 20,
  },
  {
    id: "saglik",
    label: "Sağlık",
    description: "Eczane, muayene, ilaç",
    icon: "stethoscope",
    color: "#E11D48",
    softColor: "#FFE4E6",
    specialType: null,
    parentId: null,
    sortOrder: 21,
  },
  {
    id: "giyim",
    label: "Giyim",
    description: "Kıyafet ve aksesuar",
    icon: "shirt",
    color: "#7C3AED",
    softColor: "#EDE9FE",
    specialType: null,
    parentId: null,
    sortOrder: 22,
  },
  {
    id: "faturalar",
    label: "Faturalar",
    description: "Elektrik, su, doğalgaz, internet",
    icon: "zap",
    color: "#EA580C",
    softColor: "#FFEDD5",
    specialType: null,
    parentId: null,
    sortOrder: 23,
  },
  {
    id: "ev",
    label: "Ev",
    description: "Kira, mobilya, ev eşyaları",
    icon: "home",
    color: "#0891B2",
    softColor: "#CFFAFE",
    specialType: null,
    parentId: null,
    sortOrder: 24,
  },
  {
    id: "other",
    label: "Diğer",
    description: "Sınıflandırılamayan",
    icon: "more",
    color: "#57534E",
    softColor: "#E7E5E4",
    specialType: null,
    parentId: null,
    sortOrder: 99,
  },
];

/** Stable Araba child category ids (for migration + seeds). */
export const ARABA_CHILD_IDS = [
  "akaryakit",
  "araba_otoyol",
  "araba_sigorta",
  "araba_bakim",
  "araba_otopark",
  "araba_ceza",
  "araba_yikama",
  "araba_mtv",
  "araba_lastik",
] as const;

/** Fuel purchase UX (plate / litres) — by id or legacy specialType. */
export function isFuelCategory(
  category: Pick<UserCategory, "id" | "specialType"> | null | undefined
): boolean {
  if (!category) return false;
  return category.specialType === "fuel" || category.id === "akaryakit";
}

export function isCigaretteCategory(
  category: Pick<UserCategory, "id" | "specialType"> | null | undefined
): boolean {
  if (!category) return false;
  return category.specialType === "cigarette" || category.id === "sigara";
}

export function toCategoryMeta(category: UserCategory): CategoryMeta {
  return {
    id: category.id,
    label: category.label,
    description: category.description,
    icon: category.icon,
    color: category.color,
    softColor: category.softColor,
    specialType: category.specialType,
    parentId: category.parentId ?? null,
    shortLabel: category.label,
    accent: category.color,
    soft: category.softColor,
  };
}

export function resolveCategory(
  categories: UserCategory[],
  id: string | null | undefined
): UserCategory {
  if (id) {
    const found = categories.find((c) => c.id === id);
    if (found) return found;
  }
  return (
    categories.find((c) => c.id === "other") ??
    categories[0] ?? {
      id: "other",
      label: "Diğer",
      description: "",
      icon: "more",
      color: "#57534E",
      softColor: "#E7E5E4",
      specialType: null,
      parentId: null,
      sortOrder: 999,
      createdAt: "",
      updatedAt: "",
    }
  );
}

/** Legacy helper — prefers live categories when provided. */
export function getCategoryMeta(
  id: string,
  categories: UserCategory[] = []
): CategoryMeta {
  if (categories.length > 0) {
    return toCategoryMeta(resolveCategory(categories, id));
  }
  const fallback = DEFAULT_CATEGORIES.find((c) => c.id === id) ?? DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
  return {
    id: fallback.id,
    label: fallback.label,
    description: fallback.description,
    icon: fallback.icon,
    color: fallback.color,
    softColor: fallback.softColor,
    specialType: fallback.specialType,
    parentId: fallback.parentId ?? null,
    shortLabel: fallback.label,
    accent: fallback.color,
    soft: fallback.softColor,
  };
}

export function categoryOptions(categories: UserCategory[]) {
  return categories.map((c) => ({ value: c.id, label: c.label }));
}

export const CATEGORY_ICONS = [
  "utensils",
  "shopping",
  "bag",
  "coffee",
  "fuel",
  "car",
  "bus",
  "plane",
  "train",
  "bike",
  "cigarette",
  "heart",
  "pill",
  "stethoscope",
  "shirt",
  "home",
  "building",
  "receipt",
  "zap",
  "water",
  "gas",
  "wifi",
  "phone",
  "card",
  "wallet",
  "savings",
  "education",
  "book",
  "game",
  "film",
  "ticket",
  "dumbbell",
  "gift",
  "baby",
  "pet",
  "wrench",
  "scissors",
  "sparkles",
  "plug",
  "more",
] as const;

export const CATEGORY_COLORS = [
  { color: "#E11D48", soft: "#FFE4E6" }, // rose
  { color: "#DC2626", soft: "#FEE2E2" }, // red
  { color: "#F43F5E", soft: "#FFE4E6" }, // rose bright
  { color: "#EA580C", soft: "#FFEDD5" }, // orange
  { color: "#F97316", soft: "#FFEDD5" }, // orange bright
  { color: "#D97706", soft: "#FEF3C7" }, // amber
  { color: "#CA8A04", soft: "#FEF9C3" }, // yellow
  { color: "#EAB308", soft: "#FEF9C3" }, // yellow bright
  { color: "#65A30D", soft: "#ECFCCB" }, // lime
  { color: "#84CC16", soft: "#ECFCCB" }, // lime bright
  { color: "#16A34A", soft: "#DCFCE7" }, // green
  { color: "#22C55E", soft: "#DCFCE7" }, // green bright
  { color: "#059669", soft: "#D1FAE5" }, // emerald
  { color: "#0F766E", soft: "#CCFBF1" }, // teal
  { color: "#14B8A6", soft: "#CCFBF1" }, // teal bright
  { color: "#0891B2", soft: "#CFFAFE" }, // cyan
  { color: "#06B6D4", soft: "#CFFAFE" }, // cyan bright
  { color: "#0284C7", soft: "#E0F2FE" }, // sky
  { color: "#0EA5E9", soft: "#E0F2FE" }, // sky bright
  { color: "#2563EB", soft: "#DBEAFE" }, // blue
  { color: "#3B82F6", soft: "#DBEAFE" }, // blue bright
  { color: "#1D4ED8", soft: "#DBEAFE" }, // blue deep
  { color: "#4F46E5", soft: "#E0E7FF" }, // indigo
  { color: "#6366F1", soft: "#E0E7FF" }, // indigo bright
  { color: "#7C3AED", soft: "#EDE9FE" }, // violet
  { color: "#8B5CF6", soft: "#EDE9FE" }, // violet bright
  { color: "#9333EA", soft: "#F3E8FF" }, // purple
  { color: "#A855F7", soft: "#F3E8FF" }, // purple bright
  { color: "#C026D3", soft: "#FAE8FF" }, // fuchsia
  { color: "#D946EF", soft: "#FAE8FF" }, // fuchsia bright
  { color: "#DB2777", soft: "#FCE7F3" }, // pink
  { color: "#EC4899", soft: "#FCE7F3" }, // pink bright
  { color: "#B45309", soft: "#FDE68A" }, // bronze
  { color: "#92400E", soft: "#FEF3C7" }, // brown
  { color: "#78716C", soft: "#F5F5F4" }, // warm gray
  { color: "#475569", soft: "#F1F5F9" }, // slate
  { color: "#334155", soft: "#F1F5F9" }, // slate deep
  { color: "#57534E", soft: "#E7E5E4" }, // stone
  { color: "#171717", soft: "#F5F5F5" }, // near black
  { color: "#0F172A", soft: "#F1F5F9" }, // navy ink
] as const;

/** Soft companion for a free-form hex accent (used by the color picker). */
export function softColorFromHex(hex: string): string {
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return "#F1F5F9";
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.88);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function slugifyCategoryLabel(label: string): string {
  const base = label
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return base || `kat_${Date.now().toString(36)}`;
}

function normalizeCategoryKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** Common AI / OCR aliases → preferred category id. */
const AI_CATEGORY_ALIASES: Record<string, string[]> = {
  yeme_icme: ["yeme", "yemeicme", "food", "restaurant", "cafe", "kahve", "yemek"],
  market: ["grocery", "supermarket", "migros", "bim", "a101", "carrefour"],
  araba: ["car", "arac", "oto", "otomobil", "vehicle", "araba"],
  akaryakit: ["fuel", "benzın", "benzin", "motorin", "lpg", "petrol", "gas", "akaryakit"],
  araba_otoyol: ["otoyol", "hgs", "highway", "kopru", "köprü"],
  araba_sigorta: ["sigorta", "kasko", "insurance"],
  araba_bakim: ["bakim", "servis", "maintenance"],
  araba_otopark: ["otopark", "parking", "garaj", "park"],
  araba_ceza: ["ceza", "penalty", "trafikceza"],
  araba_yikama: ["yikama", "wash", "otoyikama"],
  araba_mtv: ["mtv"],
  araba_lastik: ["lastik", "tire"],
  sigara: ["cigarette", "tobacco", "tutun", "paket"],
  saglik: ["health", "pharmacy", "eczane", "ilac", "hastane", "doktor", "muayene", "saglik"],
  giyim: ["clothing", "fashion", "kiyafet", "tekstil"],
  faturalar: ["bill", "bills", "fatura", "elektrik", "electric", "su", "water", "dogalgaz", "internet", "telefon", "phone", "utility", "utilities", "abonelik", "subscription", "faturalar"],
  ev: ["home", "house", "kira", "rent", "mobilya", "furniture", "temizlik", "esya", "ev"],
  other: ["diger", "misc", "unknown", "genel"],
};

/**
 * Map AI / free-text category to a user category id.
 * Prefers exact id, then label, then alias → known seed id, else `other`.
 */
export function mapAiCategoryToUserCategory(
  raw: string | null | undefined,
  categories: UserCategory[]
): string {
  const fallback =
    categories.find((c) => c.id === "other")?.id ?? categories[0]?.id ?? "other";
  if (!raw?.trim()) return fallback;

  const key = normalizeCategoryKey(raw);
  if (!key) return fallback;

  const byId = categories.find((c) => normalizeCategoryKey(c.id) === key);
  if (byId) return byId.id;

  const byLabel = categories.find((c) => normalizeCategoryKey(c.label) === key);
  if (byLabel) return byLabel.id;

  const byPartialLabel = categories.find((c) => {
    const labelKey = normalizeCategoryKey(c.label);
    return labelKey.length >= 3 && (key.includes(labelKey) || labelKey.includes(key));
  });
  if (byPartialLabel) return byPartialLabel.id;

  for (const [canonicalId, aliases] of Object.entries(AI_CATEGORY_ALIASES)) {
    const match =
      normalizeCategoryKey(canonicalId) === key ||
      aliases.some((a) => normalizeCategoryKey(a) === key);
    if (!match) continue;
    const found = categories.find((c) => c.id === canonicalId);
    if (found) return found.id;
  }

  return fallback;
}

export function buildAnalyzeCategoryHint(categories: UserCategory[]): string {
  if (categories.length === 0) {
    return "Categories: yeme_icme, market, akaryakit, sigara, saglik, giyim, araba, faturalar, ev, other.";
  }
  const list = categories.map((c) => `${c.id} (${c.label})`).join(", ");
  return `Prefer one of these category ids when possible: ${list}. You may also return a Turkish label; the app will map it.`;
}
