import { tokenizeReceiptLinesFlat } from "../tokenizer/tokenizeReceiptLines";
import type { ReceiptDocument } from "../extraction/types";
import type { VisionResult } from "../vision/types";
import type { ValidationReport } from "@/lib/receipt-engine/types/models/validation";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";

export type PipelineDiagnostic = {
  readonly rawVisionLines: readonly string[];
  readonly normalizedLines: readonly string[];
  readonly tokens: ReturnType<typeof tokenizeReceiptLinesFlat>;
  readonly receiptDocument: ReceiptDocument;
  readonly purchaseDraft: PurchaseDraft;
  readonly validation: ValidationReport;
  readonly divergenceNotes: readonly string[];
};

export function buildPipelineDiagnostic(input: {
  vision: VisionResult;
  normalizedLines: readonly string[];
  receiptDocument: ReceiptDocument;
  purchaseDraft: PurchaseDraft;
  validation: ValidationReport;
  fixtureLines?: readonly string[];
}): PipelineDiagnostic {
  const notes: string[] = [];
  const { vision, normalizedLines, fixtureLines } = input;

  if (fixtureLines?.length) {
    const liveStar = (normalizedLines.join("\n").match(/\*[\d.,\-]+/g) ?? []).length;
    const fixStar = (fixtureLines.join("\n").match(/\*[\d.,\-]+/g) ?? []).length;
    if (fixStar > liveStar) {
      notes.push(
        `Live OCR has ${liveStar} star-amounts vs fixture ${fixStar} — product prices may be missing from Vision output.`
      );
    }
    for (let i = 0; i < Math.min(fixtureLines.length, normalizedLines.length); i++) {
      if (fixtureLines[i] !== normalizedLines[i]) {
        notes.push(`First line divergence at index ${i}: live="${normalizedLines[i]}" fixture="${fixtureLines[i]}"`);
        break;
      }
    }
  }

  if (input.receiptDocument.products.length === 0 && normalizedLines.some((l) => /[A-ZÇĞİÖŞÜ]{4,}/.test(l))) {
    notes.push("Product-like text present in OCR but semantic extractor returned zero products.");
  }

  if (input.purchaseDraft.total?.amount == null && input.receiptDocument.footer.total != null) {
    notes.push("Footer total not propagated to PurchaseDraft.");
  }

  return {
    rawVisionLines: vision.lines,
    normalizedLines,
    tokens: tokenizeReceiptLinesFlat(normalizedLines),
    receiptDocument: input.receiptDocument,
    purchaseDraft: input.purchaseDraft,
    validation: input.validation,
    divergenceNotes: notes,
  };
}
