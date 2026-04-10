import { useLanguage } from '@/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BusinessCard } from './BusinessCard';
import {
  Search as SearchIcon, LayoutGrid, List,
} from 'lucide-react';

interface SearchResultsProps {
  businesses: any[];
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalCount: number;
  onClearFilters: () => void;
}

export const SearchResults = ({
  businesses, isLoading, viewMode, onViewModeChange, totalCount, onClearFilters,
}: SearchResultsProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground font-body">
          <span className="font-bold text-foreground text-lg">{totalCount}</span>{' '}
          {t('search.results')}
        </p>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className={`rounded-2xl ${viewMode === 'list' ? 'h-24' : 'h-56'}`} />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <SearchIcon className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h3 className="font-heading font-bold text-xl text-foreground mb-2">{t('search.no_results')}</h3>
          <p className="text-muted-foreground font-body mb-6">{t('search.no_results_desc')}</p>
          <Button variant="outline" onClick={onClearFilters} className="rounded-xl">
            {t('search.clear_filters')}
          </Button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
          {businesses.map(b => (
            <BusinessCard key={b.id} business={b} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
};
