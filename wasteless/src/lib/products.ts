import { normalizeKey } from "@/lib/merchants";

/** Canonical product *bases* — size variants stay separate after normalize. */
const PRODUCT_ALIASES: Record<string, string[]> = {
  "Coca-Cola": ["coca cola", "coca-cola", "cocacola", "coke"],
  Ariel: ["ariel", "ariel matik", "ariel toz", "ariel sivi", "ariel sıvı"],
  Fairy: ["fairy", "fairy bulasik", "fairy bulaşık"],
  Domestos: ["domestos"],
  "Ülker Çikolata": ["ulker cikolata", "ülker çikolata", "ulker chocolate"],
  Eti: ["eti"],
  "Sütaş Süt": ["sutas sut", "sütaş süt", "sutas", "sütaş"],
  Pınar: ["pinar", "pınar"],
  İçim: ["icim", "içim"],
  Su: ["su", "hayat su", "erikli", "saka su", "damla su", "niksar"],
  Ekmek: ["ekmek", "somun", "half ekmek"],
  Yoğurt: ["yogurt", "yoğurt"],
  "Kaşar Peynir": ["kasar", "kaşar", "kasar peynir", "kaşar peynir"],
  Peynir: ["peynir", "beyaz peynir"],
  Yağ: ["yag", "yağ", "aycicek yagi", "ayçiçek yağı", "sivi yag", "sıvı yağ"],
  Makarna: ["makarna", "spaghetti", "spagetti", "penne"],
  Pirinç: ["pirinc", "pirinç", "baldo", "osmancik"],
  "Yayla Pirinç": ["yayla pirinc", "yayla pirinç"],
  Knorr: ["knorr"],
  Nescafe: ["nescafe", "nescafé", "nescafe gold"],
  Lipton: ["lipton", "lipton ice tea"],
  "Red Bull": ["red bull", "redbull"],
  Efes: ["efes", "efes pilsen"],
  Tuborg: ["tuborg"],
  "Lay's": ["lays", "lay's", "lays cipsi"],
  Ruffles: ["ruffles"],
  Doritos: ["doritos"],
  Primo: ["primo"],
  Solo: ["solo"],
  Selpak: ["selpak"],
};

const ALIAS_INDEX = (() => {
  const map = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(PRODUCT_ALIASES)) {
    map.set(normalizeKey(canonical), canonical);
    for (const alias of aliases) {
      map.set(normalizeKey(alias), canonical);
    }
  }
  return map;
})();

export type PackUnit = "ml" | "l" | "g" | "kg" | "adet";

export type PackSize = {
  amount: number;
  unit: PackUnit;
  /** Original matched text, e.g. "1.5 LT" */
  raw: string;
};

const SIZE_RE =
  /(\d+(?:[.,]\d+)?)\s*(ml|cc|lt|l|litre|liter|kg|gr|g|gram|adet|pk|paket)\b/i;

function canonicalizeUnit(raw: string): PackUnit {
  const u = raw.toLocaleLowerCase("tr-TR");
  if (u === "ml" || u === "cc") return "ml";
  if (u === "lt" || u === "l" || u === "litre" || u === "liter") return "l";
  if (u === "kg") return "kg";
  if (u === "gr" || u === "g" || u === "gram") return "g";
  return "adet";
}

/** Normalize weight/volume to kg and L for comparable unit pricing. */
export function normalizeMeasureForPricing(
  amount: number,
  unit: PackUnit
): { amount: number; unit: PackUnit; unitLabel: string } {
  if (unit === "g") {
    return { amount: amount / 1000, unit: "kg", unitLabel: "₺/kg" };
  }
  if (unit === "ml") {
    return { amount: amount / 1000, unit: "l", unitLabel: "₺/L" };
  }
  if (unit === "kg" || unit === "l") {
    return { amount, unit, unitLabel: unitLabelFor(unit) };
  }
  return { amount, unit, unitLabel: unitLabelFor(unit) };
}

