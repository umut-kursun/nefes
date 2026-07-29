"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AmountInput } from "@/components/amount-input";
import { AppIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWasteLessStore } from "@/hooks/use-store";
import { getCategoryMeta } from "@/lib/categories";
import type { QuickButton } from "@/lib/types";
import { createId, formatMoney } from "@/lib/utils";

const ICONS = [
  "cigarette",
  "coffee",
  "utensils",
  "fuel",
  "shopping",
  "heart",
  "shirt",
  "more",
];
const COLORS = ["#0F766E", "#B45309", "#1D4ED8", "#047857", "#57534E", "#BE123C", "#7C3AED"];

const emptyForm = (
  defaultCategory: string
): Omit<QuickButton, "id" | "createdAt" | "updatedAt" | "sortOrder"> => ({
  title: "",
  category: defaultCategory,
  defaultAmount: 0,
  unit: null,
  notes: null,
  icon: "coffee",
  color: "#0F766E",
});

export default function QuickButtonsPage() {
  const {
    quickButtons,
    categories,
    upsertQuickButton,
    removeQuickButton,
    moveQuickButton,
    tapQuickButton,
  } = useWasteLessStore();
  const [editing, setEditing] = useState<QuickButton | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(() =>
    emptyForm(categories[0]?.id ?? "other")
  );

  const orderedIds = useMemo(
    () => quickButtons.map((b) => b.id),
    [quickButtons]
  );

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm(categories[0]?.id ?? "other"));
  };

  const openEdit = (button: QuickButton) => {
    setEditing(button);
    setCreating(false);
    setForm({
      title: button.title,
      category: button.category,
      defaultAmount: button.defaultAmount,
      unit: button.unit,
      notes: button.notes,
      icon: button.icon,
      color: button.color,
    });
  };

  const save = async () => {
    if (!form.title.trim() || form.defaultAmount <= 0) return;
    const now = new Date().toISOString();
    if (editing) {
      await upsertQuickButton({
        ...editing,
        ...form,
        title: form.title.trim(),
        updatedAt: now,
      });
    } else {
      await upsertQuickButton({
        id: createId("qb"),
        ...form,
        title: form.title.trim(),
        sortOrder: quickButtons.length,
        createdAt: now,
        updatedAt: now,
      });
    }
    setCreating(false);
    setEditing(null);
    setForm(emptyForm(categories[0]?.id ?? "other"));
  };

  const move = async (id: string, direction: -1 | 1) => {
    const index = orderedIds.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= orderedIds.length) return;
    const ids = [...orderedIds];
    [ids[index], ids[next]] = [ids[next], ids[index]];
    await moveQuickButton(ids);
  };

  const showForm = creating || editing;

  return (
    <AppShell>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Hızlı butonlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tek dokunuşla sık harcamaları kaydet
          </p>
        </div>
        <Button size="icon" onClick={openCreate} aria-label="Yeni buton">
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {showForm && (
        <section className="mb-5 space-y-3 rounded-2xl border border-white/70 bg-white/80 p-4">
          <h2 className="font-semibold">
            {editing ? "Butonu düzenle" : "Yeni buton"}
          </h2>
          <div className="grid gap-2">
            <Label>Başlık</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Kahve, Sigara..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tutar</Label>
              <AmountInput
                value={form.defaultAmount}
                onChange={(n) => setForm((f) => ({ ...f, defaultAmount: n }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Birim</Label>
              <Input
                value={form.unit ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value || null }))
                }
                placeholder="adet, paket..."
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Kategori</Label>
            <select
              className="h-12 rounded-xl border border-input bg-background px-3"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value,
                }))
              }
            >
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>İkon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                    form.icon === icon
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                >
                  <AppIcon name={icon} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Renk</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={`h-9 w-9 rounded-full border-2 ${
                    form.color === color ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              İptal
            </Button>
            <Button className="flex-1" onClick={() => void save()}>
              Kaydet
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-2">
        {quickButtons.map((button, index) => {
          const meta = getCategoryMeta(button.category, categories);
          return (
            <div
              key={button.id}
              className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void tapQuickButton(button)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundColor: button.color }}
                  >
                    <AppIcon name={button.icon} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{button.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta.label} · {formatMoney(button.defaultAmount)}
                      {button.unit ? ` / ${button.unit}` : ""}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() => void move(button.id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === quickButtons.length - 1}
                    onClick={() => void move(button.id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(button)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void removeQuickButton(button.id)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}
