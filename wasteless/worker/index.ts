import { analyzeReceiptFormData } from "../src/lib/analyze-receipt";
import { analyzeReceiptEngineFormData } from "../src/lib/receipt-engine-analyze";
import { analyzeReceiptEngineWithDebug } from "../src/lib/receipt-engine-analyze-debug";
import { debugReceiptEngineFormData } from "../src/lib/receipt-engine-debug-analyze";
import { isDebugExportEnabled } from "../src/lib/receipt-engine-debug/devGuard";
import {
  stampTimeline,
  type ScanTimeline,
} from "../src/lib/receipt-scan-timeline";
import { loadCanonicalCatalog } from "../src/lib/product-knowledge/catalogLoader";
import { readCatalogFromKv } from "../src/lib/product-knowledge/catalogKv";
import {
  handleKbCatalogGet,
  handleKbCatalogOptions,
  handleKbCatalogPut,
  wrapKbCatalogResponse,
} from "./kb-catalog-handlers";
import { handleKbNormalizeRow, handleKbVerify } from "./kb-handlers";

export interface Env {
  ASSETS: Fetcher;
  OPENAI_API_KEY: string;
  OPENAI_VISION_MODEL?: string;
  OPENAI_OCR_MODEL?: string;
  KB_ADMIN_PASSWORD?: string;
  KB_CATALOG?: KVNamespace;
  RECEIPT_ENGINE_DEBUG_EXPORT?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function loadWorkerCatalog(env: Env): Promise<{
  snapshot: import("../src/lib/product-knowledge/catalogSnapshot").CatalogSnapshot | null;
  fallbackNote?: string;
}> {
  if (!env.KB_CATALOG) {
    const reason = "KB_CATALOG binding not configured";
    console.warn(`[kb] ${reason} — using bundled seed catalog`);
    return { snapshot: null, fallbackNote: reason };
  }

  const loaded = await loadCanonicalCatalog(
    () => readCatalogFromKv(env.KB_CATALOG!),
    {
      onFallback: (reason) => {
        console.warn(
          `[kb] KV unavailable — falling back to bundled seed catalog: ${reason}`
        );
      },
    }
  );

  return {
    snapshot: loaded.snapshot,
    fallbackNote: loaded.fallbackReason,
  };
}

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return json(
      {
        error:
          "OPENAI_API_KEY tanımlı değil. Cloudflare Worker secret olarak ekleyin.",
      },
      500
    );
  }

  try {
    const form = await request.formData();
    const catalog = await loadWorkerCatalog(env);
    const result = await analyzeReceiptFormData(form, {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_VISION_MODEL,
      catalogSnapshot: catalog.snapshot,
      catalogFallbackNote: catalog.fallbackNote,
    });

    if ("error" in result) {
      return json(
        {
          error: result.error,
          details: result.details,
          raw: result.raw,
        },
        result.status
      );
    }

    return json(result);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Analiz sırasında bir hata oluştu.",
      },
      500
    );
  }
}

async function handleReceiptEngine(request: Request, env: Env): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return json({ error: "Sunucu yapılandırması eksik." }, 500);
  }

  try {
    const form = await request.formData();
    const serverTimeline: ScanTimeline = {};
    stampTimeline(serverTimeline, "t4_worker_request_received");

    const scanTraceId =
      typeof form.get("scanTraceId") === "string"
        ? String(form.get("scanTraceId"))
        : undefined;

    const model = env.OPENAI_OCR_MODEL ?? env.OPENAI_VISION_MODEL;
    const debugEnabled = isDebugExportEnabled(env);
    const result = debugEnabled
      ? await analyzeReceiptEngineWithDebug(form, {
          apiKey: env.OPENAI_API_KEY,
          model,
          serverTimeline,
          scanTraceId,
        })
      : await analyzeReceiptEngineFormData(form, {
          apiKey: env.OPENAI_API_KEY,
          model,
          serverTimeline,
          scanTraceId,
        });

    if ("error" in result) {
      return json(
        { error: result.error, failureCode: result.failureCode },
        result.status
      );
    }

    stampTimeline(serverTimeline, "t8_worker_response_sent");
    if (result.scanTimeline) {
      result.scanTimeline = {
        ...result.scanTimeline,
        server: { ...serverTimeline },
        merged: { ...result.scanTimeline.merged, ...serverTimeline },
      };
    }

    return json(result);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "İşlem başarısız oldu. Lütfen tekrar deneyin.",
      },
      500
    );
  }
}

async function handleReceiptEngineDebug(
  request: Request,
  env: Env
): Promise<Response> {
  if (!isDebugExportEnabled(env)) {
    return json({ error: "Not found." }, 404);
  }
  if (!env.OPENAI_API_KEY) {
    return json({ error: "Sunucu yapılandırması eksik." }, 500);
  }

  try {
    const form = await request.formData();
    const model = env.OPENAI_OCR_MODEL ?? env.OPENAI_VISION_MODEL;
    const result = await debugReceiptEngineFormData(form, {
      apiKey: env.OPENAI_API_KEY,
      model,
    });

    if ("error" in result) {
      return json(
        { error: result.error, failureCode: result.failureCode },
        result.status
      );
    }

    return json(result);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Debug trace failed.",
      },
      500
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        });
      }
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      return handleAnalyze(request, env);
    }

    if (url.pathname === "/api/receipt-engine/debug") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        });
      }
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      return handleReceiptEngineDebug(request, env);
    }

    if (url.pathname === "/api/receipt-engine") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        });
      }
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      return handleReceiptEngine(request, env);
    }

    if (url.pathname === "/api/kb/catalog") {
      if (request.method === "OPTIONS") {
        return handleKbCatalogOptions();
      }
      if (request.method === "GET") {
        return wrapKbCatalogResponse(await handleKbCatalogGet(env));
      }
      if (request.method === "PUT") {
        return wrapKbCatalogResponse(await handleKbCatalogPut(request, env));
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/kb/verify") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        });
      }
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      return handleKbVerify(request, env);
    }

    if (url.pathname === "/api/kb/normalize-row") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        });
      }
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      return handleKbNormalizeRow(request, env);
    }

    // Static Next.js export (out/) — SPA fallback for unknown paths
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
