"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { tr } from "date-fns/locale";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import { tr as dayPickerTr } from "react-day-picker/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { BottomSheet } from "@/components/bottom-sheet";
import { EmptyState } from "@/components/empty-state";
import { PurchaseCardCompact } from "@/components/purchase-card";
import { useWasteLessStore } from "@/hooks/use-store";
import type { Expense } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import "react-day-picker/style.css";

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function countLabel(n: number): string {
  if (n <= 0) return "";
  if (n > 9) return "9+";
  return String(n);
}

export default function CalendarPage() {
  const { expenses, ready } = useWasteLessStore();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState<Date | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [monthAnim, setMonthAnim] = useState<"in" | "left" | "right">("in");
  const [monthKey, setMonthKey] = useState(() => dateKey(startOfMonth(today)));

  const purchasesByDate = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      if (!e.date) continue;
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of Array.from(map.values())) {
      list.sort((a, b) => {
        const at = a.time || "99:99";
        const bt = b.time || "99:99";
        const t = at.localeCompare(bt);
        if (t !== 0) return t;
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      });
    }
    return map;
  }, [expenses]);

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, list] of Array.from(purchasesByDate.entries())) {
      map.set(key, list.length);
    }
    return map;
  }, [purchasesByDate]);

  const purchasedDays = useMemo(
    () =>
      Array.from(purchasesByDate.keys())
        .map((key) => {
          try {
            return startOfDay(parseISO(key));
          } catch {
            return null;
          }
        })
        .filter((d): d is Date => !!d && !Number.isNaN(d.getTime())),
    [purchasesByDate]
  );

  const dayPurchases = useMemo(() => {
    if (!selected) return [];
    return purchasesByDate.get(dateKey(selected)) ?? [];
  }, [selected, purchasesByDate]);

  const dayTotal = useMemo(
    () => dayPurchases.reduce((sum, e) => sum + (e.totalAmount || 0), 0),
    [dayPurchases]
  );

  const sheetTitle = selected
    ? format(selected, "d MMMM yyyy · EEEE", { locale: tr })
    : "";

  const changeMonth = useCallback((next: Date, direction: "left" | "right") => {
    const normalized = startOfMonth(next);
    setMonthAnim(direction);
    setMonth(normalized);
    setMonthKey(dateKey(normalized));
  }, []);

  const onMonthChange = useCallback(
    (next: Date) => {
      const normalized = startOfMonth(next);
      const direction = normalized > month ? "left" : "right";
      changeMonth(normalized, direction);
    },
    [changeMonth, month]
  );

  // Reset animation class after enter so re-triggers work
  useEffect(() => {
    if (monthAnim === "in") return;
    const id = window.setTimeout(() => setMonthAnim("in"), 280);
    return () => window.clearTimeout(id);
  }, [monthKey, monthAnim]);

  const onSelectDay = (day: Date | undefined) => {
    if (!day) return;
    setSelected(startOfDay(day));
    if (!isSameMonth(day, month)) {
      onMonthChange(day);
    }
    setSheetOpen(true);
  };

  const goToday = () => {
    const t = startOfDay(new Date());
    if (!isSameMonth(t, month)) {
      changeMonth(t, t > month ? "left" : "right");
    }
    setSelected(t);
    setSheetOpen(true);
  };

  const shiftDay = (delta: number) => {
    if (!selected) return;
    const next = startOfDay(addDays(selected, delta));
    setSelected(next);
    if (!isSameMonth(next, month)) {
      changeMonth(next, delta > 0 ? "left" : "right");
    }
  };

  const DayButton = useCallback(
    (props: DayButtonProps) => {
      const { day, modifiers, children: _children, ...buttonProps } = props;
      void modifiers;
      void _children;
      const key = dateKey(day.date);
      const count = countByDate.get(key) ?? 0;
      const label = countLabel(count);
      return (
        <button
          {...buttonProps}
          type="button"
          className={cn(buttonProps.className, "wl-day-btn")}
        >
          <span className="wl-day-num">{format(day.date, "d")}</span>
          {label ? (
            <span className="wl-day-badge" aria-hidden>
              {label}
            </span>
          ) : null}
        </button>
      );
    },
    [countByDate]
  );

  const isViewingTodayMonth = isSameMonth(month, today);

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-2 animate-fade-up">
        <BackButton fallback="/memory" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl tracking-tight">Takvim</h1>
          <p className="text-sm text-muted-foreground">
            Tarihe göre satın alma hafızası
          </p>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border border-black/[0.05] bg-white px-3 text-sm font-semibold text-teal-800 shadow-sm transition active:scale-95"
        >
          <CalendarDays className="h-4 w-4" />
          Bugün
        </button>
      </header>

      {!ready ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : expenses.length === 0 ? (
        <EmptyState
          emoji="📅"
          title="Takvimde henüz gün yok"
          description="Fiş tara veya harcama ekle; satın aldığın günler takvimde rozet olarak görünür."
          actionLabel="Harcama ekle"
          actionHref="/add"
        />
      ) : (
        <div className="animate-fade-up delay-1 rounded-3xl border border-black/[0.04] bg-white p-3 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              aria-label="Önceki ay"
              onClick={() => changeMonth(addMonths(month, -1), "right")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/60 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="font-display text-lg tracking-tight capitalize">
              {format(month, "MMMM yyyy", { locale: tr })}
            </p>
            <button
              type="button"
              aria-label="Sonraki ay"
              onClick={() => changeMonth(addMonths(month, 1), "left")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/60 active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div
            key={monthKey}
            className={cn(
              "wl-month-pane",
              monthAnim === "left" && "wl-month-enter-left",
              monthAnim === "right" && "wl-month-enter-right",
              monthAnim === "in" && "wl-month-idle"
            )}
          >
            <DayPicker
              mode="single"
              locale={dayPickerTr}
              weekStartsOn={1}
              month={month}
              onMonthChange={onMonthChange}
              hideNavigation
              selected={selected}
              onSelect={onSelectDay}
              modifiers={{ purchased: purchasedDays }}
              modifiersClassNames={{
                purchased: "wl-day-purchased",
              }}
              components={{ DayButton }}
              className="wl-calendar mx-auto"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 px-1">
            <p className="text-[11px] text-muted-foreground">
              Rozetli günlerde satın alma var
            </p>
            {!isViewingTodayMonth && (
              <button
                type="button"
                onClick={goToday}
                className="text-[11px] font-semibold text-primary"
              >
                Bu aya dön
              </button>
            )}
          </div>
        </div>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
        headerStart={
          <button
            type="button"
            aria-label="Önceki gün"
            onClick={() => shiftDay(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/60 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
        headerEnd={
          <button
            type="button"
            aria-label="Sonraki gün"
            onClick={() => shiftDay(1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/60 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        }
      >
        {dayPurchases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/[0.08] bg-muted/25 px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-800 shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="font-medium">Bu günde satın alma yok</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fiş ekleyerek bu günü hafızana ekleyebilirsin.
            </p>
            <div className="mt-5 flex flex-col items-center gap-2">
              <Link
                href="/add"
                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition active:scale-95"
                onClick={() => setSheetOpen(false)}
              >
                Satın alma ekle
              </Link>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground"
                onClick={() => shiftDay(1)}
              >
                Sonraki güne bak →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {dayPurchases.length}
              </span>{" "}
              alışveriş
              <span className="text-black/20"> · </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(dayTotal)}
              </span>
            </p>
            <ul className="space-y-2 pb-2">
              {dayPurchases.map((expense) => (
                <li key={expense.id} onClick={() => setSheetOpen(false)}>
                  <PurchaseCardCompact expense={expense} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </BottomSheet>
    </AppShell>
  );
}
