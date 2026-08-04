import { addDays, endOfDay, endOfMonth, startOfMonth, subMonths } from "date-fns";

/** Days 1–5: suppress month trend alerts (incomplete month vs full prior month). */
export const MONTH_TREND_MIN_DAY = 6;

export type SamePeriodMonthBounds = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  /** Calendar day of month (1-based). */
  dayCount: number;
  trendReady: boolean;
};

/** Aug 1–3 vs Jul 1–3 when today is the 3rd. */
export function getSamePeriodMonthBounds(now = new Date()): SamePeriodMonthBounds {
  const dayCount = now.getDate();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfDay(now);

  const prevMonth = subMonths(now, 1);
  const previousStart = startOfMonth(prevMonth);
  const daysInPrevMonth = endOfMonth(prevMonth).getDate();
  const alignedDay = Math.min(dayCount, daysInPrevMonth);
  const previousEnd = endOfDay(addDays(previousStart, alignedDay - 1));

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    dayCount,
    trendReady: dayCount >= MONTH_TREND_MIN_DAY,
  };
}

export function isMonthTrendReady(now = new Date()): boolean {
  return now.getDate() >= MONTH_TREND_MIN_DAY;
}

/** Hero / trend badge caption for month scope. */
export function formatSamePeriodMonthCaption(now = new Date()): string {
  const dayCount = now.getDate();
  if (dayCount < MONTH_TREND_MIN_DAY) {
    return "Trend için erken";
  }
  if (dayCount === 1) {
    return "Geçen ayın 1. gününe göre";
  }
  return `Geçen ayın ilk ${dayCount} gününe göre`;
}

/** Notification / insight copy for same-period month comparison. */
export function formatSamePeriodMonthInsight(
  trend: number,
  dayCount: number
): string {
  const abs = Math.round(Math.abs(trend));
  if (trend === 0) {
    if (dayCount === 1) {
      return "Ayın ilk gününde geçen ayın ilk günü ile aynı seviyedesin.";
    }
    return `Ayın ilk ${dayCount} gününde geçen ayın aynı dönemi ile aynı seviyedesin.`;
  }
  const dir = trend < 0 ? "daha az" : "daha fazla";
  if (dayCount === 1) {
    return `Ayın ilk gününde geçen ayın ilk gününe göre %${abs} ${dir} harcadın.`;
  }
  return `Ayın ilk ${dayCount} gününde geçen ayın aynı dönemine göre %${abs} ${dir} harcadın.`;
}

/** Shown on days 1–5 instead of a misleading trend line. */
export function formatEarlyMonthInsight(): string {
  return "Ay yeni başladı — aylık trend için birkaç gün daha veri biriksin.";
}
