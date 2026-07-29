import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatMoney(
  amount: number,
  currency = "TRY",
  locale = "tr-TR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}
