import {
  publishCatalogToKv,
  readCatalogFromKv,
  type PublishCatalogBody,
} from "../src/lib/product-knowledge/catalogKv";
import { invalidateIsolateCatalogCache } from "../src/lib/product-knowledge/catalogLoader";
import type { CatalogKvBinding } from "../src/lib/product-knowledge/catalogKv";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, PUT, OPTIONS",
      "access-control-allow-headers": "content-type, x-kb-admin-password",
    },
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isKbAdminAuthorized(
  request: Request,
  adminPassword?: string
): boolean {
  if (!adminPassword) return false;
  const header = request.headers.get("X-KB-Admin-Password");
  return header === adminPassword;
}

export async function handleKbCatalogGet(
  env: { KB_CATALOG?: CatalogKvBinding }
): Promise<Response> {
  if (!env.KB_CATALOG) {
    return json({ error: "KB_CATALOG KV binding not configured." }, 503);
  }
  const snapshot = await readCatalogFromKv(env.KB_CATALOG);
  if (!snapshot) {
    return json({ version: 0, updatedAt: null, products: [], aliases: [], brands: [], categories: [] });
  }
  return json(snapshot);
}

export async function handleKbCatalogPut(
  request: Request,
  env: { KB_CATALOG?: CatalogKvBinding; KB_ADMIN_PASSWORD?: string }
): Promise<Response> {
  if (!env.KB_CATALOG) {
    return json({ error: "KB_CATALOG KV binding not configured." }, 503);
  }
  if (!isKbAdminAuthorized(request, env.KB_ADMIN_PASSWORD)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: PublishCatalogBody;
  try {
    body = (await request.json()) as PublishCatalogBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (
    typeof body.expectedVersion !== "number" ||
    !Array.isArray(body.products) ||
    !Array.isArray(body.aliases) ||
    !Array.isArray(body.brands) ||
    !Array.isArray(body.categories)
  ) {
    return json({ error: "Invalid catalog payload" }, 400);
  }

  const result = await publishCatalogToKv(env.KB_CATALOG, body);
  if (!result.ok) {
    return json(
      { error: result.error, currentVersion: result.currentVersion },
      409
    );
  }

  invalidateIsolateCatalogCache();
  return json(result.snapshot);
}

export function handleKbCatalogOptions(): Response {
  return corsPreflight();
}

export function wrapKbCatalogResponse(response: Response): Response {
  return withCors(response);
}
