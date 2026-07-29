"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { Expense } from "@/lib/types";
import { formatMoney, cn } from "@/lib/utils";
import { OcrTextPanel } from "@/components/ocr-text-panel";

function Collapsible({
  title,
  defaultOpen = false,
  children,
  empty,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  empty?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (empty) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-white/80">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white active:scale-[0.99]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 px-4 py-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ReceiptViewer({ expense }: { expense: Expense }) {
  let aiPretty: string | null = null;
  if (expense.aiResponseJson) {
    try {
      aiPretty = JSON.stringify(JSON.parse(expense.aiResponseJson), null, 2);
    } catch {
      aiPretty = expense.aiResponseJson;
    }
  }

  return (
    <div className="space-y-3">
      <Collapsible title="Fiş görseli" defaultOpen={!!expense.imageDataUrl} empty={!expense.imageDataUrl}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={expense.imageDataUrl!}
          alt="Fiş"
          className="mx-auto max-h-[420px] w-full rounded-xl object-contain"
        />
      </Collapsible>

      {expense.rawText?.trim() ? (
        <OcrTextPanel
          text={expense.rawText}
          maxHeightClassName="max-h-64"
          className="border-border/70 bg-white/80"
        />
      ) : null}

      <Collapsible
        title="Ürünler"
        defaultOpen={expense.items.length > 0}
        empty={expense.items.length === 0}
      >
        <ul className="space-y-2">
          {expense.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {item.normalizedName || item.name}
                </p>
                {item.rawText &&
                  item.normalizedName &&
                  item.rawText !== item.normalizedName && (
                    <p className="text-[11px] text-muted-foreground">
                      OCR: {item.rawText}
                    </p>
                  )}
                {(item.quantity != null || item.unitPrice != null) && (
                  <p className="text-[11px] text-muted-foreground">
                    {item.quantity != null ? `${item.quantity}` : ""}
                    {item.unit ? ` ${item.unit}` : ""}
                    {item.unitPrice != null
                      ? ` · birim ${formatMoney(item.unitPrice, expense.currency)}`
                      : ""}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-semibold tabular-nums">
                {item.totalPrice != null
                  ? formatMoney(item.totalPrice, expense.currency)
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible
        title="Ek ücretler"
        defaultOpen={(expense.charges?.length ?? 0) > 0}
        empty={(expense.charges?.length ?? 0) === 0}
      >
        <ul className="space-y-2">
          {expense.charges.map((line, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>
                {line.label}
                {line.type ? (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    ({line.type})
                  </span>
                ) : null}
              </span>
              <span className="font-semibold tabular-nums">
                {formatMoney(line.amount, expense.currency)}
              </span>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible
        title="İndirimler"
        defaultOpen={(expense.discounts?.length ?? 0) > 0}
        empty={(expense.discounts?.length ?? 0) === 0}
      >
        <ul className="space-y-2">
          {expense.discounts.map((line, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>
                {line.label}
                {line.type ? (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    ({line.type})
                  </span>
                ) : null}
              </span>
              <span className="font-semibold tabular-nums text-teal-700">
                −{formatMoney(line.amount, expense.currency)}
              </span>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible
        title="Ödemeler"
        defaultOpen={(expense.payments?.length ?? 0) > 0}
        empty={(expense.payments?.length ?? 0) === 0}
      >
        <ul className="space-y-2">
          {expense.payments.map((line, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>
                {line.label}
                {line.type ? (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    ({line.type})
                  </span>
                ) : null}
              </span>
              <span className="font-semibold tabular-nums">
                {line.amount != null
                  ? formatMoney(line.amount, expense.currency)
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible
        title="Sınıflandırılamayan satırlar"
        defaultOpen={(expense.unknownLines?.length ?? 0) > 0}
        empty={(expense.unknownLines?.length ?? 0) === 0}
      >
        <ul className="space-y-2">
          {expense.unknownLines.map((line, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>{line.label}</span>
                <span className="font-semibold tabular-nums">
                  {line.amount != null
                    ? formatMoney(line.amount, expense.currency)
                    : "—"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{line.reason}</p>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible title="AI yanıtı" empty={!aiPretty}>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-stone-950/95 p-3 text-[11px] leading-relaxed text-emerald-100">
          {aiPretty}
        </pre>
      </Collapsible>
    </div>
  );
}
