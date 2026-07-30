"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  endBetaSession,
  startBetaSession,
  trackScreenAbandon,
} from "@/lib/beta-telemetry";

/**
 * Beta session lifecycle — start on mount, end on unload.
 * Tracks screen abandon when navigating away from /add mid-flow.
 */
export function useBetaTelemetry(): void {
  const pathname = usePathname();

  useEffect(() => {
    startBetaSession();

    const onBeforeUnload = () => {
      endBetaSession();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      endBetaSession();
    };
  }, []);

  useEffect(() => {
    const prev = sessionStorage.getItem("wl_prev_path");
    if (prev === "/add" && pathname !== "/add") {
      trackScreenAbandon("add", "navigated_away");
    }
    sessionStorage.setItem("wl_prev_path", pathname);
  }, [pathname]);
}
