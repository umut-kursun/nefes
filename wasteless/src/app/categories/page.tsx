"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWasteLessStore } from "@/hooks/use-store";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  slugifyCategoryLabel,
  softColorFromHex,
} from "@/lib/categories";
import { buildCategoryTree, listRootCategories } from "@/lib/category-hierarchy";
import type { UserCategory } from "@/lib/types";
import { createId } from "@/lib/utils";

type FormState = {
  label: string;
  description: string;
  icon: string;
  color: string;
  softColor: string;
  parentId: string | null;
};

const emptyForm = (): FormState => ({
  label: "",
  description: "",
  icon: "shopping",
  color: CATEGORY_COLORS[0].color,
  softColor: CATEGORY_COLORS[0].soft,
  parentId: null,
});

export default function CategoriesManagePage() {
  const {
    categories,
    expenses,
    upsertCategory,
    removeCategory,
    moveCategory,
  } = useWasteLessStore();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [editing, setEditing] = useState<UserCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const roots = useMemo(() => listRootCategories(categories), [categories]);

  const usageById = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + 1);
    }
    return map;
  }, [expenses]);

  const openCreate = (parentId: string | null = null) => {
    setCreating(true);
    setEditing(null);
    setForm({ ...emptyForm(), parentId });
  };

  const openEdit = (category: UserCategory) => {
    setEditing(category);
    setCreating(false);
    setForm({
      label: category.label ?? "",
      description: category.description ?? "",
      icon: category.icon,
      color: category.color,
      softColor: category.softColor,
      parentId: category.parentId ?? null,
    });
  };

  const save = async () => {
    if (!(form.label ?? "").trim()) return;
    const now = new Date().toISOString();
    if (editing) {
      await upsertCategory({
        ...editing,
        ...form,
        label: (form.label ?? "").trim(),
        description: (form.description ?? "").trim(),
        parentId: form.parentId === editing.id ? null : form.parentId,
        specialType: editing.specialType,
        updatedAt: now,
      });
    } else {
      let id = slugifyCategoryLabel(form.label);
      if (categories.some((c) => c.id === id)) {
        id = `${id}_${createId("c").slice(-4)}`;
      }
      const siblings = categories.filter((c) =>
        form.parentId ? c.parentId === form.parentId : !c.parentId
      );
      await upsertCategory({
        id,
        ...form,
        label: (form.label ?? "").trim(),
        description: (form.description ?? "").trim(),
        parentId: form.parentId,
        specialType: null,
        sortOrder: siblings.length,
        createdAt: now,
        updatedAt: now,
      });
    }
    setCreating(false);
    setEditing(null);
    setForm(emptyForm());
  };

  /** Reorder within sibling group (same parentId). */
  const moveSibling = async (id: string, direction: -1 | 1) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    const siblings = categories
      .filter((c) =>
        target.parentId ? c.parentId === target.parentId : !c.parentId
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((c) => c.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    // Preserve relative order of non-siblings
    const siblingIds = new Set(reordered.map((c) => c.id));
    const others = categories
      .filter((c) => !siblingIds.has(c.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.id);
    // Interleave: keep global list but update sibling block order via moveCategory full id list
    const allIds = categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.id);
    const firstSiblingAt = allIds.findIndex((sid) => siblingIds.has(sid));
    if (firstSiblingAt < 0) {
      await moveCategory([...others, ...reordered.map((c) => c.id)]);
      return;
    }
    const without = allIds.filter((sid) => !siblingIds.has(sid));
    without.splice(firstSiblingAt, 0, ...reordered.map((c) => c.id));
    await moveCategory(without);
  };

  const handleDelete = async (category: UserCategory) => {
    if (category.id === "other") {
      toast('"Diğer" kategorisi silinemez', "default");
      return;
    }
    const used = usageById.get(category.id) ?? 0;
    const childCount = categories.filter((c) => c.parentId === category.id).length;
    const ok = await confirm({
      title: "Kategori silinsin mi?",
      description:
        childCount > 0
          ? `"${category.label}" altında ${childCount} alt kategori var. Önce onları taşı veya sil.`
          : used > 0
            ? `"${category.label}" silinecek. ${used} harcama "Diğer" kategorisine taşınacak.`
            : `"${category.label}" kalıcı olarak silinecek.`,
      confirmLabel: childCount > 0 ? "Tamam" : "Sil",
      cancelLabel: "İptal",
      destructive: childCount === 0,
    });
    if (!ok || childCount > 0) return;
    await removeCategory(category.id);
    toast("Kategori silindi", "danger");
  };

  const showForm = creating || editing;

  const renderRow = (category: UserCategory, depth: number) => {
    const count = usageById.get(category.id) ?? 0;
    const parentLabel = category.parentId
      ? categories.find((c) => c.id === category.parentId)?.label
      : null;
    const siblings = categories
      .filter((c) =>
        category.parentId ? c.parentId === category.parentId : !c.parentId
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((c) => c.id === category.id);

    return (
      <div
        key={category.id}
        className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm"
        style={{ marginLeft: depth > 0 ? Math.min(depth * 12, 24) : 0 }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: category.softColor,
              color: category.color,
            }}
          >
            <AppIcon name={category.icon} className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{category.label}</p>
            <p className="text-xs text-muted-foreground">
              {parentLabel ? (
                <>
                  Üst: {parentLabel}
                  {" · "}
                </>
              ) : (
                <>Üst kategori · </>
              )}
              {count} kayıt
            </p>
            {category.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/90">
                {category.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              disabled={index === 0}
              onClick={() => void moveSibling(category.id, -1)}
              aria-label="Yukarı"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              disabled={index === siblings.length - 1}
              onClick={() => void moveSibling(category.id, 1)}
              aria-label="Aşağı"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              onClick={() => openEdit(category)}
              aria-label="Düzenle"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              onClick={() => void handleDelete(category)}
              aria-label="Sil"
            >
              <Trash2 className="h-4 w-4 text-rose-600" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Kategoriler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Üst kategori ve alt kategorilerini yönet
          </p>
        </div>
        <Button size="icon" onClick={() => openCreate(null)} aria-label="Kategori ekle">
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {showForm && (
        <section className="mb-5 space-y-3 rounded-2xl border border-white/70 bg-white/80 p-4">
          <h2 className="font-semibold">
            {editing ? "Kategoriyi düzenle" : "Yeni kategori"}
          </h2>
          <div className="grid gap-2">
            <Label>Ad</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Sağlık, Akaryakıt…"
            />
          </div>
          <div className="grid gap-2">
            <Label>Üst kategori (opsiyonel)</Label>
            <select
              className="h-12 rounded-xl border border-input bg-background px-3"
              value={form.parentId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  parentId: e.target.value || null,
                }))
              }
            >
              <option value="">Yok (üst kategori)</option>
              {roots
                .filter((c) => c.id !== editing?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Açıklama</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Kısa açıklama"
            />
          </div>
          <div className="grid gap-2">
            <Label>İkon</Label>
            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
              {CATEGORY_ICONS.map((icon) => (
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
              {CATEGORY_COLORS.slice(0, 16).map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      color: item.color,
                      softColor: item.soft,
                    }))
                  }
                  className={`h-9 w-9 rounded-full border-2 ${
                    form.color.toLowerCase() === item.color.toLowerCase()
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: item.color }}
                  aria-label={item.color}
                />
              ))}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : "#0F766E"}
                onChange={(e) => {
                  const color = e.target.value.toUpperCase();
                  setForm((f) => ({
                    ...f,
                    color,
                    softColor: softColorFromHex(color),
                  }));
                }}
                className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                aria-label="Özel renk"
              />
              <Input
                value={form.color}
                onChange={(e) => {
                  const color = e.target.value.trim();
                  setForm((f) => ({
                    ...f,
                    color,
                    softColor: softColorFromHex(color),
                  }));
                }}
                placeholder="#0F766E"
                className="font-mono text-sm uppercase"
              />
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

      <section className="space-y-3">
        {tree.map(({ parent, children }) => (
          <div key={parent.id} className="space-y-2">
            {renderRow(parent, 0)}
            {children.map((child) => renderRow(child, 1))}
            <button
              type="button"
              onClick={() => openCreate(parent.id)}
              className="ml-3 text-xs font-medium text-primary"
            >
              + Alt kategori ekle
            </button>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
