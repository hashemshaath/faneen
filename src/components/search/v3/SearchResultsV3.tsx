import { useEffect, useRef } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { SearchResultCardV3, type SearchResultCardV3Business } from './SearchResultCardV3';
import { SearchSkeletonV3 } from './SearchSkeletonV3';
import { SearchEmptyStateV3 } from './SearchEmptyStateV3';
import { SearchErrorStateV3 } from './SearchErrorStateV3';
import { Button } from '@/components/ui/button';
import type { BusinessTaxonomyDisplay } from '@/modules/taxonomy/search-integration';
import type { ViewModeV3 } from './SearchHeaderV3';

interface Props {
  businesses: SearchResultCardV3Business[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  viewMode: ViewModeV3;
  totalCount: number;
  hasFilters: boolean;
  onClearFilters: () => void;
  didYouMean?: string | null;
  onDidYouMeanClick?: (term: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  taxonomyDisplayMap?: Map<string, BusinessTaxonomyDisplay>;
}

export const SearchResultsV3 = ({
  businesses, isLoading, isError, onRetry, viewMode, totalCount, hasFilters,
  onClearFilters, didYouMean, onDidYouMeanClick, currentPage, totalPages,
  hasMore, onLoadMore,
  taxonomyDisplayMap,
}: Props) => {
  const bi = useBi();

  // SearchResultsV3 only renders card layouts; the 'map' view is handled
  // upstream by SearchMapV3, so normalize any non-card value to 'grid'
  // for the child components that expect 'grid' | 'list' only.
  const cardView: 'grid' | 'list' = viewMode === 'list' ? 'list' : 'grid';

  // Hooks MUST run before any early returns below to keep call order stable.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore || !onLoadMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) onLoadMore(); },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onLoadMore, businesses.length]);

  if (isError) return <SearchErrorStateV3 onRetry={onRetry} />;
  if (isLoading) return <SearchSkeletonV3 view={cardView} count={8} />;
  if (totalCount === 0) {
    return (
      <SearchEmptyStateV3
        hasFilters={hasFilters}
        didYouMean={didYouMean}
        onDidYouMeanClick={onDidYouMeanClick}
        onClearFilters={onClearFilters}
      />
    );
  }

  const containerCls = cardView === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
    : 'flex flex-col gap-3';

  return (
    <div className="flex flex-col gap-6">
      <div className={containerCls}>
        {businesses.map((b, i) => (
          <div
            key={b.id}
            className="animate-fade-in"
            // First 6 stay fully visible for fast LCP; cards below get
            // `content-visibility: auto` so the browser skips off-screen
            // layout/paint until they enter the viewport.
            style={i >= 6 ? { contentVisibility: 'auto', containIntrinsicSize: '320px' } : undefined}
          >
            <SearchResultCardV3
              business={b}
              taxonomy={taxonomyDisplayMap?.get(b.id)}
              view={cardView}
            />
          </div>
        ))}
      </div>

      {hasMore ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            className="gap-2"
          >
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
            {bi('عرض المزيد', 'Load more')}
          </Button>
          <div
            ref={sentinelRef}
            aria-hidden="true"
            className="h-1 w-full"
          />
          <span className="sr-only" aria-live="polite">
            {bi(
              `عرض ${businesses.length.toLocaleString('ar-EG')} من ${totalCount.toLocaleString('ar-EG')}`,
              `Showing ${businesses.length.toLocaleString('en-US')} of ${totalCount.toLocaleString('en-US')}`,
            )}
          </span>
        </div>
      ) : totalCount > 0 && totalPages > 1 ? (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
          <Loader2 className="w-3 h-3" aria-hidden="true" />
          {bi('عرضت كل النتائج', 'All results shown')}
        </div>
      ) : null}
    </div>
  );
};

export default SearchResultsV3;