/**
 * Dev-only debug features (export JSON, ZIP, debug pages, debug API routes).
 * Disabled in production unless RECEIPT_ENGINE_DEBUG_EXPORT=1 (staging only).
 */
export function isDebugExportEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.RECEIPT_ENGINE_DEBUG_EXPORT === "1"
  );
}

/** Alias for route/middleware guards. */
export const isDevDebugRoutesEnabled = isDebugExportEnabled;