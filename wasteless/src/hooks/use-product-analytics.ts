"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackScreenView } from "@/lib/product-analytics";

/** Map pathname to a stable screen name for local analytics. */
function screenNameFromPath(pathname: string): string {
  if (pathname === "/") return "home";
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ?? "unknown";
}

/**
 * Tracks page views to localStorage when pathname changes.
 * Pass `screen` to override auto-detected name.
 */
export function useProductAnalytics(screen?: string): void {
  const pathname = usePathname();

  useEffect(() => {
    const name = screen ?? screenNameFromPath(pathname);
    trackScreenView(name);
  }, [pathname, screen]);
}
