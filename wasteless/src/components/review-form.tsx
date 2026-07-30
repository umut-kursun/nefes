"use client";

import {
  isCigaretteCategory,
  isFuelCategory,
  resolveCategory,
} from "@/lib/categories";
import { normalizeMerchantName } from "@/lib/merchants";
import { formatPlate } from "@/lib/plate";
import { checkReceiptConsistency, findLineItemIssues, sumItemPrices } from "@/lib/receipt-quality";
import { getRecentMerchants } from "@/lib/recent-values";
import { AmountInput } from "@/components/amount-input";
import { CategoryDropdownPicker } from "@/components/category-dropdown-picker";
import { LineItemsEditor } from "@/components/line-items-editor";
import { ReceiptChargesEditor } from "@/components/receipt-charges-editor";
import { TrustBanner } from "@/components/trust-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TagPicker } from "@/components/tag-picker";
import { useWasteLessStore } from "@/hooks/use-store";
import { formatMoney } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Expense } from "@/lib/types";
import { ChargeType, DiscountType, parseChargeType, parseDiscountType } from "@/lib/receipt-model";

interface ReviewFormProps {
  initial: Expense;
  onSave: (expense: Expense) => Promise<void> | void;
  onCancel?: () => void;
  saving?: boolean;
  /** When true (OCR flow), keep products collapsed for a compact first screen. */
  compactProducts?: boolean;
}

