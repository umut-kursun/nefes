/**
 * Receipt scan wall-clock timeline (epoch ms, UTC ISO).
 * t0â€“t3,t9 client | t4â€“t8 server/worker | merged in API response.
 */

export type ScanTimelineKey =
  | "t0_camera_finished"
  | "t1_preprocess_start"
  | "t2_preprocess_end"
  | "t3_fetch_start"
  | "t4_worker_request_received"
  | "t5_openai_request_start"
  | "t6_openai_first_byte"
  | "t7_openai_response_complete"
  | "t8_worker_response_sent"
  | "t9_browser_response_received";

export type ScanTimeline = Partial<Record<ScanTimelineKey, number>>;

export type ScanTimelinePayload = {
  readonly scanTraceId: string;
  readonly client?: ScanTimeline;
  readonly server?: ScanTimeline;
  readonly merged: ScanTimeline;
};

const LABELS: Record<ScanTimelineKey, string> = {
  t0_camera_finished: "t0 camera finished",
  t1_preprocess_start: "t1 preprocess start",
  t2_preprocess_end: "t2 preprocess end",
  t3_fetch_start: "t3 fetch() start",
  t4_worker_request_received: "t4 Worker request received",
  t5_openai_request_start: "t5 OpenAI request start",
  t6_openai_first_byte: "t6 first byte received (response headers; non-streaming API)",
  t7_openai_response_complete: "t7 OpenAI response complete",
  t8_worker_response_sent: "t8 Worker response sent",
  t9_browser_response_received: "t9 Browser response received",
};

export function createScanTraceId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function stampTimeline(
  timeline: ScanTimeline,
  key: ScanTimelineKey
): ScanTimeline {
  const prior = { ...timeline };
  const ms = Date.now();
  timeline[key] = ms;
  logTimelineStamp(key, ms, prior);
  return timeline;
}

function logTimelineStamp(
  key: ScanTimelineKey,
  ms: number,
  prior: ScanTimeline
): void {
  const iso = new Date(ms).toISOString();
  const prevKeys = Object.keys(prior).length;
  const delta =
    prevKeys > 0
      ? ` (+${ms - Math.min(...Object.values(prior))}ms from first stamp in this object)`
      : "";
  console.info(`[scan-timeline] ${LABELS[key]} | ${ms} | ${iso}${delta}`);
}

export function mergeTimelines(
  scanTraceId: string,
  client?: ScanTimeline,
  server?: ScanTimeline
): ScanTimelinePayload {
  const merged: ScanTimeline = { ...server, ...client };
  return { scanTraceId, client, server, merged };
}

export function formatScanTimelineReport(payload: ScanTimelinePayload): string {
  const order: ScanTimelineKey[] = [
    "t0_camera_finished",
    "t1_preprocess_start",
    "t2_preprocess_end",
    "t3_fetch_start",
    "t4_worker_request_received",
    "t5_openai_request_start",
    "t6_openai_first_byte",
    "t7_openai_response_complete",
    "t8_worker_response_sent",
    "t9_browser_response_received",
  ];

  const lines = [
    `scanTraceId: ${payload.scanTraceId}`,
    "===== SCAN TIMELINE (epoch ms | ISO UTC) =====",
  ];

  let prev: number | null = null;
  for (const key of order) {
    const ms = payload.merged[key];
    if (ms == null) {
      lines.push(`${LABELS[key]} | â€” | (not recorded)`);
      continue;
    }
    const iso = new Date(ms).toISOString();
    const delta = prev != null ? ` | +${ms - prev}ms` : "";
    lines.push(`${LABELS[key]} | ${ms} | ${iso}${delta}`);
    prev = ms;
  }

  const t0 = payload.merged.t0_camera_finished;
  const t9 = payload.merged.t9_browser_response_received;
  if (t0 != null && t9 != null) {
    lines.push(`---`);
    lines.push(`wall_clock_t0_to_t9: ${t9 - t0}ms`);
  }

  lines.push(JSON.stringify(payload.merged, null, 2));
  return lines.join("\n");
}

export function logScanTimelineReport(payload: ScanTimelinePayload): void {
  console.info(formatScanTimelineReport(payload));
}
