"use client";

import { Plus, Trash2 } from "lucide-react";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils";

type EditableLine = {
  label: string;
  amount: number;
  type?: string;
};

type ChargeEditorProps = {
  label: string;
  addLabel: string;
  placeholder: string;
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
};

export function ReceiptChargesEditor({
  label,
  addLabel,
  placeholder,
  lines,
  onChange,
}: ChargeEditorProps) {
  const update = (index: number, patch: Partial<EditableLine>) => {
    onChange(
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  };

  const remove = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...lines, { label: "", amount: 0 }]);
  };

  const sum = lines.reduce((a, l) => a + Math.abs(l.amount || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">Yok</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line, index) => (
            <li
              key={index}
              className="flex items-end gap-2 rounded-xl border border-black/[0.05] bg-white p-2"
            >
              <div className="min-w-0 flex-1 grid gap-1">
                <Input
                  value={line.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  placeholder={placeholder}
                  className="h-10 text-sm"
                />
              </div>
              <AmountInput
                value={line.amount}
                onChange={(n) => update(index, { amount: n })}
                className="w-24"
              />
              <button
                type="button"
                aria-label="Sil"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {lines.length > 0 && (
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          Toplam {formatMoney(sum)}
        </p>
      )}
    </div>
  );
}
