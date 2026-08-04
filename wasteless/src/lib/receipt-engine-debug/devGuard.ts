/**
 * Dev-only debug features (export JSON, ZIP, debug pages, debug API routes).
 * Enabled in development builds or when RECEIPT_ENGINE_DEBUG_EXPORT=1 on the worker.
 */
export function isDebugExportEnabled(
  env?: { RECEIPT_ENGINE_DEBUG_EXPORT?: string }
): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.RECEIPT_ENGINE_DEBUG_EXPORT === "1" ||
    env?.RECEIPT_ENGINE_DEBUG_EXPORT === "1"
  );
}

/** Alias for route/middleware guards. */
export const isDevDebugRoutesEnabled = isDebugExportEnabled;

/** Client UI: show debug clipboard panels (build-time public flag or dev). */
export function isDebugClipboardUiEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_RECEIPT_ENGINE_DEBUG === "1"
  );
}
