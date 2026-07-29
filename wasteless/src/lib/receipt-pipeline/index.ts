import type { AnalysisResult } from "@/lib/types";
import { extractJson } from "@/lib/analyze-receipt-helpers";
import { finalizeReceiptAnalysis } from "@/lib/receipt-quality";
import type {
  PipelineInput,
  PipelineResult,
  StageLogEntry,
} from "./types";
import {
  createPipelineDebug,
  isFileMarketReceipt,
  logDebugStage,
  pipelineErrorMessage,
  validatePipelineAnalysis,
  type PipelineDebug,
  type PipelineFailureReason,
} from "./debug";
import { computeExpectedReceiptTotal } from "@/lib/receipt-quality";
import { detectDocumentType } from "./stages/document-detection";
import {
  COMBINED_VISION_PROMPT,
  COMBINED_USER_PROMPT,
} from "./stages/combined-vision-prompt";
import {
  PARSER_SYSTEM_PROMPT,
  buildParserUserPrompt,
  parseStructuredReceipt,
  attachVerbatimOcr,
} from "./stages/receipt-parser";
import { applyProductKnowledge } from "./stages/product-knowledge";
import { applyConfidenceScoring } from "./stages/confidence";
import { applyLearningStage } from "./stages/learning";

const RETRY_CONFIDENCE = 0.55;

function logStage(
  log: StageLogEntry[],
  stage: StageLogEntry["stage"],
  start: number,
  notes: string[]
) {
  const ms = Date.now() - start;
  log.push({ stage, ms, notes });
  console.info(`[receipt-pipeline] ${stage}: ${ms}ms`, notes.join(" · ") || "");
}

async function callVisionJson(options: {
  apiKey: string;
  model: string;
  dataUrl: string;
  system: string;
  userText: string;
  detail?: "auto" | "high";
}): Promise<{ content: string } | { error: string; status: number }> {
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.system },
        {
          role: "user",
          content: [
            { type: "text", text: options.userText },
            {
              type: "image_url",
              image_url: {
                url: options.dataUrl,
                detail: options.detail ?? "auto",
              },
            },
          ],
        },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    return {
      error: `OpenAI hatası (${openaiRes.status}): ${errText.slice(0, 280)}`,
      status: 502,
    };
  }

  const completion = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) return { error: "Model boş yanıt döndü.", status: 502 };
  return { content };
}

async function callVisionTextParse(options: {
  apiKey: string;
  model: string;
  system: string;
  userText: string;
}): Promise<{ content: string } | { error: string; status: number }> {
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.userText },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    return {
      error: `OpenAI hatası (${openaiRes.status}): ${errText.slice(0, 280)}`,
      status: 502,
    };
  }

  const completion = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) return { error: "Model boş yanıt döndü.", status: 502 };
  return { content };
}

function extractRawOcr(content: string): string | null {
  try {
    const parsed = extractJson(content) as { rawText?: string };
    return typeof parsed.rawText === "string" ? parsed.rawText : null;
  } catch {
    return null;
  }
}

function mergeAnalyses(
  primary: AnalysisResult,
  secondary: AnalysisResult
): AnalysisResult {
  const pick =
    secondary.confidence > primary.confidence ? secondary : primary;
  const other = pick === secondary ? primary : secondary;
  return {
    ...pick,
    merchantName: pick.merchantName || other.merchantName,
    date: pick.date || other.date,
    time: pick.time || other.time,
    totalAmount: pick.totalAmount ?? other.totalAmount,
    items:
      (pick.items?.length ?? 0) >= (other.items?.length ?? 0)
        ? pick.items
        : other.items,
    charges:
      (pick.charges?.length ?? 0) >= (other.charges?.length ?? 0)
        ? pick.charges ?? []
        : other.charges ?? [],
    discounts:
      (pick.discounts?.length ?? 0) >= (other.discounts?.length ?? 0)
        ? pick.discounts ?? []
        : other.discounts ?? [],
    payments:
      (pick.payments?.length ?? 0) >= (other.payments?.length ?? 0)
        ? pick.payments ?? []
        : other.payments ?? [],
    unknownLines:
      (pick.unknownLines?.length ?? 0) >= (other.unknownLines?.length ?? 0)
        ? pick.unknownLines ?? []
        : other.unknownLines ?? [],
    fuel: pick.fuel ?? other.fuel,
    rawText: primary.rawText || secondary.rawText || pick.rawText,
    confidence: Math.max(primary.confidence, secondary.confidence),
  };
}

export type PipelineFailure = {
  error: string;
  failureReason: PipelineFailureReason | string;
  status: number;
  debug: PipelineDebug;
  details?: unknown;
  raw?: unknown;
};

function failPipeline(
  debug: PipelineDebug,
  reason: PipelineFailureReason,
  status: number,
  details?: unknown,
  raw?: unknown
): PipelineFailure {
  debug.failureReason = reason;
  logDebugStage(debug, "validation", "fail", undefined, [reason]);
  return {
    error: pipelineErrorMessage(reason),
    failureReason: reason,
    status,
    debug,
    details,
    raw,
  };
}

