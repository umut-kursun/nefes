import type { CatalogSnapshot } from "./catalogSnapshot";
import type { PublishCatalogBody, PublishCatalogResult } from "./catalogKv";
import { getKbAdminPassword } from "./adminAuth";

export async function fetchCanonicalCatalog(): Promise<CatalogSnapshot | null> {
  try {
    const res = await fetch("/api/kb/catalog", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as CatalogSnapshot;
    if (typeof json.version !== "number") return null;
    if (json.version <= 0) return null;
    return json;
  } catch {
    return null;
  }
}

export async function publishCanonicalCatalog(
  body: PublishCatalogBody
): Promise<PublishCatalogResult> {
  const password = getKbAdminPassword();
  if (!password) {
    return {
      ok: false,
      status: 409,
      error: "Admin oturumu süresi doldu — tekrar giriş yapın.",
      currentVersion: body.expectedVersion,
    };
  }

  const res = await fetch("/api/kb/catalog", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "X-KB-Admin-Password": password,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    const json = (await res.json()) as {
      error?: string;
      currentVersion?: number;
    };
    return {
      ok: false,
      status: 409,
      error: json.error ?? "Catalog version conflict",
      currentVersion: json.currentVersion ?? 0,
    };
  }

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? `Publish failed (${res.status})`);
  }

  const snapshot = (await res.json()) as CatalogSnapshot;
  return { ok: true, snapshot };
}
