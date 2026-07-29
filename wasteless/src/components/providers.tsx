"use client";

import { WasteLessProvider } from "@/hooks/use-store";
import { ToastProvider } from "@/components/toast";
import { ConfirmProvider } from "@/components/confirm-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WasteLessProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </WasteLessProvider>
  );
}
