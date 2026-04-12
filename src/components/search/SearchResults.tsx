import { useLanguage } from '@/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BusinessCard } from './BusinessCard';
import { SearchMap } from './SearchMap';
import { SearchPagination } from './SearchPagination';
import {
  Search as SearchIcon, LayoutGrid, List, Map, Columns,
} from 'lucide-react';

export type ViewMode = 'grid' | 'list' | 'map' | 'split';

interface SearchResultsProps {
  businesses: any[];
  isLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount: number;
  onClearFilters: () => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  didYouMean?: string | null;
  onDidYouMeanClick?: (term: string) => void;
}

export const SearchResults = ({
  businesses, isLoading, viewMode, onViewModeChange, totalCount, onClearFilters,
  currentPage, totalPages, itemsPerPage, onPageChange, didYouMean, onDidYouMeanClick,
}: SearchResultsProps) => {
  const { t, isRTL } = useLanguage();

  const viewButtons: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: 'grid', icon: LayoutGrid, label: 'Grid' },
    { mode: 'list', icon: List, label: 'List' },
    { mode: 'split', icon: Columns, label: 'Split' },
    { mode: 'map', icon: Map, label: 'Map' },
  ];

  const isSplit = viewMode === 'split';

  return (
    <div className="flex-1 min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/15 dark:border-border/10">
        <div>
          <p className="font-heading font-bold text-lg sm:text-xl text-foreground">
            {totalCount} <span className="text-sm font-normal text-muted-foreground">{t('search.results')}</span>
          </p>
          {totalCount > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5 font-body">
              {isRTL
                ? `عرض ${Math.min(businesses.length, itemsPerPage)} من ${totalCount}`
                : `Showing ${Math.min(businesses.length, itemsPerPage)} of ${totalCount}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 dark:bg-muted/15 border border-border/15 dark:border-border/10">
          {viewButtons.map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${viewMode === mode ? 'bg-card dark:bg-card/80 shadow-sm text-accent ring-1 ring-accent/20' : 'text-muted-foreground hover:text-foreground'}`}
              title={mode}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={viewMode === 'map' ? '' : viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5' : 'space-y-3'}>
          {viewMode === 'map' || isSplit ? (
            <Skeleton className="rounded-2xl h-[400px] sm:h-[500px]" />
          ) : (
            [1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className={`rounded-2xl ${viewMode === 'list' ? 'h-20' : 'h-72'}`} />
            ))
          )}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-16 sm:py-24">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-muted/30 dark:bg-muted/15 flex items-center justify-center">
            <SearchIcon className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/20" />
          </div>
          <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2">{t('search.no_results')}</h3>
          <p className="text-sm text-muted-foreground font-body mb-4 sm:mb-6">{t('search.no_results_desc')}</p>
          {didYouMean && (
            <p className="text-sm text-muted-foreground font-body mb-4">
              {isRTL ? 'هل تقصد: ' : 'Did you mean: '}
              <button
                onClick={() => onDidYouMeanClick?.(didYouMean)}
                className="text-accent font-semibold hover:underline"
              >
                {didYouMean}
              </button>
              ؟
            </p>
          )}
          <Button variant="outline" onClick={onClearFilters} className="rounded-xl dark:border-border/20">
            {t('search.clear_filters')}
          </Button>
        </div>
      ) : isSplit ? (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-1/2 space-y-3 max-h-[600px] overflow-y-auto pe-1 no-scrollbar">
            {businesses.map(b => (
              <BusinessCard key={b.id} business={b} viewMode="list" />
            ))}
          </div>
          <div className="lg:w-1/2">
            <SearchMap businesses={businesses} className="h-[350px] sm:h-[600px] sticky top-4" />
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <SearchMap businesses={businesses} className="h-[400px] sm:h-[600px]" />
      ) : (
        <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5' : 'space-y-3'}>
            {businesses.map((b, i) => (
              <div key={b.id} className="animate-card-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                <BusinessCard business={b} viewMode={viewMode} />
              </div>
            ))}
          </div>
          <SearchPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
};
