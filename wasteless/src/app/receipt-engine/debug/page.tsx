import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReceiptEngineDebugPanel } from "@/components/receipt-engine-debug-panel";
import { isDevDebugRoutesEnabled } from "@/lib/receipt-engine-debug/devGuard";

export default function ReceiptEngineDebugPage() {
  if (!isDevDebugRoutesEnabled()) {
    notFound();
  }

  return (
    <AppShell>
      <ReceiptEngineDebugPanel />
    </AppShell>
  );
}
