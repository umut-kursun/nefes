import { format, isValid, parse, parseISO, differenceInCalendarDays, startOfDay } from "date-fns";

/** Canonical display: dd.MM.yyyy */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return format(d, "dd.MM.yyyy");
}

/**
 * Relative purchase date for scanning: Bugün, Dün, 3 gün önce, or dd.MM.yyyy.
 */
export function formatRelativeDate(
  value: string | Date | null | undefined,
  now = new Date()
): string {
  const d = toDate(value);
  if (!d) return "—";
  const days = differenceInCalendarDays(startOfDay(now), startOfDay(d));
  if (days === 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days > 1 && days < 30) return `${days} gün önce`;
  if (days < 0 && days > -7) return formatDate(d);
  return formatDate(d);
}

/** Absolute + relative: "27.07.2026 · Bugün" */
export function formatDateWithRelative(
  value: string | Date | null | undefined,
  now = new Date()
): { absolute: string; relative: string } {
  return {
    absolute: formatDate(value),
    relative: formatRelativeDate(value, now),
  };
}

/** Canonical display: HH:mm */
export function formatTime(value: string | Date | null | undefined): string {
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }
  const d = toDate(value);
  if (!d) return "—";
  return format(d, "HH:mm");
}

/** dd.MM.yyyy · HH:mm */
export function formatDateTime(
  date: string | Date | null | undefined,
  time?: string | null
): string {
  const d = formatDate(date);
  if (d === "—") return "—";
  if (time && /^\d{2}:\d{2}/.test(time)) return `${d} · ${time.slice(0, 5)}`;
  // Fall back to time-of-day from Date/ISO
  if (date instanceof Date || (typeof date === "string" && date.includes("T"))) {
    const t = formatTime(date);
    if (t !== "—") return `${d} · ${t}`;
  }
  return d;
}

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  // ISO date or datetime
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = parseISO(value.length === 10 ? `${value}T12:00:00` : value);
    return isValid(d) ? d : null;
  }

  // dd.MM.yyyy
  if (/^\d{2}\.\d{2}\.\d{4}/.test(value)) {
    const d = parse(value.slice(0, 10), "dd.MM.yyyy", new Date());
    return isValid(d) ? d : null;
  }

  const d = new Date(value);
  return isValid(d) ? d : null;
}

/** Normalize loose time input to HH:mm or null. */
export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
