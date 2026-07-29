"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmptyItem } from "@/lib/expense-factory";
import { computeUnitPrice, normalizeProductName } from "@/lib/products";
import { formatMoney } from "@/lib/utils";
import type { ReceiptItem } from "@/lib/types";
import { ITEM_CONFIRM_THRESHOLD } from "@/lib/receipt-pipeline";

export function LineItemsEditor({
  expenseId,
  category,
  items,
  onChange,
}: {
  expenseId: string;
  category: string;
  items: ReceiptItem[];
  onChange: (items: ReceiptItem[]) => void;
}) {
  const updateItem = (id: string, patch: Partial<ReceiptItem>) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        const unitInfo = computeUnitPrice({
          totalPrice: next.totalPrice,
          quantity: next.quantity,
          unit: next.unit,
          name: next.name,
          existingUnitPrice: next.unitPrice,
        });
        return {
          ...next,
          normalizedName: normalizeProductName(next.name),
          unitPrice: unitInfo.unitPrice ?? next.unitPrice,
        };
      })
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next]!, copy[index]!];
    onChange(copy);
  };

  const addItem = () => {
    onChange([...items, createEmptyItem(expenseId, category)]);
  };

  const sum = items.reduce((a, i) => a + (i.totalPrice || 0), 0);

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Ad · fiyat · ekle / sil / sırala
        </p>
        <Button type="button" size="sm" variant="secondary" onClick={addItem}>
          <Plus className="mr-1 h-4 w-4" />
          Ekle
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">
          Henüz ürün yok. Manuel ekleyebilirsin.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => {
            const lowConfidence =
              item.confidence != null &&
              item.confidence < ITEM_CONFIRM_THRESHOLD;
            return (
            <li
              key={item.id}
              className={`space-y-2 rounded-xl border bg-white p-3 ${
                lowConfidence
                  ? "border-amber-300/80 bg-amber-50/40"
                  : "border-black/[0.05]"
              }`}
            >
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Ürün adı</Label>
                  {lowConfidence ? (
                    <span className="text-[10px] font-medium text-amber-800">
                      Düşük güven ({Math.round((item.confidence ?? 0) * 100)}%)
                    </span>
                  ) : null}
                </div>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder="Muz, Su 1,5 L…"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Adet / miktar</Label>
                  <AmountInput
                    value={item.quantity ?? 1}
                    onChange={(n) =>
                      updateItem(item.id, { quantity: n <= 0 ? 1 : n })
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Birim</Label>
                  <Input
                    value={item.unit ?? ""}
                    onChange={(e) =>
                      updateItem(item.id, { unit: e.target.value || null })
                    }
                    placeholder="kg, L, adet"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Fiyat</Label>
                  <AmountInput
                    value={item.totalPrice ?? 0}
                    onChange={(n) =>
                      updateItem(item.id, { totalPrice: n === 0 ? null : n })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {item.unitPrice != null
                    ? `Birim ${formatMoney(item.unitPrice)}${
                        item.unit ? `/${item.unit}` : ""
                      }`
                    : " "}
                </p>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Yukarı"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Aşağı"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Sil"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-between border-t border-black/[0.05] pt-3 text-sm">
          <span className="text-muted-foreground">Ürünler toplamı</span>
          <span className="font-amount font-bold">{formatMoney(sum)}</span>
        </div>
      )}
    </div>
  );
}
