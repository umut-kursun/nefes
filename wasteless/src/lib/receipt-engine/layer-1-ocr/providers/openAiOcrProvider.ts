import type { OcrExtractInput, OcrExtractOutput, OcrProvider } from "./ocrProvider";
import { OCR_EXTRACT_SYSTEM_RULES } from "@/lib/receipt-ocr-vision-rules";

const OCR_SYSTEM_PROMPT = `You are an OCR engine. Extract ALL visible text from the receipt image verbatim.
${OCR_EXTRACT_SYSTEM_RULES}`;

export interface OpenAiOcrProviderOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly fetchImpl?: typeof fetch;
  readonly detail?: "auto" | "low" | "high";
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export function createOpenAiOcrProvider(
  options: OpenAiOcrProviderOptions
): OcrProvider {
  const model = options.model ?? "gpt-4o-mini";
  const fetchImpl = options.fetchImpl ?? fetch;
  const detail = options.detail ?? "high";

  return {
    kind: "openai",

    async extract(input: OcrExtractInput): Promise<OcrExtractOutput> {
      const imageUrl = input.altImageDataUrl ?? input.imageDataUrl;
      const response = await fetchImpl(
        "https://api.openai.com/v1/chat/completions",
        {
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
                    image_url: { url: imageUrl, detail },
                  },
                ],
              },
            ],
            temperature: 0,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `OpenAI OCR failed (${response.status}): ${errText.slice(0, 200)}`
        );
      }

      const completion = (await response.json()) as OpenAiChatResponse;
      const content = completion.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI OCR returned empty content");
      }

      const parsed = parseOpenAiOcrJson(
        content,
        input.altImageDataUrl ? "vision_alt" : "vision_primary"
      );
      return { ...parsed, rawVisionResponse: content };
    },
  };
}

function parseOpenAiOcrJson(
  content: string,
  source: OcrExtractOutput["source"]
): OcrExtractOutput {
  const parsed = JSON.parse(content) as {
    rawText?: string;
    lines?: Array<{ text?: string; confidence?: number }>;
  };

  const rawText = typeof parsed.rawText === "string" ? parsed.rawText : "";
  const lines = Array.isArray(parsed.lines)
    ? parsed.lines
        .filter((l) => typeof l.text === "string" && l.text.trim())
        .map((l) => ({
          text: l.text!.trim(),
          confidence:
            typeof l.confidence === "number" ? l.confidence : undefined,
        }))
    : undefined;

  const confidences = lines
    ?.map((l) => l.confidence)
    .filter((c): c is number => typeof c === "number");
  const documentConfidence =
    confidences && confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : undefined;

  return { rawText, lines, source, documentConfidence };
}
