import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OcrDebugPanel } from "@/components/ocr-debug-panel";
import { isDevDebugRoutesEnabled } from "@/lib/receipt-engine-debug/devGuard";

export default function OcrDebugPage() {
  if (!isDevDebugRoutesEnabled()) {
    notFound();
  }

  return (
    <AppShell>
      <OcrDebugPanel />
    </AppShell>
  );
}
