import { arrayBufferToBase64 } from "@/lib/analyze-receipt-helpers";
import {
  saveOcrDebugResponse,
  shouldSaveOcrDebugToDisk,
} from "@/lib/ocr-debug/saveOcrTrace";

const OCR_SYSTEM_PROMPT = `You are an OCR engine. Extract ALL visible text from the receipt image verbatim.
Return JSON only: { "rawText": string, "lines": [{ "text": string, "confidence": number }] }
Rules:
- Verbatim transcription only. No interpretation, categorization, or correction.
- Preserve line order top-to-bottom.
- confidence is 0-1 per line based on OCR certainty.
- Do not add fields beyond rawText and lines.`;

export interface OcrDebugUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OcrDebugSuccess {
  traceId: string;
  durationMs: number;
  model: string;
  usage: OcrDebugUsage;
  rawApiResponse: unknown;
  rawContent: string;
  parsedContent?: unknown;
  rawText?: string;
  imageDataUrl: string;
  savedTo?: string;
  createdAt: string;
}

export type OcrDebugFailure = {
  error: string;
  status: number;
};

interface OpenAiChatCompletionResponse {
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: Array<{ message?: { content?: string } }>;
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(bytes);
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

function parseUsage(
  usage: OpenAiChatCompletionResponse["usage"]
): OcrDebugUsage {
  return {
    prompt_tokens: usage?.prompt_tokens ?? 0,
    completion_tokens: usage?.completion_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
  };
}

function tryParseContent(content: string): {
  parsedContent?: unknown;
  rawText?: string;
} {
  try {
    const parsedContent = JSON.parse(content) as { rawText?: string };
    const rawText =
      typeof parsedContent.rawText === "string"
        ? parsedContent.rawText
        : undefined;
    return { parsedContent, rawText };
  } catch {
    return {};
  }
}

export async function runOcrDebugFormData(
  form: FormData,
  options: { apiKey: string; model?: string; detail?: "auto" | "low" | "high" }
): Promise<OcrDebugSuccess | OcrDebugFailure> {
  const file = form.get("image");

  if (!(file instanceof File)) {
    return { error: "Görsel gerekli.", status: 400 };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Görsel 10MB'dan küçük olmalı.", status: 400 };
  }

  const model =
    options.model ??
    process.env.OPENAI_OCR_MODEL ??
    process.env.OPENAI_VISION_MODEL ??
    "gpt-4o-mini";
  const detail = options.detail ?? "high";
  const imageDataUrl = await fileToDataUrl(file);
  const traceId = `ocr-${Date.now()}`;
  const createdAt = new Date().toISOString();

  const started = Date.now();
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: OCR_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageDataUrl, detail },
              },
            ],
          },
        ],
        temperature: 0,
      }),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "OpenAI OCR request failed.",
      status: 502,
    };
  }

  const durationMs = Date.now() - started;

  if (!response.ok) {
    const errText = await response.text();
    return {
      error: `OpenAI OCR failed (${response.status}): ${errText.slice(0, 300)}`,
      status: 502,
    };
  }

  const rawApiResponse =
    (await response.json()) as OpenAiChatCompletionResponse;
  const rawContent = rawApiResponse.choices?.[0]?.message?.content;

  if (!rawContent) {
    return { error: "OpenAI OCR returned empty content.", status: 502 };
  }

  const { parsedContent, rawText } = tryParseContent(rawContent);
  const result: OcrDebugSuccess = {
    traceId,
    durationMs,
    model: rawApiResponse.model ?? model,
    usage: parseUsage(rawApiResponse.usage),
    rawApiResponse,
    rawContent,
    parsedContent,
    rawText,
    imageDataUrl,
    createdAt,
  };

  if (shouldSaveOcrDebugToDisk()) {
    result.savedTo = saveOcrDebugResponse(traceId, result);
  }

  return result;
}
