import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearProductAnalytics,
  getProductAnalyticsEvents,
  getProductAnalyticsSummary,
  trackFeatureUsed,
  trackProductEvent,
  trackScreenView,
} from "@/lib/product-analytics";

function installLocalStorageMock() {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  });
}

describe("product-analytics", () => {
  beforeEach(() => {
    installLocalStorageMock();
    clearProductAnalytics();
  });

  it("tracks screen_view events", () => {
    trackScreenView("home");
    const events = getProductAnalyticsEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.event).toBe("screen_view");
    expect(events[0]!.screen).toBe("home");
  });

  it("tracks feature_used with meta", () => {
    trackFeatureUsed("reports_export", { format: "csv" });
    const summary = getProductAnalyticsSummary();
    expect(summary.feature_used).toBe(1);
  });

  it("caps stored events at 500", () => {
    for (let i = 0; i < 510; i++) {
      trackProductEvent("manual_edit", { feature: `edit-${i}` });
    }
    expect(getProductAnalyticsEvents().length).toBeLessThanOrEqual(500);
  });
});
