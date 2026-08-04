import { APP_VERSION } from "@/lib/app-version";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { ReceiptDebugExport } from "./exportSchema";

const SEPARATOR = "==================================================";

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatImageSize(image: ReceiptDebugExport["image"]): string {
  const dims =
    image.width > 0 && image.height > 0
      ? `${image.width}×${image.height}px`
      : "unknown";
  const bytes =
    image.sizeBytes > 0 ? `${image.sizeBytes.toLocaleString("en-US")} bytes` : "unknown";
  return `${dims}, ${bytes}`;
}

function formatLayoutSection(layout: LayoutDocument): string {
  const continuations = layout.lines
    .filter((line) => line.features.isLikelyContinuation)
    .map((line) => ({
      index: line.index,
      text: line.text,
      region: line.region,
    }));

  const payload = {
    regions: layout.regions,
    lines: layout.lines,
    continuations,
    detectedSections: layout.segmentation.sections,
    headerBodyFooter: {
      header: layout.regions.header,
      body: layout.regions.body,
      footer: layout.regions.footer,
    },
    sectionTransitions: layout.segmentation.parserStates.map((state, lineIndex) => ({
      lineIndex,
      state,
      sectionKind: layout.segmentation.sectionByLineIndex[lineIndex],
      lineType: layout.segmentation.lineTypes[lineIndex],
    })),
  };

  return formatJson(payload);
}

const TIMELINE_STAGE_ORDER = [
  { key: "ocr", label: "OCR", timingKey: "ocrMs" as const },
  { key: "layout", label: "Layout", timingKey: "layoutMs" as const },
  {
    key: "segmentation",
    label: "Segmentation",
    timingKey: undefined,
  },
  { key: "graph", label: "Graph", timingKey: "graphMs" as const },
  {
    key: "classification",
    label: "Classification",
    timingKey: "classificationMs" as const,
  },
  { key: "blocks", label: "Blocks", timingKey: "blockMs" as const },
  {
    key: "purchaseDraft",
    label: "PurchaseDraft",
    timingKey: "purchaseMs" as const,
  },
  {
    key: "validation",
    label: "Validation",
    timingKey: "validationMs" as const,
  },
] as const;

function formatTimelineSection(debug: ReceiptDebugExport): string {
  const lines: string[] = [];
  const layout = debug.layout as LayoutDocument | undefined;

  for (const stage of TIMELINE_STAGE_ORDER) {
    const durationMs =
      stage.timingKey != null ? debug.timings[stage.timingKey] : undefined;
    const timingLabel =
      durationMs != null ? ` (${durationMs} ms)` : " (timing unavailable)";
    lines.push(`- ${stage.label}${timingLabel}`);

    if (stage.key === "segmentation" && layout) {
      lines.push(`  sections: ${layout.segmentation.sections.length}`);
      lines.push(
        `  parserStates: ${layout.segmentation.parserStates.length} transitions`
      );
    }
  }

  if (debug.timeline?.totalDurationMs != null) {
    lines.push(`- Total: ${debug.timeline.totalDurationMs} ms`);
  }

  return lines.join("\n");
}

function formatConfidenceSection(debug: ReceiptDebugExport): string {
  const confidence = debug.confidence;
  if (!confidence) {
    return [
      "Merchant confidence: unavailable",
      "Overall confidence: unavailable",
      "Rejected lines: unavailable",
      "Unknown lines: unavailable",
    ].join("\n");
  }

  const lines = [
    `Merchant confidence: ${confidence.merchant.toFixed(3)}`,
    `Overall confidence: ${confidence.overall.toFixed(3)}`,
    "",
    "Rejected lines:",
    confidence.rejectedLines.length === 0
      ? "  (none)"
      : confidence.rejectedLines
          .map(
            (line) =>
              `  L${line.lineIndex}: ${line.text} — ${line.reason}`
          )
          .join("\n"),
    "",
    "Unknown lines:",
    confidence.unknownLines.length === 0
      ? "  (none)"
      : confidence.unknownLines
          .map(
            (line) =>
              `  L${line.lineIndex} [${line.sectionKind}]: ${line.text}`
          )
          .join("\n"),
  ];

  return lines.join("\n");
}

function formatOcrSection(debug: ReceiptDebugExport): string {
  const { ocr } = debug;
  const hasNormalization =
    ocr.rawExtractText != null &&
    ocr.rawExtractText !== ocr.rawText;

  if (hasNormalization) {
    return [
      "### Raw OCR",
      ocr.rawExtractText ?? "",
      "",
      "### Normalized OCR",
      ocr.rawText,
    ].join("\n");
  }

  return ocr.rawText;
}

/** Build a single markdown debug block for clipboard export (dev only). */
export function formatFullReceiptDebugMarkdown(
  debug: ReceiptDebugExport
): string {
  const layout = debug.layout as LayoutDocument;
  const rawVision =
    debug.ocr.rawVisionResponse ??
    "(raw Vision response not captured — non-OpenAI OCR provider or legacy trace)";

  const sections = [
    SEPARATOR,
    "RECEIPT DEBUG",
    SEPARATOR,
    "",
    "## 1. Receipt image metadata",
    `- image size: ${formatImageSize(debug.image)}`,
    `- orientation: ${debug.image.orientation ?? "unknown"}`,
    `- timestamp: ${debug.timestamp}`,
    "",
    "## 2. Raw Vision response (UNMODIFIED)",
    rawVision,
    "",
    "## 3. OCR text used by parser",
    formatOcrSection(debug),
    "",
    "## 4. Layout reconstruction",
    layout ? formatLayoutSection(layout) : "(layout unavailable)",
    "",
    "## 5. Parser JSON",
    formatJson(debug.purchase),
    "",
    "## 6. Validation",
    formatJson(debug.validation),
    "",
    "## 7. Parser timeline",
    formatTimelineSection(debug),
    "",
    "## 8. Confidence",
    formatConfidenceSection(debug),
    "",
    "## 9. Environment",
    `- Receipt Engine version: ${debug.version.engineVersion}`,
    `- App version: ${APP_VERSION}`,
    `- Vision model: ${debug.ocr.model}`,
    `- OCR model: ${debug.ocr.model}`,
    `- Date: ${debug.timestamp}`,
  ];

  return sections.join("\n");
}
