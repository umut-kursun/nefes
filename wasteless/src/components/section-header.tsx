"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  actionLabel,
  href,
  className,
}: {
  title: string;
  actionLabel?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("wl-section-gap flex min-h-11 items-center justify-between", className)}>
      <h2 className="wl-section-title">{title}</h2>
      {actionLabel && href && (
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:text-primary/90 active:scale-[0.98]"
        >
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
