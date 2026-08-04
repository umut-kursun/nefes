"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppSettings,
  Expense,
  QuickButton,
  UserCategory,
  UserTag,
} from "@/lib/types";
import {
  clearAllData,
  createExpenseFromQuickButton,
  deleteCategory,
  deleteExpense,
  deleteQuickButton,
  deleteTag,
  ensureSeedData,
  exportAllData,
  getAllExpenses,
  getCategories,
  getQuickButtons,
  getSettings,
  getTags,
  reorderCategories,
  reorderQuickButtons,
  saveCategory,
  saveExpense,
  saveQuickButton,
  saveSettings,
  saveTag,
} from "@/lib/db";
import { refreshKnowledgeOverlayCache } from "@/lib/product-knowledge/kbStore";

type StoreValue = {
  ready: boolean;
  expenses: Expense[];
  quickButtons: QuickButton[];
  categories: UserCategory[];
  tags: UserTag[];
  settings: AppSettings;
  refresh: () => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  addExpenseOptimistic: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  tapQuickButton: (button: QuickButton) => Promise<Expense>;
  upsertQuickButton: (button: QuickButton) => Promise<void>;
  removeQuickButton: (id: string) => Promise<void>;
  moveQuickButton: (ids: string[]) => Promise<void>;
  upsertCategory: (category: UserCategory) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  moveCategory: (ids: string[]) => Promise<void>;
  upsertTag: (tag: UserTag) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
  updateSettings: (next: AppSettings) => Promise<void>;
  exportData: () => Promise<Awaited<ReturnType<typeof exportAllData>>>;
  wipeData: () => Promise<void>;
};

const WasteLessContext = createContext<StoreValue | null>(null);

export function WasteLessProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [quickButtons, setQuickButtons] = useState<QuickButton[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [tags, setTags] = useState<UserTag[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: "light",
    displayName: null,
    onboardingCompleted: false,
  });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    await ensureSeedData();
    const [nextExpenses, nextButtons, nextCategories, nextTags, nextSettings] =
      await Promise.all([
        getAllExpenses(),
        getQuickButtons(),
        getCategories(),
        getTags(),
        getSettings(),
      ]);
    await refreshKnowledgeOverlayCache();
    setExpenses(nextExpenses);
    setQuickButtons(nextButtons);
    setCategories(nextCategories);
    setTags(nextTags);
    setSettings(nextSettings);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addExpense = useCallback(
    async (expense: Expense) => {
      await saveExpense(expense);
      await refresh();
    },
    [refresh]
  );

  const addExpenseOptimistic = useCallback(
    async (expense: Expense) => {
      setExpenses((prev) => [expense, ...prev]);
      await saveExpense(expense);
    },
    []
  );

  const updateExpense = useCallback(
    async (expense: Expense) => {
      setExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? expense : e))
      );
      await saveExpense(expense);
    },
    []
  );

  const removeExpense = useCallback(
    async (id: string) => {
      // Optimistic UI: drop immediately, then persist + reconcile
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      await deleteExpense(id);
      await refresh();
    },
    [refresh]
  );

  const tapQuickButton = useCallback(
    async (button: QuickButton) => {
      const expense = await createExpenseFromQuickButton(button);
      await refresh();
      return expense;
    },
    [refresh]
  );

  const upsertQuickButton = useCallback(
    async (button: QuickButton) => {
      await saveQuickButton(button);
      await refresh();
    },
    [refresh]
  );

  const removeQuickButton = useCallback(
    async (id: string) => {
      await deleteQuickButton(id);
      await refresh();
    },
    [refresh]
  );

  const moveQuickButton = useCallback(
    async (ids: string[]) => {
      await reorderQuickButtons(ids);
      await refresh();
    },
    [refresh]
  );

  const upsertCategory = useCallback(
    async (category: UserCategory) => {
      await saveCategory(category);
      await refresh();
    },
    [refresh]
  );

  const removeCategory = useCallback(
    async (id: string) => {
      await deleteCategory(id);
      await refresh();
    },
    [refresh]
  );

  const moveCategory = useCallback(
    async (ids: string[]) => {
      await reorderCategories(ids);
      await refresh();
    },
    [refresh]
  );

  const upsertTag = useCallback(
    async (tag: UserTag) => {
      await saveTag(tag);
      await refresh();
    },
    [refresh]
  );

  const removeTag = useCallback(
    async (id: string) => {
      await deleteTag(id);
      await refresh();
    },
    [refresh]
  );

  const updateSettings = useCallback(async (next: AppSettings) => {
    await saveSettings(next);
    setSettings(next);
  }, []);

  const exportData = useCallback(async () => exportAllData(), []);

  const wipeData = useCallback(async () => {
    await clearAllData();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ready,
      expenses,
      quickButtons,
      categories,
      tags,
      settings,
      refresh,
      addExpense,
      addExpenseOptimistic,
      updateExpense,
      removeExpense,
      tapQuickButton,
      upsertQuickButton,
      removeQuickButton,
      moveQuickButton,
      upsertCategory,
      removeCategory,
      moveCategory,
      upsertTag,
      removeTag,
      updateSettings,
      exportData,
      wipeData,
    }),
    [
      ready,
      expenses,
      quickButtons,
      categories,
      tags,
      settings,
      refresh,
      addExpense,
      addExpenseOptimistic,
      updateExpense,
      removeExpense,
      tapQuickButton,
      upsertQuickButton,
      removeQuickButton,
      moveQuickButton,
      upsertCategory,
      removeCategory,
      moveCategory,
      upsertTag,
      removeTag,
      updateSettings,
      exportData,
      wipeData,
    ]
  );

  return createElement(
    WasteLessContext.Provider,
    { value },
    children
  );
}

export function useWasteLessStore(): StoreValue {
  const ctx = useContext(WasteLessContext);
  if (!ctx) {
    throw new Error("useWasteLessStore must be used within WasteLessProvider");
  }
  return ctx;
}
