import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-muted/80 motion-reduce:animate-none",
        className
      )}
    />
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return <Skeleton className={cn("h-[3.5rem]", className)} />;
}

export function DashboardSkeleton() {
  return (
    <div className="wl-page-stack">
      <Skeleton className="h-11 rounded-2xl" />
      <Skeleton className="h-44" />
      <div className="flex gap-2">
        <Skeleton className="h-24 w-28 shrink-0" />
        <Skeleton className="h-24 w-28 shrink-0" />
        <Skeleton className="h-24 w-28 shrink-0" />
      </div>
      <div className="space-y-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
