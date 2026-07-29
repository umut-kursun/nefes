import { tagHref, type Insight, type InsightContext } from "./types";

/** Most frequently used tag across expenses. */
export function getMostUsedTag(ctx: InsightContext): Insight | null {
  if (ctx.tags.length === 0) return null;

  const counts = new Map<string, number>();
  for (const e of ctx.expenses) {
    for (const id of e.tagIds ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null;

  const tag = ctx.tags.find((t) => t.id === top[0]);
  if (!tag) return null;

  return {
    id: "most-used-tag",
    icon: "sparkles",
    title: "Favori etiket",
    description: `En sık kullandığın etiket “${tag.label}” (${top[1]} kez).`,
    priority: 55,
    href: tagHref(tag.id),
  };
}
