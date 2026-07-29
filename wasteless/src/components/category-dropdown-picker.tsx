"use client";

import { useMemo } from "react";
import {
  getChildren,
  getRootCategoryId,
  listRootCategories,
} from "@/lib/category-hierarchy";
import type { UserCategory } from "@/lib/types";
import { Label } from "@/components/ui/label";

/**
 * Two compact dropdowns — category tree is never expanded inline.
 */
export function CategoryDropdownPicker({
  categories,
  value,
  onChange,
}: {
  categories: UserCategory[];
  value: string;
  onChange: (categoryId: string) => void;
}) {
  const roots = useMemo(() => listRootCategories(categories), [categories]);
  const rootId = getRootCategoryId(value, categories);
  const children = useMemo(
    () => getChildren(rootId, categories),
    [rootId, categories]
  );
  const subValue = value === rootId ? "" : value;

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="category-root">Kategori</Label>
        <select
          id="category-root"
          className="h-12 rounded-xl border border-input bg-background px-3 text-base"
          value={rootId}
          onChange={(e) => onChange(e.target.value)}
        >
          {roots.map((root) => (
            <option key={root.id} value={root.id}>
              {root.label}
            </option>
          ))}
        </select>
      </div>

      {children.length > 0 && (
        <div className="grid gap-2">
          <Label htmlFor="category-sub">Alt kategori</Label>
          <select
            id="category-sub"
            className="h-12 rounded-xl border border-input bg-background px-3 text-base"
            value={subValue}
            onChange={(e) => onChange(e.target.value || rootId)}
          >
            <option value="">Genel</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
