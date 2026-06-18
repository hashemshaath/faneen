import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for SearchFiltersV3. Matches the real filter layout so
 * the sidebar reserves the right space and prevents layout shift while
 * categories/cities are still loading.
 */
export const SearchFiltersSkeletonV3 = () => (
  <div className="space-y-5" aria-busy="true" aria-live="polite">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    ))}
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-16" />
      <div className="flex gap-1.5">
        <Skeleton className="h-9 w-14 rounded-full" />
        <Skeleton className="h-9 w-14 rounded-full" />
        <Skeleton className="h-9 w-14 rounded-full" />
      </div>
    </div>
  </div>
);

export default SearchFiltersSkeletonV3;