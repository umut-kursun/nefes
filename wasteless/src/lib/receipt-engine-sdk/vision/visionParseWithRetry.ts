import type { ParsedReceipt } from "../types/ParsedReceipt";
import { finalizeVisionParsedReceipt } from "../types/ParsedReceipt";
import {
  buildVisionRetryInstruction,
  validateParsedReceiptLineItems,
  validateParsedReceiptMath,
  type ParsedReceiptLineItemCheck,
  type ParsedReceiptMathCheck,
} from "./parsedReceiptValidation";
import {
  parseReceiptWithVision,
  type OpenAiVisionParseOptions,
  type VisionParseInput,
} from "./openAiVisionParseProvider";

export interface VisionParseWithRetryOptions extends OpenAiVisionParseOptions {
  readonly maxRetries?: number;
  readonly tolerance?: number;
}

export interface VisionParseWithRetryResult {
  readonly parsed: ParsedReceipt;
  /** Exact vision model `message.content` for the attempt that produced `parsed`. */
  readonly rawVisionResponse: string;
  readonly retried: boolean;
  readonly math: ParsedReceiptMathCheck;
  readonly lineChecks: readonly ParsedReceiptLineItemCheck[];
}

function needsRetry(
  math: ParsedReceiptMathCheck,
  lineChecks: readonly ParsedReceiptLineItemCheck[]
): boolean {
  return !math.ok || lineChecks.some((c) => !c.ok);
}

/**
 * Direct vision parse with one automatic retry when line-item math or receipt total fails.
 * Uses normalizeVisionReceipt — deterministic post-process from rawText when LLM misbinds.
 */
export async function parseReceiptWithVisionRetry(
  input: VisionParseInput,
  options: VisionParseWithRetryOptions
): Promise<VisionParseWithRetryResult> {
  const maxRetries = options.maxRetries ?? 1;
  const tolerance = options.tolerance;

  let visionResult = await parseReceiptWithVision(input, options);
  let lineChecks = validateParsedReceiptLineItems(visionResult.parsed);
  let parsed = finalizeVisionParsedReceipt(visionResult.parsed);
  let math = validateParsedReceiptMath(parsed, tolerance);

  if (needsRetry(math, lineChecks) && maxRetries > 0) {
    visionResult = await parseReceiptWithVision(input, {
      apiKey: options.apiKey,
      model: options.model,
      retryInstruction: buildVisionRetryInstruction(
        math.itemSum,
        math.total,
        lineChecks
      ),
    });
    lineChecks = validateParsedReceiptLineItems(visionResult.parsed);
    parsed = finalizeVisionParsedReceipt(visionResult.parsed);
    math = validateParsedReceiptMath(parsed, tolerance);
    return Object.freeze({
      parsed,
      rawVisionResponse: visionResult.rawVisionResponse,
      retried: true,
      math,
      lineChecks,
    });
  }

  return Object.freeze({
    parsed,
    rawVisionResponse: visionResult.rawVisionResponse,
    retried: false,
    math,
    lineChecks,
  });
}
