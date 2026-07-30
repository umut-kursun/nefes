/**
 * Privacy-first local product analytics.
 * Events are stored in localStorage only — no external SDK.
 */

export type ProductAnalyticsEvent =
  | "screen_view"
  | "receipt_scan_success"
  | "receipt_scan_fail"
  | "manual_edit"
  | "feature_used"
  | "session_start"
  | "session_end"
  | "timing"
  | "insight_viewed"
  | "feedback_submitted"
  | "first_receipt_saved"
  | "screen_abandon";

export type ProductAnalyticsPayload = {
  event: ProductAnalyticsEvent;
  screen?: string;
  feature?: string;
  meta?: Record<string, string | number | boolean>;
  at: string;
};

const STORAGE_KEY = "wl_product_analytics";
const MAX_EVENTS = 500;

function readEvents(): ProductAnalyticsPayload[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProductAnalyticsPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: ProductAnalyticsPayload[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_EVENTS))
    );
  } catch {
    /* quota or privacy mode */
  }
}

export function trackProductEvent(
  event: ProductAnalyticsEvent,
  details?: Omit<ProductAnalyticsPayload, "event" | "at">
): void {
  const payload: ProductAnalyticsPayload = {
    event,
    ...details,
    at: new Date().toISOString(),
  };
  const events = readEvents();
  events.push(payload);
  writeEvents(events);
}

export function trackScreenView(screen: string): void {
  trackProductEvent("screen_view", { screen });
}

export function trackFeatureUsed(feature: string, meta?: Record<string, string | number | boolean>): void {
  trackProductEvent("feature_used", { feature, meta });
}

export function getProductAnalyticsEvents(): ProductAnalyticsPayload[] {
  return readEvents();
}

export function clearProductAnalytics(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getProductAnalyticsSummary(): Record<ProductAnalyticsEvent, number> {
  const counts: Record<ProductAnalyticsEvent, number> = {
    screen_view: 0,
    receipt_scan_success: 0,
    receipt_scan_fail: 0,
    manual_edit: 0,
    feature_used: 0,
    session_start: 0,
    session_end: 0,
    timing: 0,
    insight_viewed: 0,
    feedback_submitted: 0,
    first_receipt_saved: 0,
    screen_abandon: 0,
  };
  for (const row of readEvents()) {
    counts[row.event] = (counts[row.event] ?? 0) + 1;
  }
  return counts;
}
