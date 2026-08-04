import { OCR_DOCUMENT_EXTRACT_RULES } from "@/lib/receipt-ocr-vision-rules";

/** Stage 3 — extract verbatim OCR text only. No normalization at this stage. */
export const OCR_SYSTEM_PROMPT = `You are a document OCR engine for Turkish retail receipts and invoices.
Extract ONLY the raw printed text exactly as it appears on the document.

${OCR_DOCUMENT_EXTRACT_RULES}

If the image is a bank transfer screenshot with no receipt lines, still return visible text.`;

export const OCR_USER_PROMPT = (sourceHint: string) =>
  `Extract verbatim OCR text from this image. Source hint: ${sourceHint}. JSON only.`;
