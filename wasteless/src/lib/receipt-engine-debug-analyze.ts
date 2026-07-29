import { arrayBufferToBase64 } from "@/lib/analyze-receipt-helpers";
import {
  createTraceDependencies,
  traceReceiptEngine,
  type PipelineTrace,
} from "@/lib/receipt-engine-debug/tracePipeline";
import {
  saveTraceArtifacts,
  shouldSaveTraceToDisk,
} from "@/lib/receipt-engine-debug/saveTrace";

export type ReceiptEngineDebugSuccess = PipelineTrace;

export type ReceiptEngineDebugFailure = {
  error: string;
  failureCode?: string;
  status: number;
};

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(bytes);
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

export async function debugReceiptEngineFormData(
  form: FormData,
  options: { apiKey: string; model?: string }
): Promise<ReceiptEngineDebugSuccess | ReceiptEngineDebugFailure> {
  const file = form.get("image");
  const altFile = form.get("imageAlt");
  const originalUrlField = form.get("originalDataUrl");
  const hint = String(form.get("sourceHint") || "receipt");
  const preprocessMsRaw = form.get("preprocessMs");
  const preprocessMs =
    typeof preprocessMsRaw === "string" && preprocessMsRaw.trim()
      ? Number(preprocessMsRaw)
      : undefined;

  if (!(file instanceof File)) {
    return { error: "Görsel gerekli.", status: 400 };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Görsel 10MB'dan küçük olmalı.", status: 400 };
  }

  const primaryDataUrl = await fileToDataUrl(file);
  const displayDataUrl =
    typeof originalUrlField === "string" && originalUrlField.startsWith("data:")
      ? originalUrlField
      : primaryDataUrl;

  let altImageDataUrl: string | undefined;
  if (altFile instanceof File && altFile.size <= 10 * 1024 * 1024) {
    altImageDataUrl = await fileToDataUrl(altFile);
  }

  const deps = createTraceDependencies(options);

  try {
    const trace = await traceReceiptEngine(
      {
        imagePrimary: {
          dataUrl: primaryDataUrl,
          variant: "enhanced",
          preprocessMs: Number.isFinite(preprocessMs) ? preprocessMs : undefined,
        },
        imageAlt: altImageDataUrl
          ? { dataUrl: altImageDataUrl, variant: "threshold" }
          : undefined,
        sourceHint: hint,
        imageDataUrl: displayDataUrl,
      },
      deps
    );

    if (shouldSaveTraceToDisk()) {
      const savedTo = saveTraceArtifacts(
        trace.traceId,
        trace.stages,
        {
          traceId: trace.traceId,
          createdAt: trace.createdAt,
          sourceHint: trace.sourceHint,
          imageDataUrl: "[omitted — see API response]",
        }
      );
      trace.savedTo = savedTo;
    }

    return trace;
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : "Receipt Engine debug trace failed.",
      status: 500,
    };
  }
}
