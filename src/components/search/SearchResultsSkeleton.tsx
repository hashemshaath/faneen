import { Skeleton } from '@/components/ui/skeleton';
import type { ViewMode } from './SearchResults';

export const SearchResultsSkeleton = ({ viewMode }: { viewMode: ViewMode }) => {
  if (viewMode === 'map' || viewMode === 'split') {
    return (
      <div className={viewMode === 'split' ? 'flex flex-col lg:flex-row gap-4' : ''}>
        {viewMode === 'split' && (
          <div className="lg:w-1/2 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-card border border-border/30 dark:border-border/15 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
                <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
        <div className={viewMode === 'split' ? 'lg:w-1/2' : ''}>
          <Skeleton className="rounded-2xl h-[400px] sm:h-[500px]" />
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-card border border-border/30 dark:border-border/15 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
            <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  // Grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="rounded-2xl bg-card border border-border/30 dark:border-border/15 overflow-hidden flex flex-col animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
          <Skeleton className="h-24 sm:h-28 w-full rounded-none" />
          <div className="px-4 sm:px-5 -mt-9 sm:-mt-10 relative z-10">
            <Skeleton className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl border-[3px] border-card" />
          </div>
          <div className="px-4 sm:px-5 pt-2.5 sm:pt-3 pb-4 sm:pb-5 flex flex-col flex-1 space-y-2.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-16 rounded-lg" />
              <Skeleton className="h-5 w-14 rounded-lg" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-3 pt-3 mt-auto border-t border-border/20 dark:border-border/10">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
