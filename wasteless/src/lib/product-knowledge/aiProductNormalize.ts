import { normalizeOcrKey } from "./productNormalizer";

const PRODUCT_OCR_SYSTEM = `You normalize a single grocery product line from Turkish receipt OCR.
Return ONLY valid JSON: { "normalized": "<clean product name>" }
Fix OCR garbling, spacing, and Turkish characters. Keep brand, variant, and package size when present.
Do not invent products. If unrecognizable, return { "normalized": "" }.`;

/** AI normalization for unresolved receipt OCR product lines (step 5). */
export async function aiNormalizeProductOcr(
  ocrText: string,
  apiKey: string,
  model = "gpt-4o-mini"
): Promise<string | null> {
  const trimmed = ocrText.trim();
  if (!trimmed) return null;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PRODUCT_OCR_SYSTEM },
          {
            role: "user",
            content: `Normalize this receipt OCR product line:\n${trimmed}`,
          },
        ],
      }),
    });

    if (!openaiRes.ok) return null;

    const completion = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { normalized?: string };
    const normalized = parsed.normalized?.trim();
    if (!normalized || normalizeOcrKey(normalized) === normalizeOcrKey(trimmed)) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}
