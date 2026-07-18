export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-neutral-200/80 ${className}`}
    />
  )
}

export function MarketCardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3.5">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      </div>
      <div className="mt-4 border-t border-neutral-100 pt-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )
}
