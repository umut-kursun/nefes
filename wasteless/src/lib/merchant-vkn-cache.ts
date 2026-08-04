import type { ParsedReceipt } from "@/lib/receipt-engine-sdk/types/ParsedReceipt";

export interface MerchantVknRecord {
  vkn: string;
  name: string;
  category: ParsedReceipt["merchant"]["category"];
  updatedAt: string;
}

const STORAGE_KEY = "wasteless_merchant_vkn_v1";

function readStore(): Record<string, MerchantVknRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MerchantVknRecord>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, MerchantVknRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function lookupVknMerchant(vkn: string): MerchantVknRecord | null {
  const key = vkn.replace(/\D/g, "");
  if (!key) return null;
  return readStore()[key] ?? null;
}

export function saveVknMerchant(record: MerchantVknRecord): void {
  const key = record.vkn.replace(/\D/g, "");
  if (!key) return;
  const store = readStore();
  store[key] = { ...record, vkn: key, updatedAt: new Date().toISOString() };
  writeStore(store);
}

const CATEGORY_TO_MERCHANT: Record<
  ParsedReceipt["merchant"]["category"],
  ParsedReceipt["merchant"]["category"]
> = {
  RESTAURANT: "RESTAURANT",
  MARKET: "MARKET",
  FUEL: "FUEL",
  PHARMACY: "PHARMACY",
  RETAIL: "RETAIL",
  OTHER: "OTHER",
};

/** Apply cached VKN merchant name/category when available. */
export async function applyVknMerchantCache(
  parsed: ParsedReceipt
): Promise<ParsedReceipt> {
  const vkn = parsed.merchant.vknTckn?.replace(/\D/g, "") ?? "";
  if (!vkn) return parsed;

  const cached = lookupVknMerchant(vkn);
  if (!cached) return parsed;

  return {
    ...parsed,
    merchant: {
      ...parsed.merchant,
      title: cached.name || parsed.merchant.title,
      category: CATEGORY_TO_MERCHANT[cached.category] ?? parsed.merchant.category,
    },
    confidence: Math.max(parsed.confidence ?? 0.8, 0.92),
  };
}

export async function rememberVknMerchant(parsed: ParsedReceipt): Promise<void> {
  const vkn = parsed.merchant.vknTckn?.replace(/\D/g, "") ?? "";
  if (!vkn || !parsed.merchant.title) return;
  saveVknMerchant({
    vkn,
    name: parsed.merchant.title,
    category: parsed.merchant.category,
    updatedAt: new Date().toISOString(),
  });
}