function mapParseFailure(
  debug: PipelineDebug,
  parsed: {
    error: string;
    failureReason?: string;
    status: number;
    details?: unknown;
    raw?: unknown;
  }
): PipelineFailure {
  const reason =
    (parsed.failureReason as PipelineFailureReason | undefined) ??
    "Line parser failed";
  return failPipeline(debug, reason, parsed.status, parsed.details, parsed.raw);
}
/**
 * Run the 8-stage Purchase Memory reconstruction pipeline.
 * Fast path: one combined Vision call (OCR + parse). Fallback: text-only parse.
 */
export async function runReceiptPipeline(
  input: PipelineInput
): Promise<PipelineResult | PipelineFailure> {
  const debug = createPipelineDebug();
  const stageLog: StageLogEntry[] = [];
  const intelligenceCorrections: string[] = [];
  let passes = 0;
  let rawAiResponse = "";

  // Stage 1 — image preprocessing (client-side)
  logDebugStage(debug, "image_preprocessing", "ok", input.preprocessMs, [
    input.preprocessMs != null ? `${input.preprocessMs}ms` : "client-side",
  ]);
  logStage(stageLog, "preprocess", Date.now(), [
    input.preprocessMs != null ? `${input.preprocessMs}ms` : "client",
  ]);

  const fileMarketLikely = isFileMarketReceipt(input.sourceHint, null, null);
  const visionDetail = fileMarketLikely ? "high" : "auto";

  // Stages 2+3 — combined Vision (OCR + structured parse)
  const tVision = Date.now();
  const combined = await callVisionJson({
    apiKey: input.apiKey,
    model: input.model,
    dataUrl: input.imageDataUrl,
    system: COMBINED_VISION_PROMPT,
    userText: COMBINED_USER_PROMPT(input.sourceHint),
    detail: visionDetail,
  });
  if ("error" in combined) {
    return failPipeline(debug, "OpenAI request failed", combined.status);
  }

  const visionMs = Date.now() - tVision;
  let verbatimOcr = extractRawOcr(combined.content);
  logStage(stageLog, "ocr", tVision, [
    `${verbatimOcr?.length ?? 0} karakter (combined ${visionMs}ms)`,
  ]);
  logDebugStage(debug, "vision_extraction", verbatimOcr ? "ok" : "warn", visionMs, [
    `${verbatimOcr?.length ?? 0} chars`,
    fileMarketLikely ? "File Market high detail" : `detail=${visionDetail}`,
  ]);
  rawAiResponse += combined.content;

  const tParse = Date.now();
  let parseContent = combined.content;

  // Fallback: text-only parse if structured parse weak but OCR text exists
  if (verbatimOcr?.trim()) {
    const documentTypePre = detectDocumentType(input.sourceHint, verbatimOcr);
    const quickParse = parseStructuredReceipt(parseContent, verbatimOcr);
    if (
      !("error" in quickParse) &&
      (quickParse.analysis.items?.length ?? 0) < 2
    ) {
      const textParse = await callVisionTextParse({
        apiKey: input.apiKey,
        model: input.model,
        system: PARSER_SYSTEM_PROMPT,
        userText: buildParserUserPrompt(
          verbatimOcr,
          documentTypePre,
          input.sourceHint
        ),
      });
      if (!("error" in textParse)) {
        parseContent = textParse.content;
        rawAiResponse += `\n---\n${textParse.content}`;
        logDebugStage(debug, "json_generation", "ok", undefined, [
          "text-only fallback parse",
        ]);
      } else {
        logDebugStage(debug, "json_generation", "warn", undefined, [
          "text-only fallback failed",
        ]);
      }
    }
  }

  const parsed = parseStructuredReceipt(parseContent, verbatimOcr);
  if ("error" in parsed) {
    logDebugStage(debug, "normalization", "fail", Date.now() - tParse, [
      parsed.failureReason ?? parsed.error,
    ]);
    return mapParseFailure(debug, parsed);
  }

  let analysis = attachVerbatimOcr(parsed.analysis, verbatimOcr);
  logStage(stageLog, "receipt_parser", tParse, [
    `${analysis.items?.length ?? 0} ürün`,
    `${analysis.charges?.length ?? 0} ek ücret`,
  ]);
  logDebugStage(debug, "normalization", "ok", Date.now() - tParse, [
    `${analysis.items?.length ?? 0} products`,
    `${analysis.charges?.length ?? 0} charges`,
  ]);
  passes = 1;

  // Document detection
  const tDoc = Date.now();
  const documentType = detectDocumentType(input.sourceHint, verbatimOcr);
  logStage(stageLog, "document_detection", tDoc, [`Tür: ${documentType}`]);
  logDebugStage(debug, "product_parsing", "ok", Date.now() - tDoc, [
    `document=${documentType}`,
  ]);

  const needsFileRetry =
    isFileMarketReceipt(
      input.sourceHint,
      verbatimOcr,
      analysis.merchantName
    ) &&
    (analysis.items?.filter((i) => (i.totalPrice ?? 0) > 0).length ?? 0) < 2;

  // Retry: threshold image when low confidence OR File Market under-extracted
  if (
    (analysis.confidence < RETRY_CONFIDENCE || needsFileRetry) &&
    input.altImageDataUrl
  ) {
    const tRetry = Date.now();
    const retry = await callVisionJson({
      apiKey: input.apiKey,
      model: input.fallbackModel,
      dataUrl: input.altImageDataUrl,
      system: COMBINED_VISION_PROMPT,
      userText: COMBINED_USER_PROMPT(input.sourceHint),
      detail: "high",
    });
    if (!("error" in retry)) {
      const retryOcr = extractRawOcr(retry.content) ?? verbatimOcr;
      const parsedSecond = parseStructuredReceipt(retry.content, retryOcr);
      if (!("error" in parsedSecond)) {
        analysis = mergeAnalyses(analysis, parsedSecond.analysis);
        verbatimOcr = retryOcr;
        rawAiResponse += `\n---\n${retry.content}`;
        passes = 2;
        logDebugStage(debug, "vision_extraction", "ok", Date.now() - tRetry, [
          "retry pass (threshold)",
        ]);
      }
    }
    logStage(stageLog, "ocr", tRetry, [
      needsFileRetry ? "File Market retry" : "retry pass",
    ]);
  }

  // Product knowledge — charges excluded inside stage
  const tKnowledge = Date.now();
  analysis = finalizeReceiptAnalysis(analysis);
  const knowledge = await applyProductKnowledge(
    analysis.items ?? [],
    input.learnedAliases ?? [],
    input.catalogSnapshot ?? null,
    {
      catalogFallbackNote: input.catalogFallbackNote,
      aiNormalize: input.apiKey
        ? async (text) => {
            const { aiNormalizeProductOcr } = await import(
              "@/lib/product-knowledge/aiProductNormalize"
            );
            return aiNormalizeProductOcr(text, input.apiKey, input.model);
          }
        : undefined,
    }
  );
  analysis = finalizeReceiptAnalysis({
    ...analysis,
    items: knowledge.items,
  });
  intelligenceCorrections.push(...knowledge.notes);
  logStage(stageLog, "product_knowledge", tKnowledge, [
    `${knowledge.matchedCount} matched, ${knowledge.unknownCount} unknown`,
    `${analysis.charges?.length ?? 0} charges`,
  ]);
  logDebugStage(debug, "product_parsing", "ok", Date.now() - tKnowledge, [
    `${knowledge.matchedCount} catalog matches`,
  ]);

  // Confidence scoring
  const tConf = Date.now();
  const conf = applyConfidenceScoring(analysis);
  analysis = { ...conf.analysis, items: conf.items };
  intelligenceCorrections.push(...conf.notes);
  logStage(stageLog, "confidence", tConf, conf.notes);

  // Learning
  const tLearn = Date.now();
  const learned = applyLearningStage(analysis, input.corrections ?? []);
  analysis = learned.analysis;
  logStage(stageLog, "learning", tLearn, learned.notes);

  // Receipt validation
  const validation = validatePipelineAnalysis(analysis, verbatimOcr);
  if (!validation.ok) {
    return failPipeline(debug, validation.reason, 422, {
      itemCount: analysis.items?.length ?? 0,
      totalAmount: analysis.totalAmount,
      ocrLength: verbatimOcr?.length ?? 0,
    });
  }
  debug.warnings.push(...validation.warnings);
  const expectedTotal = computeExpectedReceiptTotal(
    analysis.items ?? [],
    analysis.charges ?? [],
    analysis.discounts ?? []
  );
  logDebugStage(debug, "receipt_validation", "ok", undefined, [
    `total=${analysis.totalAmount ?? "?"}`,
    `expected=${expectedTotal.toFixed(2)} (items + charges − discounts)`,
    `${analysis.charges?.length ?? 0} receipt charge(s)`,
  ]);
  logDebugStage(debug, "rendering", "ok");

  const totalMs = stageLog.reduce((s, e) => s + e.ms, 0);
  console.info(`[receipt-pipeline] total: ${totalMs}ms, passes: ${passes}`);

  return {
    analysis,
    documentType,
    rawOcrText: verbatimOcr,
    rawAiResponse,
    passes,
    stageLog,
    intelligenceCorrections,
    correctionsApplied: learned.appliedCount,
    debug,
  };
}

export { detectDocumentType } from "./stages/document-detection";
export { applyProductKnowledge } from "./stages/product-knowledge";
export {
  applyConfidenceScoring,
  itemNeedsConfirmation,
  ITEM_CONFIRM_THRESHOLD,
} from "./stages/confidence";
