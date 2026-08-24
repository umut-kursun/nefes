/** Parse Turkish-formatted monetary strings (*1.234,56 or 1234,56). */
export function parseTurkishAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (!s) return null;

  const negative = s.includes("-");
  s = s.replace(/-/g, "").replace(/^\*+/, "");
  if (!s) return null;

  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/** Compare two amounts within tolerance (default ±0.05 TRY). */
export function amountsClose(
  a: number | null | undefined,
  b: number | null | undefined,
  tolerance = 0.05
): boolean {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) {
    return false;
  }
  return Math.abs(a - b) <= tolerance;
}
