import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRetentionMarkers,
  initRetentionMarkers,
  startBetaSession,
  endBetaSession,
  trackFirstReceiptSaved,
  hasFirstReceiptSaved,
  trackTiming,
} from "@/lib/beta-telemetry";
import { getProductAnalyticsEvents } from "@/lib/product-analytics";

function installStorageMock() {
  const local: Record<string, string> = {};
  const session: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => local[key] ?? null,
    setItem: (key: string, value: string) => {
      local[key] = value;
    },
    removeItem: (key: string) => {
      delete local[key];
    },
  });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => session[key] ?? null,
    setItem: (key: string, value: string) => {
      session[key] = value;
    },
    removeItem: (key: string) => {
      delete session[key];
    },
  });
}

describe("beta-telemetry", () => {
  beforeEach(() => {
    installStorageMock();
  });

  it("records firstOpen retention marker", () => {
    const markers = initRetentionMarkers();
    expect(markers.firstOpen).toBeTruthy();
    expect(getRetentionMarkers()?.firstOpen).toBe(markers.firstOpen);
  });

  it("starts and ends a beta session", () => {
    startBetaSession();
    const events = getProductAnalyticsEvents();
    expect(events.some((e) => e.event === "session_start")).toBe(true);

    endBetaSession();
    expect(getProductAnalyticsEvents().some((e) => e.event === "session_end")).toBe(
      true
    );
  });

  it("tracks first receipt saved once", () => {
    expect(hasFirstReceiptSaved()).toBe(false);
    trackFirstReceiptSaved();
    expect(hasFirstReceiptSaved()).toBe(true);
    const before = getProductAnalyticsEvents().length;
    trackFirstReceiptSaved();
    expect(getProductAnalyticsEvents().length).toBe(before);
  });

  it("tracks timing events", () => {
    trackTiming("time_to_scan_start", 1200, { screen: "add" });
    const events = getProductAnalyticsEvents();
    const timing = events.find((e) => e.event === "timing");
    expect(timing?.feature).toBe("time_to_scan_start");
    expect(timing?.meta?.durationMs).toBe(1200);
  });
});
