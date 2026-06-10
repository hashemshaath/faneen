import { Skeleton } from '@/components/ui/skeleton';

interface Props { count?: number; view?: 'grid' | 'list' }

export const SearchSkeletonV3 = ({ count = 8, view = 'grid' }: Props) => {
  return (
    <div
      className={
        view === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
          : 'flex flex-col gap-3'
      }
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-3 w-full mt-3" />
          <Skeleton className="h-3 w-4/5 mt-1.5" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchSkeletonV3;