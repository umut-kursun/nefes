import { OCR_ONLY_VISION_PROMPT } from "./ocrOnlyPrompt";
import {
  extractJsonFromModelContent,
  parseVisionResult,
} from "./parseVisionResult";
import type {
  OpenAiVisionOcrOptions,
  VisionOcrInput,
  VisionOcrProviderResult,
} from "./types";

export async function readReceiptWithVisionOcr(
  input: VisionOcrInput,
  options: OpenAiVisionOcrOptions
): Promise<VisionOcrProviderResult> {
  const model = options.model ?? "gpt-4o-mini";
  const imageDetail = options.imageDetail ?? "auto";

  const images = [input.imageDataUrl];
  if (input.altImageDataUrl && options.includeAltImage !== false) {
    images.push(input.altImageDataUrl);
  }

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail?: "high" | "low" } }
  > = [{ type: "text", text: OCR_ONLY_VISION_PROMPT }];

  for (const url of images) {
    const image_url: { url: string; detail?: "high" | "low" } = { url };
    if (imageDetail === "high" || imageDetail === "low") {
      image_url.detail = imageDetail;
    }
    content.push({ type: "image_url", image_url });
  }

  const requestStart = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Vision OCR failed (${res.status}): ${errText.slice(0, 280)}`
    );
  }

  const openAiRequestMs = Date.now() - requestStart;
  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = completion.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("Vision OCR returned empty content");

  const jsonParseStart = Date.now();
  const rawVisionOutput = extractJsonFromModelContent(rawContent);
  const result = parseVisionResult(rawVisionOutput);
  const jsonParseMs = Date.now() - jsonParseStart;

  return {
    result,
    rawVisionResponse: rawContent,
    openAiRequestMs,
    jsonParseMs,
  };
}
