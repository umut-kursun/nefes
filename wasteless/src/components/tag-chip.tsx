"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function TagChip({
  label,
  color,
  href,
  className,
}: {
  label: string;
  color: string;
  href?: string;
  className?: string;
}) {
  const cls = cn(
    "inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition duration-200 active:scale-95 hover:-translate-y-0.5",
    className
  );
  const inner = (
    <>
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}
