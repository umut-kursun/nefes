"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type SurfaceVariant = "default" | "muted" | "hero";

const variantClass: Record<SurfaceVariant, string> = {
  default: "wl-surface",
  muted: "wl-surface-muted",
  hero: "wl-surface-hero",
};

/** Canonical elevated surface — use instead of one-off card Tailwind. */
export function SurfaceCard({
  className,
  variant = "default",
  as: Tag = "div",
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  variant?: SurfaceVariant;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={cn(variantClass[variant], className)}
      {...props}
    />
  );
}
