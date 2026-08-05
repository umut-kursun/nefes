import { describe, expect, it } from "vitest";
import {
  formatScanTimelineReport,
  mergeTimelines,
  stampTimeline,
  type ScanTimeline,
} from "@/lib/receipt-scan-timeline";

describe("receipt-scan-timeline", () => {
  it("stampTimeline mutates the passed object in place", () => {
    const timeline: ScanTimeline = {};
    stampTimeline(timeline, "t4_worker_request_received");
    expect(timeline.t4_worker_request_received).toEqual(expect.any(Number));

    stampTimeline(timeline, "t5_openai_request_start");
    expect(timeline.t5_openai_request_start).toEqual(expect.any(Number));
    expect(Object.keys(timeline)).toHaveLength(2);
  });

  it("formatScanTimelineReport lists recorded stamps with deltas", () => {
    const payload = mergeTimelines(
      "scan-test",
      { t0_camera_finished: 1000, t3_fetch_start: 1050 },
      { t4_worker_request_received: 1100, t8_worker_response_sent: 9000 }
    );
    const report = formatScanTimelineReport(payload);
    expect(report).toContain("scanTraceId: scan-test");
    expect(report).toContain("t0 camera finished | 1000");
    expect(report).toContain("t4 Worker request received | 1100 |");
    expect(report).toContain("+50ms");
  });
});