export function parsePackSize(raw: string | null | undefined): PackSize | null {
  if (!raw) return null;
  const m = raw.match(SIZE_RE);
  if (!m) return null;
  const amount = Number(m[1]!.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    amount,
    unit: canonicalizeUnit(m[2]!),
    raw: m[0]!,
  };
}

export function formatPackSize(size: PackSize): string {
  const n =
    Number.isInteger(size.amount) || size.amount >= 10
      ? String(size.amount)
      : size.amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const unitLabel =
    size.unit === "l"
      ? "L"
      : size.unit === "ml"
        ? "ml"
        : size.unit === "kg"
          ? "kg"
          : size.unit === "g"
            ? "g"
            : "adet";
  return `${n} ${unitLabel}`;
}

/** Strip size / pack noise so alias matching works on the base name. */
function stripPackNoise(value: string): string {
  return value
    .replace(SIZE_RE, " ")
    .replace(/\bx\s*\d+\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseTr(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("tr-TR"));
}

/** Title-case ASCII-normalized remainder tokens without turning "i" into "İ". */
function titleCaseNormalized(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Map OCR / alias bases while keeping flavor / variant tokens.
 * "Coca-Cola Zero" must stay distinct from "Coca-Cola"; pack size is
 * reattached by normalizeProductName.
 */
function resolveBaseName(raw: string): string {
  const key = normalizeKey(raw);
  const exact = ALIAS_INDEX.get(key);
  if (exact) return exact;

  const stripped = normalizeKey(stripPackNoise(raw));
  const strippedMatch = ALIAS_INDEX.get(stripped);
  if (strippedMatch) return strippedMatch;

  // Prefer the shortest whole-word alias prefix so trailing identity
  // (Zero, Peach, Lemon, …) is preserved after the brand.
  let best: { aliasKey: string; canonical: string } | null = null;
  for (const [aliasKey, canonical] of Array.from(ALIAS_INDEX.entries())) {
    if (aliasKey.length < 4) continue;
    const isPrefix =
      stripped.startsWith(`${aliasKey} `) || key.startsWith(`${aliasKey} `);
    if (!isPrefix) continue;
    if (
      !best ||
      aliasKey.length < best.aliasKey.length ||
      (aliasKey.length === best.aliasKey.length &&
        canonical.length < best.canonical.length)
    ) {
      best = { aliasKey, canonical };
    }
  }

  if (best) {
    let remainder = "";
    if (stripped.startsWith(`${best.aliasKey} `)) {
      remainder = stripped.slice(best.aliasKey.length).trim();
    } else if (key.startsWith(`${best.aliasKey} `)) {
      remainder = normalizeKey(
        stripPackNoise(key.slice(best.aliasKey.length))
      );
    }
    if (remainder) return `${best.canonical} ${titleCaseNormalized(remainder)}`;
    return best.canonical;
  }

  const base = stripPackNoise(raw) || raw;
  return titleCaseTr(base);
}

/**
 * Canonical display name that KEEPS pack size and flavor/variant so products
 * stay distinct: "Su 0,5 L" ≠ "Su 1,5 L"; "Coca-Cola Zero 330 ml" ≠ "Coca-Cola 330 ml".
 */
export function normalizeProductName(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const size = parsePackSize(trimmed);
  const base = resolveBaseName(trimmed);
  if (size) return `${base} ${formatPackSize(size)}`;
  return base;
}

export function productsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeProductName(a);
  const nb = normalizeProductName(b);
  if (!na || !nb) return false;
  return normalizeKey(na) === normalizeKey(nb);
}

export type UnitPriceInfo = {
  /** Price ÷ pack amount (e.g. ₺ / g or ₺ / L as printed). */
  unitPrice: number | null;
  /** Short label like "₺/g", "₺/L", "₺/kg". */
  unitLabel: string | null;
  packAmount: number | null;
  packUnit: PackUnit | null;
};

function unitLabelFor(unit: PackUnit): string {
  switch (unit) {
    case "ml":
      return "₺/ml";
    case "l":
      return "₺/L";
    case "g":
      return "₺/g";
    case "kg":
      return "₺/kg";
    default:
      return "₺/adet";
  }
}

function parseUnitToken(unit: string | null | undefined): PackUnit | null {
  if (!unit) return null;
  const u = unit.toLocaleLowerCase("tr-TR").trim();
  if (!u) return null;
  if (["ml", "cc"].includes(u)) return "ml";
  if (["l", "lt", "litre", "liter"].includes(u)) return "l";
  if (["kg"].includes(u)) return "kg";
  if (["g", "gr", "gram"].includes(u)) return "g";
  if (["adet", "ad", "pk", "paket"].includes(u)) return "adet";
  return canonicalizeUnit(u);
}

/**
 * Purchased count on the expense line — pack size in the name is NOT quantity.
 * Fuel litres and explicit "2 adet" from the receipt are kept.
 */
export function resolvePurchaseQuantity(input: {
  quantity: number | null | undefined;
  unit: string | null | undefined;
  name: string | null | undefined;
}): { quantity: number; unit: string } {
  const explicitUnit = parseUnitToken(input.unit);
  if (
    input.quantity != null &&
    input.quantity > 0 &&
    explicitUnit &&
    explicitUnit !== "adet"
  ) {
    return { quantity: input.quantity, unit: input.unit!.toUpperCase() };
  }
  if (input.quantity != null && input.quantity > 0) {
    const fromName = parsePackSize(input.name);
    if (
      fromName &&
      fromName.unit !== "adet" &&
      Math.abs(fromName.amount - input.quantity) < 0.001
    ) {
      return { quantity: 1, unit: "adet" };
    }
    return { quantity: input.quantity, unit: "adet" };
  }
  return { quantity: 1, unit: "adet" };
}

/**
 * Unit price = paid price ÷ normalized pack size (always ₺/kg or ₺/L when applicable).
 */
export function computeUnitPrice(input: {
  totalPrice: number | null | undefined;
  quantity: number | null | undefined;
  unit: string | null | undefined;
  name: string | null | undefined;
  existingUnitPrice?: number | null;
}): UnitPriceInfo {
  const total = input.totalPrice;
  if (total == null || !Number.isFinite(total) || total <= 0) {
    return {
      unitPrice: input.existingUnitPrice ?? null,
      unitLabel: null,
      packAmount: null,
      packUnit: null,
    };
  }

  const explicitUnit = parseUnitToken(input.unit);
  if (
    input.quantity != null &&
    input.quantity > 0 &&
    explicitUnit &&
    explicitUnit !== "adet"
  ) {
    const normalized = normalizeMeasureForPricing(input.quantity, explicitUnit);
    return {
      unitPrice: total / normalized.amount,
      unitLabel: normalized.unitLabel,
      packAmount: normalized.amount,
      packUnit: normalized.unit,
    };
  }

  const fromName = parsePackSize(input.name);
  if (fromName && fromName.unit !== "adet") {
    const normalized = normalizeMeasureForPricing(fromName.amount, fromName.unit);
    return {
      unitPrice: total / normalized.amount,
      unitLabel: normalized.unitLabel,
      packAmount: normalized.amount,
      packUnit: normalized.unit,
    };
  }

  if (input.quantity != null && input.quantity > 1) {
    return {
      unitPrice: total / input.quantity,
      unitLabel: "₺/adet",
      packAmount: input.quantity,
      packUnit: "adet",
    };
  }

  return {
    unitPrice: input.existingUnitPrice ?? null,
    unitLabel: input.existingUnitPrice != null ? "₺/adet" : null,
    packAmount: fromName?.amount ?? input.quantity ?? 1,
    packUnit: fromName?.unit ?? explicitUnit ?? "adet",
  };
}

export function formatUnitPrice(
  unitPrice: number | null | undefined,
  unitLabel: string | null | undefined
): string | null {
  if (unitPrice == null || !Number.isFinite(unitPrice)) return null;
  const n = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: unitPrice < 1 ? 2 : 2,
    maximumFractionDigits: unitPrice < 1 ? 4 : 2,
  }).format(unitPrice);
  if (!unitLabel) return `₺${n}`;
  // unitLabel like "₺/g" → "0,025 ₺/g"
  return `${n} ${unitLabel}`;
}
