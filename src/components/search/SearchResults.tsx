import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { BusinessCard } from './BusinessCard';
import { SearchMap } from './SearchMap';
import { SearchPagination } from './SearchPagination';
import { SearchResultsSkeleton } from './SearchResultsSkeleton';
import {
  Search as SearchIcon, LayoutGrid, List, Map, Columns,
  Bookmark, Share2, ArrowUpDown,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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

  const viewButtons: { mode: ViewMode; icon: typeof LayoutGrid; label: string; labelAr: string }[] = [
    { mode: 'grid', icon: LayoutGrid, label: 'Grid', labelAr: 'شبكة' },
    { mode: 'list', icon: List, label: 'List', labelAr: 'قائمة' },
    { mode: 'split', icon: Columns, label: 'Split', labelAr: 'مقسم' },
    { mode: 'map', icon: Map, label: 'Map', labelAr: 'خريطة' },
  ];

  const isSplit = viewMode === 'split';

  const handleShareSearch = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(isRTL ? 'تم نسخ رابط البحث' : 'Search link copied');
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/15 dark:border-border/10">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-heading font-bold text-lg sm:text-xl text-foreground">
              {totalCount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t('search.results')}</span>
            </p>
            {totalCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5 font-body">
                {isRTL
                  ? `عرض ${Math.min(businesses.length, itemsPerPage)} من ${totalCount}`
                  : `Showing ${Math.min(businesses.length, itemsPerPage)} of ${totalCount}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Share button */}
          {totalCount > 0 && (
            <button
              onClick={handleShareSearch}
              className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
              title={isRTL ? 'مشاركة البحث' : 'Share search'}
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* View toggles */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 dark:bg-muted/15 border border-border/15 dark:border-border/10">
            {viewButtons.map(({ mode, icon: Icon, label, labelAr }) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${viewMode === mode ? 'bg-card dark:bg-card/80 shadow-sm text-accent ring-1 ring-accent/20' : 'text-muted-foreground hover:text-foreground'}`}
                title={isRTL ? labelAr : label}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SearchResultsSkeleton viewMode={viewMode} />
      ) : businesses.length === 0 ? (
        <div className="text-center py-16 sm:py-24">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-accent/10 to-muted/30 dark:from-accent/5 dark:to-muted/15 flex items-center justify-center">
            <SearchIcon className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/20" />
          </div>
          <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2">{t('search.no_results')}</h3>
          <p className="text-sm text-muted-foreground font-body mb-4 sm:mb-6 max-w-md mx-auto">{t('search.no_results_desc')}</p>
          
          {didYouMean && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/5 border border-accent/15 mb-5">
              <span className="text-sm text-muted-foreground font-body">
                {isRTL ? 'هل تقصد:' : 'Did you mean:'}
              </span>
              <button
                onClick={() => onDidYouMeanClick?.(didYouMean)}
                className="text-accent font-heading font-bold text-sm hover:underline underline-offset-4"
              >
                {didYouMean}
              </button>
              {isRTL && <span className="text-muted-foreground">؟</span>}
            </div>
          )}

          {/* Suggestions */}
          <div className="max-w-sm mx-auto mb-6">
            <p className="text-xs text-muted-foreground font-body mb-3">
              {isRTL ? 'نصائح للبحث:' : 'Search tips:'}
            </p>
            <ul className="text-xs text-muted-foreground font-body space-y-1.5 text-start">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                {isRTL ? 'حاول استخدام كلمات مفتاحية مختلفة' : 'Try different keywords'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                {isRTL ? 'قلل عدد الفلاتر المطبقة' : 'Reduce the number of active filters'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                {isRTL ? 'تحقق من الإملاء' : 'Check your spelling'}
              </li>
            </ul>
          </div>
          
          <Button variant="outline" onClick={onClearFilters} className="rounded-xl dark:border-border/20">
            {t('search.clear_filters')}
          </Button>
        </div>
      ) : isSplit ? (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-1/2 space-y-3 max-h-[600px] overflow-y-auto pe-1 no-scrollbar">
            {businesses.map((b, i) => (
              <div key={b.id} className="animate-card-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <BusinessCard business={b} viewMode="list" />
              </div>
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
