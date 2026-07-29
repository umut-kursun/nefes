"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReceiptDebugExport } from "@/lib/receipt-engine-debug/exportSchema";

type Props = {
  debugExport: ReceiptDebugExport;
  imageDataUrl: string;
};

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReceiptEngineDebugExportButtons({
  debugExport,
  imageDataUrl,
}: Props) {
  const [downloadingPackage, setDownloadingPackage] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);

  const exportDebugJson = () => {
    const json = JSON.stringify(debugExport, null, 2);
    downloadBlob(
      "receipt-debug.json",
      new Blob([json], { type: "application/json" })
    );
  };

  const downloadDebugPackage = async () => {
    setDownloadingPackage(true);
    setPackageError(null);
    try {
      const res = await fetch("/api/receipt-engine/debug-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debugExport, imageDataUrl }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Debug package download failed.");
      }
      const blob = await res.blob();
      downloadBlob("receipt-debug-package.zip", blob);
    } catch (error) {
      setPackageError(
        error instanceof Error ? error.message : "Debug package download failed."
      );
    } finally {
      setDownloadingPackage(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 p-4">
      <h3 className="text-sm font-semibold text-amber-950">Debug Export (dev)</h3>
      <p className="mt-1 text-xs text-amber-900/80">
        Parser debugging only — not available in production builds.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={exportDebugJson}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export Debug JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={downloadingPackage}
          onClick={() => void downloadDebugPackage()}
        >
          {downloadingPackage ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Download Debug Package
        </Button>
      </div>
      {packageError && (
        <p className="mt-2 text-xs text-rose-700">{packageError}</p>
      )}
    </div>
  );
}
