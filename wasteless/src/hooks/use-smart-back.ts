"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Native-style Back: prefer history.back when there is a prior entry,
 * otherwise navigate to the given fallback (default Home).
 */
export function useSmartBack(fallback = "/") {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  }, [router, fallback]);
}
