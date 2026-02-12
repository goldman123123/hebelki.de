import { Skeleton } from '@/components/ui/skeleton'

interface PageSkeletonProps {
  /** Number of content rows to show */
  rows?: number
  /** Show a header skeleton */
  showHeader?: boolean
  /** Show stat card skeletons */
  showStats?: number
}

export function PageSkeleton({ rows = 5, showHeader = true, showStats }: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      )}

      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: showStats }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-white p-4 space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <div className="p-4 border-b space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full max-w-[200px]" />
                <Skeleton className="h-3 w-full max-w-[300px]" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
