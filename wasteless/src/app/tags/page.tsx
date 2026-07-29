"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWasteLessStore } from "@/hooks/use-store";
import { createTag, TAG_COLORS } from "@/lib/tags";
import { formatMoney } from "@/lib/utils";
import type { UserTag } from "@/lib/types";

export default function TagsPage() {
  const { tags, expenses, upsertTag, removeTag } = useWasteLessStore();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<string>(TAG_COLORS[0]);

  const counts = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const expense of expenses) {
      for (const tagId of expense.tagIds ?? []) {
        const cur = map.get(tagId) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += expense.totalAmount || 0;
        map.set(tagId, cur);
      }
    }
    return map;
  }, [expenses]);

  const create = async () => {
    if (!label.trim()) return;
    const tag = createTag(label, tags.length);
    tag.color = color;
    await upsertTag(tag);
    toast("Etiket eklendi", "success");
    setLabel("");
  };

  const handleDelete = async (tag: UserTag) => {
    const used = counts.get(tag.id)?.count ?? 0;
    const ok = await confirm({
      title: "Etiket silinsin mi?",
      description:
        used > 0
          ? `"${tag.label}" ${used} harcamadan kaldırılacak.`
          : `"${tag.label}" kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      cancelLabel: "İptal",
      destructive: true,
    });
    if (!ok) return;
    await removeTag(tag.id);
    toast("Etiket silindi", "danger");
  };

  return (
    <AppShell>
      <header className="mb-5 animate-fade-up">
        <h1 className="font-display text-2xl tracking-tight">Etiketler</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alımlarını anılar ve bağlam ile işaretle
        </p>
      </header>

      <section className="mb-5 space-y-3 rounded-2xl border border-white/70 bg-white/80 p-4 animate-fade-up delay-1">
        <h2 className="font-semibold">Yeni etiket</h2>
        <div className="grid gap-2">
          <Label>Ad</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Weekend Trip, Eskişehir…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              className="h-8 w-8 rounded-full border-2 transition active:scale-95"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "#10231f" : "transparent",
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <Button className="w-full gap-2" onClick={() => void create()}>
          <Plus className="h-4 w-4" />
          Ekle
        </Button>
      </section>

      <div className="space-y-2 animate-fade-up delay-2">
        {tags.map((tag) => {
          const stats = counts.get(tag.id);
          return (
            <div
              key={tag.id}
              className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 p-3"
            >
              <Link
                href={`/tag?id=${encodeURIComponent(tag.id)}`}
                className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]"
              >
                <span
                  className="h-10 w-10 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="min-w-0">
                  <p className="font-semibold">{tag.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.count ?? 0} kayıt ·{" "}
                    {formatMoney(stats?.total ?? 0)}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label="Etiketi sil"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"
                onClick={() => void handleDelete(tag)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        {tags.length === 0 && (
          <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-10 text-center">
            <p className="font-medium">Henüz etiket yok</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Weekend Trip, Vacation 2026 gibi etiketler ekle.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
