/** Turkish license-plate helpers: normalize for grouping, format for display. */

export function normalizePlate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9]/g, "");
  return cleaned || null;
}

/** "34abc123" → "34 ABC 123" (falls back to the uppercase blob). */
export function formatPlate(raw: string | null | undefined): string | null {
  const n = normalizePlate(raw);
  if (!n) return null;
  const m = n.match(/^(\d{1,2})([A-Z]{1,3})(\d{2,5})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  return n;
}
