"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useWasteLessStore } from "@/hooks/use-store";
import { createTag } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const { tags, upsertTag } = useWasteLessStore();
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((t) => t !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const addNew = async () => {
    const label = draft.trim();
    if (!label) return;
    const existing = tags.find(
      (t) => t.label.toLocaleLowerCase("tr-TR") === label.toLocaleLowerCase("tr-TR")
    );
    if (existing) {
      if (!value.includes(existing.id)) onChange([...value, existing.id]);
      setDraft("");
      setCreating(false);
      return;
    }
    const tag = createTag(label, tags.length);
    await upsertTag(tag);
    onChange([...value, tag.id]);
    setDraft("");
    setCreating(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = value.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95",
                selected
                  ? "border-transparent text-white shadow-sm"
                  : "border-border/80 bg-white/80 text-foreground/80 hover:bg-white"
              )}
              style={
                selected
                  ? { backgroundColor: tag.color }
                  : { borderColor: `${tag.color}55`, color: tag.color }
              }
            >
              {tag.label}
            </button>
          );
        })}
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-white active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni etiket
          </button>
        )}
      </div>

      {creating && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Örn. Hafta sonu gezisi"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addNew();
              }
            }}
          />
          <Button type="button" onClick={() => void addNew()}>
            Ekle
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="İptal"
            onClick={() => {
              setCreating(false);
              setDraft("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function TagChips({
  tagIds,
  className,
}: {
  tagIds: string[];
  className?: string;
}) {
  const { tags } = useWasteLessStore();
  if (!tagIds?.length) return null;
  const selected = tags.filter((t) => tagIds.includes(t.id));
  if (!selected.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {selected.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}
