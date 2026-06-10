/**
 * @deprecated Legacy /search component. Kept only because
 * `src/components/search/SearchResults.tsx` (also deprecated) imports it and
 * a handful of guard tests still readFileSync that file. The production
 * `/search` route renders `SearchSkeletonV3` (see `src/components/search/v3/`).
 * Do NOT import this from new code.
 */
import { Skeleton } from '@/components/ui/skeleton';

interface Props { count?: number }

export const SearchResultsSkeleton = ({ count = 8 }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border/60 bg-card p-4">
        <Skeleton className="h-14 w-14 rounded-xl" />
        <Skeleton className="h-4 w-2/3 mt-3" />
        <Skeleton className="h-3 w-1/3 mt-2" />
      </div>
    ))}
  </div>
);

export default SearchResultsSkeleton;
