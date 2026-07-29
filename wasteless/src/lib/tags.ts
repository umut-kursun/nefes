import type { UserTag } from "@/lib/types";
import { createId } from "@/lib/utils";

export const TAG_COLORS = [
  "#0F766E",
  "#1D4ED8",
  "#B45309",
  "#9F1239",
  "#6D28D9",
  "#047857",
  "#C2410C",
  "#334155",
] as const;

export function createTag(label: string, sortOrder = 0): UserTag {
  const now = new Date().toISOString();
  const color = TAG_COLORS[sortOrder % TAG_COLORS.length];
  return {
    id: createId("tag"),
    label: label.trim(),
    color,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveTag(
  tags: UserTag[],
  id: string
): UserTag | undefined {
  return tags.find((t) => t.id === id);
}

export function tagsForExpense(
  tags: UserTag[],
  tagIds: string[] | null | undefined
): UserTag[] {
  if (!tagIds?.length) return [];
  const map = new Map(tags.map((t) => [t.id, t]));
  return tagIds.map((id) => map.get(id)).filter(Boolean) as UserTag[];
}
