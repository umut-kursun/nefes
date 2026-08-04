"use client";

import { AppShell } from "@/components/app-shell";
import { ReceiptEngineDebugPanel } from "@/components/receipt-engine-debug-panel";

export default function ReceiptEngineDebugPage() {
  return (
    <AppShell>
      <ReceiptEngineDebugPanel />
    </AppShell>
  );
}
