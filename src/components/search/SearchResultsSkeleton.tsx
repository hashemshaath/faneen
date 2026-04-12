import { Skeleton } from '@/components/ui/skeleton';
import type { ViewMode } from './SearchResults';

export const SearchResultsSkeleton = ({ viewMode }: { viewMode: ViewMode }) => {
  if (viewMode === 'map' || viewMode === 'split') {
    return (
      <div className={viewMode === 'split' ? 'flex flex-col lg:flex-row gap-4' : ''}>
        {viewMode === 'split' && (
          <div className="lg:w-1/2 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/20">
                <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
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
          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
            <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
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
        <div key={i} className="rounded-2xl bg-card border border-border/20 overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
          <Skeleton className="h-24 sm:h-28 w-full rounded-none" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3 -mt-12 relative z-10">
              <Skeleton className="w-16 h-16 rounded-xl border-[3px] border-card" />
            </div>
            <Skeleton className="h-4 w-3/4 mt-2" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-3 pt-2 border-t border-border/10">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
