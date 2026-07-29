"use client";

import { useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const blockContextMenu = (event: Event) => {
      event.preventDefault();
    };
    document.addEventListener("contextmenu", blockContextMenu);
    return () => document.removeEventListener("contextmenu", blockContextMenu);
  }, []);

  /**
   * Android hardware Back while soft keyboard is open:
   * 1st press → blur field (close keyboard)
   * 2nd press → navigate away
   *
   * Uses a disposable history entry only while an editable is focused.
   * On blur, the guard entry is cleaned up so Back never "no-ops".
   */
  useEffect(() => {
    const isEditable = (el: Element | null): el is HTMLElement =>
      !!el &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        (el as HTMLElement).isContentEditable);

    let guardPushed = false;
    let ignoringPop = false;

    const pushGuard = () => {
      if (guardPushed) return;
      guardPushed = true;
      window.history.pushState({ wlKeyboardGuard: true }, "");
    };

    const clearGuardQuietly = () => {
      if (!guardPushed) return;
      guardPushed = false;
      if (window.history.state?.wlKeyboardGuard) {
        ignoringPop = true;
        window.history.back();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (isEditable(event.target as Element)) pushGuard();
    };

    const onFocusOut = () => {
      // Defer: focus may move to another editable.
      requestAnimationFrame(() => {
        if (!isEditable(document.activeElement)) {
          clearGuardQuietly();
        }
      });
    };

    const onPopState = () => {
      if (ignoringPop) {
        ignoringPop = false;
        return;
      }
      if (!guardPushed) return;
      guardPushed = false;
      const active = document.activeElement;
      if (isEditable(active)) {
        active.blur();
      }
    };

    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden select-none"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(15,118,110,0.14),transparent_55%),radial-gradient(90%_70%_at_100%_10%,rgba(29,78,216,0.10),transparent_50%),linear-gradient(180deg,#F4F7F5_0%,#EEF2F0_45%,#F7F8F6_100%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#0f172a_0.8px,transparent_0.8px)] [background-size:14px_14px]" />
      </div>
      <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
