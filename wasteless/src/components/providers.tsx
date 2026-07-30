"use client";

import { WasteLessProvider } from "@/hooks/use-store";
import { ToastProvider } from "@/components/toast";
import { ConfirmProvider } from "@/components/confirm-modal";
import { PwaBootstrap } from "@/components/pwa-bootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WasteLessProvider>
      <PwaBootstrap />
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </WasteLessProvider>
  );
}
