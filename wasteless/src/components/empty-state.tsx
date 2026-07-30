"use client";

import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon = "bag",
  emoji,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: string;
  emoji?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  const actionClass =
    "mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-95";

  return (
    <div
      className={cn(
        "rounded-3xl border border-black/[0.05] bg-white px-6 py-14 text-center shadow-sm animate-fade-up",
        className
      )}
    >
      {emoji ? (
        <p className="text-4xl" aria-hidden>
          {emoji}
        </p>
      ) : (
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
          <AppIcon name={icon} className="h-7 w-7" />
        </span>
      )}
      <p className="mt-4 font-semibold text-[color:var(--ink)]">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={actionClass}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" onClick={onAction} className={actionClass}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
