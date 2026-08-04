import {
  parseParsedReceiptJson,
  type ParsedReceipt,
} from "../types/ParsedReceipt";
import {
  OKC_VISION_PARSE_PROMPT,
  PARSED_RECEIPT_VISION_JSON_SCHEMA,
} from "./okcVisionPrompt";

export interface VisionParseInput {
  imageDataUrl: string;
  altImageDataUrl?: string;
}

export interface OpenAiVisionParseOptions {
  apiKey: string;
  model?: string;
  /** Appended when retrying after TOTAL_MISMATCH / math failure. */
  retryInstruction?: string;
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1]?.trim() ?? trimmed;
  return JSON.parse(body);
}

export { PARSED_RECEIPT_VISION_JSON_SCHEMA };

export type VisionParseResult = {
  readonly parsed: ParsedReceipt;
  /** Exact `message.content` from OpenAI before any parsing or normalization. */
  readonly rawVisionResponse: string;
};

export async function parseReceiptWithVision(
  input: VisionParseInput,
  options: OpenAiVisionParseOptions
): Promise<VisionParseResult> {
  const model = options.model ?? "gpt-4o-mini";
  const images = [input.imageDataUrl];
  if (input.altImageDataUrl) images.push(input.altImageDataUrl);

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" | "low" } }
  > = [{ type: "text", text: OKC_VISION_PARSE_PROMPT }];
  if (options.retryInstruction) {
    content.push({ type: "text", text: options.retryInstruction });
  }
  for (const url of images) {
    content.push({
      type: "image_url",
      image_url: { url, detail: "high" },
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vision parse failed (${res.status}): ${errText.slice(0, 280)}`);
  }

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = completion.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("Vision parse returned empty content");

  const rawVisionOutput = extractJson(rawContent);

  return {
    parsed: parseParsedReceiptJson(rawVisionOutput),
    rawVisionResponse: rawContent,
  };
}
