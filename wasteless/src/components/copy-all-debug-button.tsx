"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import { formatCopyAllDebug } from "@/lib/receipt-engine-debug/formatCopyAllDebug";

type Props = {
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  ocrText: string;
  rawVisionResponse?: string;
  analyzeResult?: unknown;
  parserJson?: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CopyAllDebugButton({
  purchase,
  validation,
  ocrText,
  rawVisionResponse = "",
  analyzeResult,
  parserJson,
}: Props) {
  const [copied, setCopied] = useState(false);

  const blob = formatCopyAllDebug({
    rawVision: rawVisionResponse,
    ocr: ocrText,
    purchase,
    validation,
    analyzeResult,
    parserJson,
  });

  const onCopy = async () => {
    const ok = await copyText(blob);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => void onCopy()}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-teal-700" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy All Debug"}
    </Button>
  );
}

/** @deprecated Use CopyAllDebugButton */
export const ReceiptDebugCopyButtons = CopyAllDebugButton;
