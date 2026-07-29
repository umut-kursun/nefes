import type { CatalogSnapshot } from "./catalogSnapshot";
import { CATALOG_KV_KEY } from "./catalogSnapshot";

export type CatalogKvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export type PublishCatalogResult =
  | { ok: true; snapshot: CatalogSnapshot }
  | { ok: false; status: 409; error: string; currentVersion: number };

export type PublishCatalogBody = {
  expectedVersion: number;
  products: CatalogSnapshot["products"];
  aliases: CatalogSnapshot["aliases"];
  brands: CatalogSnapshot["brands"];
  categories: CatalogSnapshot["categories"];
};

export async function readCatalogFromKv(
  kv: CatalogKvBinding
): Promise<CatalogSnapshot | null> {
  let raw: string | null;
  try {
    raw = await kv.get(CATALOG_KV_KEY);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "KV catalog read failed"
    );
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CatalogSnapshot;
    if (!parsed || typeof parsed.version !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Atomically replace the canonical catalog snapshot.
 * Uses optimistic version check — rejects stale writes (409).
 */
export async function publishCatalogToKv(
  kv: CatalogKvBinding,
  body: PublishCatalogBody
): Promise<PublishCatalogResult> {
  const current = await readCatalogFromKv(kv);
  const currentVersion = current?.version ?? 0;

  if (body.expectedVersion !== currentVersion) {
    return {
      ok: false,
      status: 409,
      error:
        "Catalog version conflict — refresh and retry. A newer catalog was published.",
      currentVersion,
    };
  }

  const next: CatalogSnapshot = {
    version: currentVersion + 1,
    updatedAt: new Date().toISOString(),
    products: body.products,
    aliases: body.aliases,
    brands: body.brands,
    categories: body.categories,
  };

  await kv.put(CATALOG_KV_KEY, JSON.stringify(next));
  return { ok: true, snapshot: next };
}

/** In-memory + file fallback for local Next.js dev (no KV binding). */
let devCatalog: CatalogSnapshot | null = null;

export function readDevCatalog(): CatalogSnapshot | null {
  return devCatalog;
}

export function publishDevCatalog(
  body: PublishCatalogBody
): PublishCatalogResult {
  const currentVersion = devCatalog?.version ?? 0;
  if (body.expectedVersion !== currentVersion) {
    return {
      ok: false,
      status: 409,
      error: "Catalog version conflict",
      currentVersion,
    };
  }
  const next: CatalogSnapshot = {
    version: currentVersion + 1,
    updatedAt: new Date().toISOString(),
    products: body.products,
    aliases: body.aliases,
    brands: body.brands,
    categories: body.categories,
  };
  devCatalog = next;
  return { ok: true, snapshot: next };
}

export function invalidateDevCatalog(): void {
  devCatalog = null;
}
