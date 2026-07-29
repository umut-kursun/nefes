export type PipelineStageStatus = "ok" | "warn" | "fail" | "skip";

export type PipelineDebugStage = {
  stage: string;
  status: PipelineStageStatus;
  ms?: number;
  notes?: string[];
};

export type PipelineDebug = {
  stages: PipelineDebugStage[];
  failureReason?: string;
  warnings: string[];
};

/** Machine-readable failure codes returned in debug payloads. */
export type PipelineFailureReason =
  | "Vision response incomplete"
  | "Line parser failed"
  | "Unable to detect receipt totals"
  | "Weighted product parsing failed"
  | "OpenAI request failed";

const USER_MESSAGES: Record<PipelineFailureReason, string> = {
  "Vision response incomplete":
    "Görüntüden metin çıkarılamadı (Vision yanıtı eksik).",
  "Line parser failed": "Fiş satırları ayrıştırılamadı.",
  "Unable to detect receipt totals": "Fiş toplamı tespit edilemedi.",
  "Weighted product parsing failed": "Tartılı ürün satırı okunamadı.",
  "OpenAI request failed": "Yapay zeka servisi yanıt vermedi.",
};

export function pipelineErrorMessage(reason: PipelineFailureReason): string {
  return USER_MESSAGES[reason] ?? reason;
}

export function createPipelineDebug(): PipelineDebug {
  return { stages: [], warnings: [] };
}

export function logDebugStage(
  debug: PipelineDebug,
  stage: string,
  status: PipelineStageStatus,
  ms?: number,
  notes?: string[]
): void {
  debug.stages.push({ stage, status, ms, notes });
  const label = notes?.length ? notes.join(" · ") : "";
  console.info(
    `[receipt-pipeline] ${stage} [${status}]${ms != null ? ` ${ms}ms` : ""}`,
    label
  );
}

/** Validate post-pipeline analysis; returns failure reason when unusable. */
export function validatePipelineAnalysis(
  analysis: {
    items?: Array<{ totalPrice?: number | null; quantity?: number | null; unit?: string | null }>;
    totalAmount?: number | null;
    extraCharges?: Array<{ amount?: number | null }>;
    charges?: Array<{ amount?: number | null }>;
    discounts?: Array<{ amount?: number | null }>;
  },
  rawOcr: string | null | undefined
): { ok: true; warnings: string[] } | { ok: false; reason: PipelineFailureReason } {
  const warnings: string[] = [];
  const ocrLen = rawOcr?.trim().length ?? 0;

  if (ocrLen < 20) {
    return { ok: false, reason: "Vision response incomplete" };
  }

  const items = analysis.items ?? [];
  const priced = items.filter((i) => (i.totalPrice ?? 0) > 0).length;
  const chargeLines = analysis.charges ?? analysis.extraCharges ?? [];
  const chargeCount = chargeLines.length;
  const chargeSum = chargeLines.reduce(
    (a, c) => a + Math.abs(c.amount ?? 0),
    0
  );

  if (items.length === 0 || priced === 0) {
    return { ok: false, reason: "Line parser failed" };
  }

  const weighted = items.filter(
    (i) =>
      i.unit &&
      /^(kg|g|gr|gram)$/i.test(i.unit.trim()) &&
      (i.totalPrice ?? 0) > 0
  );
  for (const w of weighted) {
    if (w.quantity == null || w.quantity <= 0) {
      return { ok: false, reason: "Weighted product parsing failed" };
    }
  }

  if (analysis.totalAmount == null || analysis.totalAmount <= 0) {
    if (priced >= 2) {
      warnings.push("Unable to detect receipt totals");
    } else {
      return { ok: false, reason: "Unable to detect receipt totals" };
    }
  }

  if (chargeCount > 0) {
    warnings.push(
      `${chargeCount} receipt charge(s) in validation (Σ ${chargeSum.toFixed(2)} TRY)`
    );
  }

  return { ok: true, warnings };
}

export function isFileMarketReceipt(
  sourceHint: string,
  rawText?: string | null,
  merchantName?: string | null
): boolean {
  const blob = `${sourceHint} ${merchantName ?? ""} ${rawText ?? ""}`.toLocaleLowerCase(
    "tr-TR"
  );
  return /\bfile(\s*market)?\b/i.test(blob);
}
