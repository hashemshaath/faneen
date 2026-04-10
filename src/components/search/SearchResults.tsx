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
}

export const SearchResults = ({
  businesses, isLoading, viewMode, onViewModeChange, totalCount, onClearFilters,
  currentPage, totalPages, itemsPerPage, onPageChange,
}: SearchResultsProps) => {
  const { t } = useLanguage();

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
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <p className="text-sm text-muted-foreground font-body">
          <span className="font-bold text-foreground text-base sm:text-lg">{totalCount}</span>{' '}
          {t('search.results')}
        </p>
        <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl bg-muted dark:bg-muted/50">
          {viewButtons.map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-card dark:bg-card/80 shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              title={mode}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={viewMode === 'map' ? '' : viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4' : 'space-y-3 sm:space-y-4'}>
          {viewMode === 'map' || isSplit ? (
            <Skeleton className="rounded-2xl h-[400px] sm:h-[500px]" />
          ) : (
            [1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className={`rounded-2xl ${viewMode === 'list' ? 'h-20 sm:h-24' : 'h-48 sm:h-56'}`} />
            ))
          )}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-16 sm:py-24">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-muted dark:bg-muted/50 flex items-center justify-center">
            <SearchIcon className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/40" />
          </div>
          <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2">{t('search.no_results')}</h3>
          <p className="text-sm text-muted-foreground font-body mb-4 sm:mb-6">{t('search.no_results_desc')}</p>
          <Button variant="outline" onClick={onClearFilters} className="rounded-xl dark:border-border/40">
            {t('search.clear_filters')}
          </Button>
        </div>
      ) : isSplit ? (
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          <div className="lg:w-1/2 space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto pe-1 no-scrollbar">
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
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4' : 'space-y-3'}>
            {businesses.map((b, i) => (
              <div key={b.id} className="animate-card-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
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
