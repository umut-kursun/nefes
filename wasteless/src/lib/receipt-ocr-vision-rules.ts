/**
 * Shared verbatim OCR / rawText transcription rules for Vision API prompts.
 * Prevents garbage-in: skipped lines, merged name/price rows, lost multipliers/discounts.
 */
export const VISION_RAW_TEXT_TRANSCRIPTION_RULES = `
RAW TEXT TRANSCRIPTION (rawText field — CRITICAL):

1. DO NOT skip any lines. Read every single product, multiplier, and discount exactly as printed.
   - Include every product row even if the name is partial or noisy (e.g. "Mlife Yumurta", "Vivident").
   - Never omit lines because they look redundant or hard to read.

2. DO NOT merge a product name with the price of the line below it (or above it).
   - Each physical printed line = exactly one line in rawText.
   - WRONG: "VIVIDENT 149,95" when 149,95 belongs to the next product on the receipt.
   - RIGHT: product name on its own line; *price on the same horizontal row as that product.

3. CRITICAL — Multiplier lines MUST be transcribed exactly as they appear, preserving order:
   - Examples: "3 AD x 25,90 TL/AD", "5 ad X 19.90", "0.744 kg X 89.90", "9 AD x 40,00"
   - Keep multiplier lines adjacent to their product block — do NOT move them to another product.
   - Do NOT drop standalone multiplier-only lines.

4. CRITICAL — Discount lines MUST include their full negative amount:
   - Examples: "% 25 % İNDİRİM %1 *-57,49", "*-12,50", "İNDİRİM *-57,49"
   - Copy the minus sign and all digits/kuruş — never truncate numbers at line end.
   - Discount lines stay on their own rawText line, directly under the product they discount.

5. Preserve top-to-bottom line order, spacing quirks, abbreviations, and OCR artifacts.
   - Do NOT normalize Turkish characters, fix spelling, or interpret categories in rawText.
   - Asterisk amounts (*149,95, *-57,49), VAT tokens (%1, %10), and TL suffixes — copy exactly.
`.trim();

/** Compact rules for OCR-only endpoints returning { rawText, lines }. */
export const OCR_EXTRACT_SYSTEM_RULES = `${VISION_RAW_TEXT_TRANSCRIPTION_RULES}

Return JSON only: { "rawText": string, "lines": [{ "text": string, "confidence": number }] }
- Verbatim transcription only. No interpretation, categorization, or correction beyond faithful copying.
- confidence is 0-1 per line based on OCR certainty.
- Do not add fields beyond rawText and lines.`;

export const OCR_DOCUMENT_EXTRACT_RULES = `${VISION_RAW_TEXT_TRANSCRIPTION_RULES}

Return ONLY valid JSON: { "rawText": string }
- Do NOT interpret, categorize, or structure the data in this step.
- Include merchant header, all product lines, multiplier lines, discount lines, VAT columns, totals, footer text.`;
