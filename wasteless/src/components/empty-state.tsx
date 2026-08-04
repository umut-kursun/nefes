"use client";

import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon = "bag",
  emoji,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  compact = false,
  className,
}: {
  icon?: string;
  emoji?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "wl-surface text-center animate-fade-up",
        compact ? "px-5 py-8" : "px-6 py-12",
        className
      )}
    >
      {emoji ? (
        <p className={cn("text-4xl", compact ? "text-3xl" : "")} aria-hidden>
          {emoji}
        </p>
      ) : (
        <span
          className={cn(
            "mx-auto flex items-center justify-center rounded-2xl bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200",
            compact ? "h-12 w-12" : "h-14 w-14"
          )}
        >
          <AppIcon name={icon} className={compact ? "h-6 w-6" : "h-7 w-7"} />
        </span>
      )}
      <p className={cn("font-semibold text-[color:var(--ink)]", compact ? "mt-3" : "mt-4")}>
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-5">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button type="button" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
