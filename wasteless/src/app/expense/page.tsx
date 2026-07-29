"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { ReceiptViewer } from "@/components/receipt-viewer";
import { ReviewForm } from "@/components/review-form";
import { TagChips } from "@/components/tag-picker";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { useSmartBack } from "@/hooks/use-smart-back";
import { useWasteLessStore } from "@/hooks/use-store";
import { getCategoryMeta } from "@/lib/categories";
import { formatDateTime } from "@/lib/datetime";
import { buildCorrectionRecords } from "@/lib/ocr-correction-memory";
import { saveOcrCorrections } from "@/lib/db";
import { formatMoney } from "@/lib/utils";

function ExpenseDetailInner() {
  const params = useSearchParams();
  const goBack = useSmartBack("/");
  const id = params.get("id");
  const {
    expenses,
    categories,
    ready,
    addExpense,
    removeExpense,
  } = useWasteLessStore();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const expense = useMemo(
    () => expenses.find((e) => e.id === id) ?? null,
    [expenses, id]
  );
  const meta = expense
    ? getCategoryMeta(expense.category, categories)
    : null;

  if (!ready) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </AppShell>
    );
  }

  if (!expense || !meta) {
    return (
      <AppShell>
        <p className="font-medium">Kayıt bulunamadı</p>
        <button
          type="button"
          onClick={goBack}
          className="mt-3 inline-block text-sm text-primary"
        >
          Geri dön
        </button>
      </AppShell>
    );
  }

  if (editing) {
    return (
      <AppShell>
        <header className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-xl p-2 hover:bg-white/70"
            aria-label="Geri"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl tracking-tight">Düzenle</h1>
        </header>
        <ReviewForm
          initial={expense}
          saving={saving}
          onCancel={() => setEditing(false)}
          onSave={async (next) => {
            setSaving(true);
            try {
              const isOcr =
                expense.sourceType === "receipt" ||
                expense.sourceType === "bank_screenshot";
              if (isOcr) {
                const rows = buildCorrectionRecords(expense, next);
                if (rows.length) await saveOcrCorrections(rows);
              }
              // Preserve original OCR fields on the expense
              await addExpense({
                ...next,
                rawText: expense.rawText ?? next.rawText,
                merchantRaw: expense.merchantRaw ?? next.merchantRaw,
                aiResponseJson: expense.aiResponseJson ?? next.aiResponseJson,
                items: next.items.map((item, idx) => {
                  const prev = expense.items[idx];
                  return {
                    ...item,
                    rawText: item.rawText ?? prev?.rawText ?? item.name,
                  };
                }),
              });
              toast("Kaydedildi", "success");
              setEditing(false);
            } finally {
              setSaving(false);
            }
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-5 flex items-start justify-between gap-3 animate-fade-up">
        <div className="flex min-w-0 items-start gap-3">
          <BackButton className="mt-0.5" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl tracking-tight">
              {expense.merchantName || meta.label}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {formatDateTime(expense.date, expense.time)} · {meta.label}
              {expense.subcategory ? ` · ${expense.subcategory}` : ""}
            </p>
            <TagChips tagIds={expense.tagIds ?? []} className="mt-2" />
          </div>
        </div>
        <p className="shrink-0 text-lg font-semibold tabular-nums">
          {formatMoney(expense.totalAmount, expense.currency)}
        </p>
      </header>

      <div className="mb-4 flex gap-2 animate-fade-up delay-1">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 gap-2"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
          Düzenle
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="gap-2"
          onClick={() => {
            void (async () => {
              const ok = await confirm({
                title: "Harcama silinsin mi?",
                description: "Bu kayıt ve fiş verisi kalıcı olarak silinecek.",
                confirmLabel: "Sil",
                cancelLabel: "İptal",
                destructive: true,
              });
              if (!ok) return;
              await removeExpense(expense.id);
              toast("Harcama silindi", "danger");
              goBack();
            })();
          }}
        >
          <Trash2 className="h-4 w-4" />
          Sil
        </Button>
      </div>

      {expense.notes && (
        <p className="mb-4 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm animate-fade-up delay-1">
          {expense.notes}
        </p>
      )}

      <div className="animate-fade-up delay-2">
        <ReceiptViewer expense={expense} />
      </div>
    </AppShell>
  );
}

export default function ExpensePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        </AppShell>
      }
    >
      <ExpenseDetailInner />
    </Suspense>
  );
}
