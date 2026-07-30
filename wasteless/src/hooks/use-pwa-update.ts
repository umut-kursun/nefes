"use client";

import { useEffect, useState } from "react";
import { applyAppUpdate } from "@/lib/app-version";

/**
 * Detects a waiting service worker and exposes applyUpdate().
 * Works with next-pwa (skipWaiting: false + SKIP_WAITING message listener).
 */
export function usePwaUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let mounted = true;

    const watchRegistration = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        setUpdateReady(true);
      }

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (!mounted) return;
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    };

    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (!mounted || !reg) return;
      watchRegistration(reg);
    });

    const onControllerChange = () => {
      if (mounted) setUpdateReady(false);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  const applyUpdate = async () => {
    setApplying(true);
    try {
      await applyAppUpdate();
    } finally {
      setApplying(false);
    }
  };

  return { updateReady, applying, applyUpdate };
}
