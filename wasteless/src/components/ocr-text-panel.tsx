"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  /** When true, wrap in a collapsible details element (Add review). */
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  maxHeightClassName?: string;
};

async function copyAllText(text: string): Promise<boolean> {
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

export function OcrTextPanel({
  text,
  collapsible = false,
  defaultOpen = false,
  className,
  maxHeightClassName = "max-h-56",
}: Props) {
  const [copied, setCopied] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) return null;

  const onCopy = async () => {
    const ok = await copyAllText(trimmed);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const copyButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 shrink-0 gap-1.5 px-3"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onCopy();
      }}
      aria-label="OCR metninin tamamını kopyala"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-teal-700" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Kopyalandı" : "Kopyala"}
    </Button>
  );

  const body = (
    <pre
      className={cn(
        "mt-3 overflow-auto whitespace-pre-wrap break-words select-text text-xs leading-relaxed text-foreground/85",
        maxHeightClassName
      )}
    >
      {trimmed}
    </pre>
  );

  if (collapsible) {
    return (
      <details
        className={cn(
          "rounded-2xl border border-white/70 bg-white/75 p-4 open:pb-3",
          className
        )}
        open={defaultOpen || undefined}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-teal-900 [&::-webkit-details-marker]:hidden">
          <span>OCR metni</span>
          {copyButton}
        </summary>
        {body}
      </details>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/70 bg-white/75 p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">OCR metni</h3>
        {copyButton}
      </div>
      {body}
    </div>
  );
}
