import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-stone-200/70 dark:bg-stone-700/50",
        className
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-11 rounded-2xl" />
      <Skeleton className="h-44" />
      <div className="flex gap-2">
        <Skeleton className="h-24 w-28 shrink-0" />
        <Skeleton className="h-24 w-28 shrink-0" />
        <Skeleton className="h-24 w-28 shrink-0" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}
