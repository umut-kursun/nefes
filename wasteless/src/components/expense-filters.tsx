"use client";

import { useMemo } from "react";
import { useWasteLessStore } from "@/hooks/use-store";
import {
  filterExpenses,
  uniqueMerchants,
  type ExpenseFilters,
} from "@/lib/filters";
import { listRootCategories, getChildren } from "@/lib/category-hierarchy";
import type { Expense } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ExpenseFilterBar({
  value,
  onChange,
  className,
}: {
  value: ExpenseFilters;
  onChange: (next: ExpenseFilters) => void;
  className?: string;
}) {
  const { categories, tags, expenses } = useWasteLessStore();
  const merchants = useMemo(() => uniqueMerchants(expenses), [expenses]);
  const roots = useMemo(() => listRootCategories(categories), [categories]);

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-white/70 bg-white/75 p-3",
        className
      )}
    >
      <div className="grid gap-1.5">
        <Label className="text-xs">Kategori</Label>
        <select
          className="h-11 rounded-xl border border-input bg-background px-2 text-sm"
          value={value.categoryId ?? ""}
          onChange={(e) =>
            onChange({ ...value, categoryId: e.target.value || null })
          }
        >
          <option value="">Tümü</option>
          {roots.map((root) => {
            const children = getChildren(root.id, categories);
            if (children.length === 0) {
              return (
                <option key={root.id} value={root.id}>
                  {root.label}
                </option>
              );
            }
            return (
              <optgroup key={root.id} label={root.label}>
                <option value={root.id}>{root.label} (genel)</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <p className="text-[10px] text-muted-foreground">
          Önce üst kategori, altındakiler grup içinde.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label className="text-xs">Etiket</Label>
          <select
            className="h-11 rounded-xl border border-input bg-background px-2 text-sm"
            value={value.tagId ?? ""}
            onChange={(e) =>
              onChange({ ...value, tagId: e.target.value || null })
            }
          >
            <option value="">Tümü</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">İşyeri</Label>
          <select
            className="h-11 rounded-xl border border-input bg-background px-2 text-sm"
            value={value.merchant ?? ""}
            onChange={(e) =>
              onChange({ ...value, merchant: e.target.value || null })
            }
          >
            <option value="">Tümü</option>
            {merchants.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label className="text-xs">Başlangıç</Label>
          <Input
            type="date"
            value={value.dateFrom ?? ""}
            onChange={(e) =>
              onChange({ ...value, dateFrom: e.target.value || null })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Bitiş</Label>
          <Input
            type="date"
            value={value.dateTo ?? ""}
            onChange={(e) =>
              onChange({ ...value, dateTo: e.target.value || null })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function useFilteredExpenses(
  expenses: Expense[],
  filters: ExpenseFilters
): Expense[] {
  const { categories } = useWasteLessStore();
  return useMemo(
    () => filterExpenses(expenses, filters, categories),
    [expenses, filters, categories]
  );
}
