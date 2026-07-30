/**
 * Beta telemetry — wraps product analytics with session lifecycle and retention markers.
 * All data stays in localStorage; no external SDK.
 */

import {
  trackProductEvent,
  type ProductAnalyticsEvent,
} from "@/lib/product-analytics";

const RETENTION_KEY = "wl_beta_retention";
const SESSION_KEY = "wl_beta_session";

export type RetentionMarkers = {
  firstOpen: string;
  d1?: string;
  d7?: string;
};

export type BetaSession = {
  id: string;
  startedAt: string;
};

function readRetention(): RetentionMarkers | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(RETENTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RetentionMarkers;
  } catch {
    return null;
  }
}

function writeRetention(markers: RetentionMarkers): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RETENTION_KEY, JSON.stringify(markers));
  } catch {
    /* quota */
  }
}

function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((b.getTime() - a.getTime()) / ms);
}

/** Record first open and D1/D7 retention markers on app load. */
export function initRetentionMarkers(): RetentionMarkers {
  const now = new Date();
  const existing = readRetention();
  if (!existing) {
    const markers: RetentionMarkers = { firstOpen: now.toISOString() };
    writeRetention(markers);
    return markers;
  }

  const first = new Date(existing.firstOpen);
  const elapsed = daysBetween(first, now);
  const next = { ...existing };

  if (elapsed >= 1 && !next.d1) {
    next.d1 = now.toISOString();
    trackProductEvent("session_start", {
      feature: "retention",
      meta: { marker: "d1", daysSinceFirstOpen: elapsed },
    });
  }
  if (elapsed >= 7 && !next.d7) {
    next.d7 = now.toISOString();
    trackProductEvent("session_start", {
      feature: "retention",
      meta: { marker: "d7", daysSinceFirstOpen: elapsed },
    });
  }

  if (next.d1 !== existing.d1 || next.d7 !== existing.d7) {
    writeRetention(next);
  }
  return next;
}

export function getRetentionMarkers(): RetentionMarkers | null {
  return readRetention();
}

function readSession(): BetaSession | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BetaSession;
  } catch {
    return null;
  }
}

function writeSession(session: BetaSession): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

function clearSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function createSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Start a new beta session (once per browser tab). */
export function startBetaSession(): BetaSession {
  const existing = readSession();
  if (existing) return existing;

  const session: BetaSession = {
    id: createSessionId(),
    startedAt: new Date().toISOString(),
  };
  writeSession(session);
  initRetentionMarkers();
  trackProductEvent("session_start", {
    feature: "beta",
    meta: { sessionId: session.id },
  });
  return session;
}

/** End the current beta session. */
export function endBetaSession(): void {
  const session = readSession();
  if (!session) return;

  const durationMs = Date.now() - new Date(session.startedAt).getTime();
  trackProductEvent("session_end", {
    feature: "beta",
    meta: { sessionId: session.id, durationMs },
  });
  clearSession();
}

export function getCurrentSession(): BetaSession | null {
  return readSession();
}

/** Track a timing event with optional metadata. */
export function trackTiming(
  name: string,
  durationMs: number,
  meta?: Record<string, string | number | boolean>
): void {
  trackProductEvent("timing", {
    feature: name,
    meta: { durationMs, ...meta },
  });
}

/** Track screen abandon when user leaves a flow without completing. */
export function trackScreenAbandon(
  screen: string,
  reason?: string
): void {
  trackProductEvent("screen_abandon", {
    screen,
    meta: reason ? { reason } : undefined,
  });
}

/** Track insight viewed. */
export function trackInsightViewed(insightId: string): void {
  trackProductEvent("insight_viewed", {
    feature: insightId,
  });
}

/** Track first receipt saved (once). */
export function trackFirstReceiptSaved(): void {
  if (typeof localStorage === "undefined") return;
  const key = "wl_first_receipt_saved";
  if (localStorage.getItem(key) === "1") return;
  localStorage.setItem(key, "1");
  trackProductEvent("first_receipt_saved");
}

export function hasFirstReceiptSaved(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("wl_first_receipt_saved") === "1";
}

/** Re-export typed event tracking for beta flows. */
export function trackBetaEvent(
  event: ProductAnalyticsEvent,
  details?: Parameters<typeof trackProductEvent>[1]
): void {
  trackProductEvent(event, details);
}
