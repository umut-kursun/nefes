"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  getChildren,
  getRootCategoryId,
  listRootCategories,
} from "@/lib/category-hierarchy";
import type { UserCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Lightweight category picker: parents only until expanded.
 * One open section at a time keeps cognitive load low.
 */
export function CategoryAccordionPicker({
  categories,
  value,
  onChange,
  id,
}: {
  categories: UserCategory[];
  value: string;
  onChange: (categoryId: string) => void;
  id?: string;
}) {
  const roots = useMemo(() => listRootCategories(categories), [categories]);
  const [openId, setOpenId] = useState<string | null>(() => {
    const root = getRootCategoryId(value, categories);
    const kids = getChildren(root, categories);
    return kids.length > 0 ? root : null;
  });

  const toggle = (rootId: string) => {
    setOpenId((prev) => (prev === rootId ? null : rootId));
  };

  const select = (categoryId: string) => {
    onChange(categoryId);
    const kids = getChildren(categoryId, categories);
    if (kids.length === 0) {
      // Leaf or leaf-like: keep parent open if this is a child
      const root = getRootCategoryId(categoryId, categories);
      if (root !== categoryId) setOpenId(root);
    }
  };

  return (
    <div
      id={id}
      className="overflow-hidden rounded-xl border border-input bg-background"
      role="listbox"
      aria-label="Kategori"
    >
      {roots.map((root) => {
        const children = getChildren(root.id, categories);
        const hasKids = children.length > 0;
        const isOpen = openId === root.id;
        const isSelectedRoot = value === root.id;
        const childSelected = children.some((c) => c.id === value);
        const highlight = isSelectedRoot || childSelected;

        if (!hasKids) {
          return (
            <button
              key={root.id}
              type="button"
              role="option"
              aria-selected={value === root.id}
              onClick={() => select(root.id)}
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-2 border-b border-black/[0.04] px-3 text-left text-sm last:border-0 transition",
                value === root.id
                  ? "bg-primary/10 font-semibold text-primary"
                  : "hover:bg-muted/40"
              )}
            >
              <span>{root.label}</span>
            </button>
          );
        }

        return (
          <div key={root.id} className="border-b border-black/[0.04] last:border-0">
            <button
              type="button"
              onClick={() => toggle(root.id)}
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm transition",
                highlight
                  ? "bg-primary/5 font-semibold text-primary"
                  : "hover:bg-muted/40"
              )}
              aria-expanded={isOpen}
            >
              <span>
                {root.label}
                {childSelected && !isOpen ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {children.find((c) => c.id === value)?.label}
                  </span>
                ) : null}
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-black/[0.04] bg-muted/20 pb-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === root.id}
                  onClick={() => select(root.id)}
                  className={cn(
                    "flex min-h-10 w-full items-center px-3 pl-6 text-left text-sm transition",
                    value === root.id
                      ? "font-semibold text-primary"
                      : "text-foreground/80 hover:bg-white/60"
                  )}
                >
                  {root.label} (genel)
                </button>
                {children.map((child) => {
                  const grand = getChildren(child.id, categories);
                  if (grand.length === 0) {
                    return (
                      <button
                        key={child.id}
                        type="button"
                        role="option"
                        aria-selected={value === child.id}
                        onClick={() => select(child.id)}
                        className={cn(
                          "flex min-h-10 w-full items-center px-3 pl-6 text-left text-sm transition",
                          value === child.id
                            ? "font-semibold text-primary"
                            : "text-foreground/80 hover:bg-white/60"
                        )}
                      >
                        {child.label}
                      </button>
                    );
                  }
                  // Nested expandable (rare; supports deeper trees)
                  return (
                    <NestedSection
                      key={child.id}
                      category={child}
                      categories={categories}
                      value={value}
                      onSelect={select}
                      depth={1}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NestedSection({
  category,
  categories,
  value,
  onSelect,
  depth,
}: {
  category: UserCategory;
  categories: UserCategory[];
  value: string;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const children = getChildren(category.id, categories);
  const [open, setOpen] = useState(
    () =>
      value === category.id ||
      children.some((c) => c.id === value)
  );
  const pad = 24 + depth * 12;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 text-left text-sm transition hover:bg-white/60",
          value === category.id || children.some((c) => c.id === value)
            ? "font-semibold text-primary"
            : "text-foreground/80"
        )}
        style={{ paddingLeft: pad }}
        aria-expanded={open}
      >
        <span>{category.label}</span>
        {open ? (
          <ChevronDown className="mr-3 h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="mr-3 h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div>
          <button
            type="button"
            role="option"
            aria-selected={value === category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              "flex min-h-9 w-full items-center text-left text-sm transition hover:bg-white/60",
              value === category.id
                ? "font-semibold text-primary"
                : "text-foreground/70"
            )}
            style={{ paddingLeft: pad + 12 }}
          >
            {category.label} (genel)
          </button>
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              role="option"
              aria-selected={value === child.id}
              onClick={() => onSelect(child.id)}
              className={cn(
                "flex min-h-9 w-full items-center text-left text-sm transition hover:bg-white/60",
                value === child.id
                  ? "font-semibold text-primary"
                  : "text-foreground/70"
              )}
              style={{ paddingLeft: pad + 12 }}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
