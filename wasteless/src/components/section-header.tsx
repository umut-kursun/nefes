"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({
  title,
  actionLabel,
  href,
}: {
  title: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-wide text-foreground/80">
        {title}
      </h2>
      {actionLabel && href && (
        <Link
          href={href}
          className="inline-flex items-center text-xs font-medium text-primary transition active:scale-95"
        >
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
