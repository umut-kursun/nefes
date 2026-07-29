"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supportedImportExtensions } from "@/lib/product-knowledge/import/fileParser";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
  onFile: (file: File) => void;
};

export function KbFileDropzone({ disabled, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = useCallback(
    (file: File | null | undefined) => {
      if (!file || disabled) return;
      onFile(file);
    },
    [disabled, onFile]
  );

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
        dragOver ? "border-teal-400 bg-teal-50/50" : "border-muted-foreground/25",
        disabled && "pointer-events-none opacity-50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pick(e.dataTransfer.files?.[0]);
      }}
    >
      <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">CSV, XLSX veya JSON sürükleyin</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sütun adları otomatik algılanır — Migros, File, A101…
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={supportedImportExtensions()}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Dosya seç
      </Button>
    </div>
  );
}
