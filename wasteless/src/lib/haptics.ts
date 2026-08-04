/** Light tap feedback when the Web Vibration API is available. */
export function triggerHaptic(
  style: "light" | "medium" = "light"
): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(style === "medium" ? [12, 24, 12] : 8);
  } catch {
    // Unsupported or blocked — ignore silently.
  }
}