export function ReviewForm({
  initial,
  onSave,
  onCancel,
  saving,
  compactProducts = false,
}: ReviewFormProps) {
  const { categories, expenses } = useWasteLessStore();
  const merchantRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Expense>({
    ...initial,
    time: initial.time ?? null,
    tagIds: initial.tagIds ?? [],
    items: initial.items ?? [],
    charges: initial.charges ?? [],
    discounts: initial.discounts ?? [],
    payments: initial.payments ?? [],
    unknownLines: initial.unknownLines ?? [],
  });
  const [ackInconsistency, setAckInconsistency] = useState(false);
  const [productsOpen, setProductsOpen] = useState(
    () => !compactProducts && (initial.items?.length ?? 0) === 0
  );
  const selected = resolveCategory(categories, form.category);
  const showFuel = isFuelCategory(selected);
  const showCigarette = isCigaretteCategory(selected);

  const recentMerchants = useMemo(
    () => getRecentMerchants(expenses),
    [expenses]
  );

  useEffect(() => {
    if (compactProducts) {
      merchantRef.current?.focus();
    }
  }, [compactProducts]);

  const consistency = useMemo(
    () =>
      checkReceiptConsistency(
        form.items,
        form.totalAmount,
        form.charges,
        form.discounts
      ),
    [form.items, form.totalAmount, form.charges, form.discounts]
  );

  const lineIssues = useMemo(
    () =>
      findLineItemIssues(
        form.items,
        form.totalAmount,
        form.charges,
        form.discounts
      ),
    [form.items, form.totalAmount, form.charges, form.discounts]
  );

  const update = <K extends keyof Expense>(key: K, value: Expense[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateFuel = (key: string, value: string | number | null) => {
    setForm((prev) => ({
      ...prev,
      fuel: {
        fuelType: prev.fuel?.fuelType ?? null,
        liters: prev.fuel?.liters ?? null,
        pricePerLiter: prev.fuel?.pricePerLiter ?? null,
        stationName: prev.fuel?.stationName ?? null,
        odometer: prev.fuel?.odometer ?? null,
        plate: prev.fuel?.plate ?? null,
        [key]: value === "" || value === null ? null : value,
      },
    }));
  };

  const updatePlate = (value: string) => {
    const formatted = value
      ? formatPlate(value) ?? value.toLocaleUpperCase("tr-TR")
      : null;
    setForm((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      fuel: {
        fuelType: prev.fuel?.fuelType ?? null,
        liters: prev.fuel?.liters ?? null,
        pricePerLiter: prev.fuel?.pricePerLiter ?? null,
        stationName: prev.fuel?.stationName ?? null,
        odometer: prev.fuel?.odometer ?? null,
        plate: formatted,
      },
    }));
  };

  const applyItemsSumToTotal = () => {
    if (consistency.itemsSum > 0) {
      update("totalAmount", Math.round(consistency.itemsSum * 100) / 100);
      setAckInconsistency(true);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (consistency.inconsistent && !ackInconsistency) {
          setAckInconsistency(false);
          // Force user to acknowledge by scrolling warning into view — still block save
          const el = document.getElementById("receipt-consistency-warning");
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        const merchantRaw = form.merchantRaw ?? form.merchantName;
        await onSave({
          ...form,
          merchantRaw,
          merchantName: normalizeMerchantName(form.merchantName ?? merchantRaw),
          items: form.items
            .filter((i) => i.name.trim())
            .map((i) => ({
              ...i,
              name: i.name.trim(),
              expenseId: form.id,
            })),
          charges: form.charges.filter(
            (c) => c.label.trim() && c.amount > 0
          ),
          discounts: form.discounts.filter(
            (c) => c.label.trim() && c.amount > 0
          ),
          payments: form.payments.filter((p) => p.label.trim()),
          unknownLines: form.unknownLines.filter((u) => u.label.trim()),
          imageDataUrl: form.imageDataUrl,
          rawText: form.rawText,
          aiResponseJson: form.aiResponseJson,
        });
      }}
    >
      {form.confidence != null && (
        <TrustBanner confidence={form.confidence} />
      )}

      {consistency.inconsistent && (
        <div
          id="receipt-consistency-warning"
          className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950"
        >
          <p className="font-semibold">Fiş tutarsızlığı tespit edildi</p>
          <p>
            Hesaplanan toplam {formatMoney(consistency.itemsSum)} (ürünler{" "}
            {formatMoney(sumItemPrices(form.items))}
            {(form.charges?.length ?? 0) > 0
              ? ` + ek ücretler ${formatMoney(
                  form.charges.reduce((a, c) => a + (c.amount || 0), 0)
                )}`
              : ""}
            {(form.discounts?.length ?? 0) > 0
              ? ` − indirimler ${formatMoney(
                  form.discounts.reduce((a, c) => a + (c.amount || 0), 0)
                )}`
              : ""}
            ), fiş toplamı {formatMoney(consistency.total ?? 0)}.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={applyItemsSumToTotal}
            >
              Toplamı hesaplanana eşitle
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAckInconsistency(true)}
            >
              Yine de kaydet
            </Button>
          </div>
          {ackInconsistency && (
            <p className="text-xs text-rose-800/80">
              Onaylandı — kaydedebilirsin.
            </p>
          )}
          {lineIssues.length > 0 && (
            <ul className="mt-2 space-y-2 border-t border-rose-200/60 pt-2">
              {lineIssues.map((issue, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-white/60 px-2 py-1.5 text-xs"
                >
                  <p className="font-semibold">{issue.name}</p>
                  <p className="text-rose-900/90">{issue.reason}</p>
                  {issue.expected != null && issue.parsed != null && (
                    <p className="tabular-nums">
                      Beklenen: {formatMoney(issue.expected)} · Okunan:{" "}
                      {formatMoney(issue.parsed)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="merchant">İşyeri</Label>
          <Input
            ref={merchantRef}
            id="merchant"
            list="recent-merchants"
            value={form.merchantName ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              setForm((prev) => ({
                ...prev,
                merchantRaw: prev.merchantRaw ?? value,
                merchantName: value,
                updatedAt: new Date().toISOString(),
              }));
            }}
            placeholder="Migros, Shell, Starbucks..."
          />
          <datalist id="recent-merchants">
            {recentMerchants.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {recentMerchants.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {recentMerchants.slice(0, 5).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted/60 active:scale-95"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      merchantRaw: prev.merchantRaw ?? m,
                      merchantName: m,
                      updatedAt: new Date().toISOString(),
                    }));
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="date">Tarih</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Saat</Label>
            <Input
              id="time"
              type="time"
              value={form.time ?? ""}
              onChange={(e) => update("time", e.target.value || null)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="amount">Toplam tutar</Label>
          <AmountInput
            id="amount"
            value={form.totalAmount}
            onChange={(n) => {
              setAckInconsistency(false);
              update("totalAmount", n);
            }}
          />
        </div>

        <CategoryDropdownPicker
          categories={categories}
          value={form.category}
          onChange={(category) => {
            setForm((prev) => ({
              ...prev,
              category,
              updatedAt: new Date().toISOString(),
            }));
          }}
        />

        <div className="grid gap-2">
          <Label>Etiket (isteğe bağlı)</Label>
          <TagPicker
            value={form.tagIds ?? []}
            onChange={(tagIds) => update("tagIds", tagIds)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Not</Label>
          <Textarea
            id="notes"
            value={form.notes ?? ""}
            onChange={(e) => update("notes", e.target.value || null)}
            placeholder="İsteğe bağlı not"
          />
        </div>
      </div>

      {showFuel && (
        <div className="space-y-3 rounded-2xl border border-border/70 bg-white/70 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Akaryakıt</h3>
            <Badge variant="secondary">plaka</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-2">
              <Label>Plaka</Label>
              <Input
                value={form.fuel?.plate ?? ""}
                onChange={(e) => updatePlate(e.target.value)}
                placeholder="34 ABC 123"
                autoCapitalize="characters"
                className="font-amount text-base tracking-wide"
              />
            </div>
            <div className="grid gap-2">
              <Label>Yakıt tipi</Label>
              <Input
                value={form.fuel?.fuelType ?? ""}
                onChange={(e) => updateFuel("fuelType", e.target.value)}
                placeholder="Benzin, Motorin…"
              />
            </div>
            <div className="grid gap-2">
              <Label>Litre</Label>
              <AmountInput
                value={form.fuel?.liters ?? 0}
                onChange={(n) => updateFuel("liters", n === 0 ? null : n)}
              />
            </div>
            <div className="col-span-2 grid gap-2">
              <Label>Litre fiyatı</Label>
              <AmountInput
                value={form.fuel?.pricePerLiter ?? 0}
                onChange={(n) =>
                  updateFuel("pricePerLiter", n === 0 ? null : n)
                }
              />
            </div>
          </div>
        </div>
      )}

      {showCigarette && (
        <div className="grid gap-2 rounded-2xl border border-border/70 bg-white/70 p-4">
          <Label htmlFor="packCount">Paket sayısı</Label>
          <AmountInput
            id="packCount"
            value={form.packCount ?? 0}
            onChange={(n) => update("packCount", n === 0 ? null : n)}
            placeholder="1"
          />
        </div>
      )}

      <div className="rounded-2xl border border-border/70 bg-white/70">
        <button
          type="button"
          onClick={() => setProductsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 font-semibold">
            {productsOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            Ürünler
            <span className="text-sm font-normal text-muted-foreground">
              ({form.items.length})
            </span>
          </span>
          {!productsOpen && form.items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Düzenlemek için aç
            </span>
          )}
        </button>
        {productsOpen && (
          <div className="border-t border-black/[0.05] p-3 pt-0">
            <LineItemsEditor
              expenseId={form.id}
              category={form.category}
              items={form.items}
              highlightLowConfidence={compactProducts}
              onChange={(items) => {
                setAckInconsistency(false);
                update("items", items);
              }}
            />
          </div>
        )}
      </div>

      {(form.charges.length > 0 ||
        form.discounts.length > 0 ||
        form.sourceType === "receipt") && (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-white/70 p-4">
          <h3 className="font-semibold">Fiş kalemleri</h3>
          <ReceiptChargesEditor
            label="Ek ücretler (kargo, hizmet, poşet…)"
            addLabel="Ekle"
            placeholder="Teslimat, poşet…"
            lines={form.charges}
            onChange={(charges) => {
              setAckInconsistency(false);
              update(
                "charges",
                charges.map((c) => ({
                  type: c.type ? parseChargeType(c.type) : ChargeType.Other,
                  label: c.label,
                  amount: c.amount,
                }))
              );
            }}
          />
          <ReceiptChargesEditor
            label="İndirimler / kuponlar"
            addLabel="Ekle"
            placeholder="İndirim, kupon…"
            lines={form.discounts}
            onChange={(discounts) => {
              setAckInconsistency(false);
              update(
                "discounts",
                discounts.map((d) => ({
                  type: d.type ? parseDiscountType(d.type) : DiscountType.Other,
                  label: d.label,
                  amount: d.amount,
                }))
              );
            }}
          />
        </div>
      )}

      <div className="sticky bottom-24 flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            İptal
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          disabled={saving || (consistency.inconsistent && !ackInconsistency)}
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
