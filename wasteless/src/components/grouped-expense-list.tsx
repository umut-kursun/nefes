"use client";

import Link from "next/link";
import { PurchaseCard } from "@/components/purchase-card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { useWasteLessStore } from "@/hooks/use-store";
import { groupExpensesByDate } from "@/lib/analytics";
import type { Expense } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export function GroupedExpenseList({
  expenses,
  emptyTitle = "Henüz kayıt yok",
  emptyDescription = "Fiş yükleyin veya hızlı butonla ekleyin.",
  limit,
  showEmptyAction = true,
  allowDelete = true,
}: {
  expenses: Expense[];
  emptyTitle?: string;
  emptyDescription?: string;
  limit?: number;
  showEmptyAction?: boolean;
  allowDelete?: boolean;
}) {
  const { removeExpense } = useWasteLessStore();
  const confirm = useConfirm();
  const { toast } = useToast();
  const source = typeof limit === "number" ? expenses.slice(0, limit) : expenses;
  const groups = groupExpensesByDate(source);

  const handleDelete = async (expense: Expense) => {
    const label = expense.merchantName || "bu kayıt";
    const amount = formatMoney(expense.totalAmount, expense.currency);
    const ok = await confirm({
      title: "Harcama silinsin mi?",
      description: `"${label}" (${amount}) kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      cancelLabel: "İptal",
      destructive: true,
    });
    if (!ok) return;
    await removeExpense(expense.id);
    toast("Harcama silindi", "danger");
  };

  if (source.length === 0) {
    return (
      <div className="px-2 py-8 text-center animate-fade-up">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl">
          🧾
        </div>
        <p className="font-medium">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        {showEmptyAction && (
          <Link href="/add" className="mt-4 inline-block">
            <Button>Harcama ekle</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.expenses.map((expense) => (
              <PurchaseCard
                key={expense.id}
                expense={expense}
                onDelete={allowDelete ? handleDelete : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
