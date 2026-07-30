/**
 * Beta feedback queue — stored locally until exported.
 */

import { APP_VERSION } from "@/lib/app-version";
import { ENGINE_VERSION } from "@/lib/receipt-engine-sdk/versioning/versions";
import { trackProductEvent } from "@/lib/product-analytics";

export type BetaFeedbackType =
  | "ocr_mistake"
  | "parsing_wrong"
  | "feature"
  | "rating";

export type BetaFeedbackEntry = {
  id: string;
  type: BetaFeedbackType;
  message: string;
  attachReceipt: boolean;
  createdAt: string;
  metadata: {
    appVersion: string;
    engineVersion: string;
    confidence?: number;
    screen?: string;
  };
};

const QUEUE_KEY = "wl_beta_feedback";
const LAST_SCAN_KEY = "wl_last_scan_confidence";

export function setLastScanConfidence(confidence: number | null | undefined): void {
  if (typeof sessionStorage === "undefined") return;
  if (confidence == null) {
    sessionStorage.removeItem(LAST_SCAN_KEY);
    return;
  }
  try {
    sessionStorage.setItem(LAST_SCAN_KEY, String(confidence));
  } catch {
    /* ignore */
  }
}

export function getLastScanConfidence(): number | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(LAST_SCAN_KEY);
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

function readQueue(): BetaFeedbackEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BetaFeedbackEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(entries: BetaFeedbackEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

function createId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getBetaFeedbackQueue(): BetaFeedbackEntry[] {
  return readQueue();
}

export function submitBetaFeedback(input: {
  type: BetaFeedbackType;
  message: string;
  attachReceipt?: boolean;
  screen?: string;
}): BetaFeedbackEntry {
  const entry: BetaFeedbackEntry = {
    id: createId(),
    type: input.type,
    message: input.message.trim(),
    attachReceipt: input.attachReceipt ?? false,
    createdAt: new Date().toISOString(),
    metadata: {
      appVersion: APP_VERSION,
      engineVersion: ENGINE_VERSION,
      confidence: getLastScanConfidence(),
      screen: input.screen,
    },
  };

  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);

  trackProductEvent("feedback_submitted", {
    feature: input.type,
    meta: { attachReceipt: entry.attachReceipt },
  });

  return entry;
}

export function clearBetaFeedbackQueue(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignore */
  }
}

export function exportBetaFeedbackJson(): string {
  return JSON.stringify(getBetaFeedbackQueue(), null, 2);
}

export const FEEDBACK_TYPE_LABELS: Record<BetaFeedbackType, string> = {
  ocr_mistake: "OCR hatası",
  parsing_wrong: "Ayrıştırma hatası",
  feature: "Özellik isteği",
  rating: "Genel değerlendirme",
};
