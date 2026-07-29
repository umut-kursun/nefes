import type { Expense, UserCategory } from "@/lib/types";

/** Resolve a category id up to its root parent (parentId === null). */
export function getRootCategoryId(
  id: string | null | undefined,
  categories: UserCategory[]
): string {
  if (!id) return "other";
  const byId = new Map(categories.map((c) => [c.id, c]));
  let current = byId.get(id);
  if (!current) return id;

  const seen = new Set<string>();
  while (current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current.id;
}

export function getChildren(
  parentId: string,
  categories: UserCategory[]
): UserCategory[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** True when this category has children (a real grouping parent). */
export function hasChildren(
  categoryId: string,
  categories: UserCategory[]
): boolean {
  return categories.some((c) => c.parentId === categoryId);
}

/**
 * Root categories for dashboard: parentId === null.
 * Children never appear here.
 */
export function listRootCategories(categories: UserCategory[]): UserCategory[] {
  return categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveExpenseParentId(
  expense: Pick<Expense, "category">,
  categories: UserCategory[]
): string {
  return getRootCategoryId(expense.category, categories);
}

export function expensesForCategoryTree(
  expenses: Expense[],
  categoryId: string,
  categories: UserCategory[]
): Expense[] {
  const childIds = new Set(getChildren(categoryId, categories).map((c) => c.id));
  return expenses.filter(
    (e) => e.category === categoryId || childIds.has(e.category)
  );
}

export type PickerOption = {
  value: string;
  label: string;
  /** Parent label for optgroup; null = top-level leaf / root without children shown alone */
  group: string | null;
  isChild: boolean;
};

/**
 * Options for category selects: roots without children as standalone,
 * roots with children as optgroups containing the children (+ optional parent row).
 */
export function listCategoryPickerOptions(
  categories: UserCategory[]
): PickerOption[] {
  const roots = listRootCategories(categories);
  const options: PickerOption[] = [];

  for (const root of roots) {
    const children = getChildren(root.id, categories);
    if (children.length === 0) {
      options.push({
        value: root.id,
        label: root.label,
        group: null,
        isChild: false,
      });
      continue;
    }
    // Allow spending on the parent itself
    options.push({
      value: root.id,
      label: `${root.label} (genel)`,
      group: root.label,
      isChild: false,
    });
    for (const child of children) {
      options.push({
        value: child.id,
        label: child.label,
        group: root.label,
        isChild: true,
      });
    }
  }

  return options;
}

/** Build a tree for category management UI. */
export function buildCategoryTree(categories: UserCategory[]): {
  parent: UserCategory;
  children: UserCategory[];
}[] {
  const roots = listRootCategories(categories);
  const childIds = new Set(
    categories.filter((c) => c.parentId).map((c) => c.id)
  );
  // Orphan children whose parent is missing — show under a synthetic group
  const orphans = categories.filter(
    (c) => c.parentId && !categories.some((p) => p.id === c.parentId)
  );

  const tree = roots.map((parent) => ({
    parent,
    children: getChildren(parent.id, categories),
  }));

  if (orphans.length > 0) {
    // Attach orphans as if they were roots for management visibility
    for (const orphan of orphans) {
      if (childIds.has(orphan.id) && !roots.some((r) => r.id === orphan.id)) {
        tree.push({ parent: orphan, children: [] });
      }
    }
  }

  return tree;
}
