import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { SearchResultCardV3, type SearchResultCardV3Business } from './SearchResultCardV3';
import { SearchSkeletonV3 } from './SearchSkeletonV3';
import { SearchEmptyStateV3 } from './SearchEmptyStateV3';
import { SearchErrorStateV3 } from './SearchErrorStateV3';
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
  taxonomyDisplayMap?: Map<string, BusinessTaxonomyDisplay>;
}

export const SearchResultsV3 = ({
  businesses, isLoading, isError, onRetry, viewMode, totalCount, hasFilters,
  onClearFilters, didYouMean, onDidYouMeanClick, currentPage, totalPages, onPageChange,
  taxonomyDisplayMap,
}: Props) => {
  const bi = useBi();
  const { isRTL } = useLanguage();

  if (isError) return <SearchErrorStateV3 onRetry={onRetry} />;
  if (isLoading) return <SearchSkeletonV3 view={viewMode} count={8} />;
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

  const containerCls = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
    : 'flex flex-col gap-3';

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col gap-6">
      <div className={containerCls}>
        {businesses.map((b) => (
          <SearchResultCardV3
            key={b.id}
            business={b}
            taxonomy={taxonomyDisplayMap?.get(b.id)}
            view={viewMode}
          />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2 pt-2" aria-label={bi('التنقل بين الصفحات', 'Pagination')}>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-border/60 bg-card disabled:opacity-40 hover:border-accent/40"
            aria-label={bi('السابق', 'Previous')}
          >
            <PrevIcon className="w-4 h-4" />
          </button>
          <span className="text-sm font-body text-foreground px-3">
            <span className="tech-content">{currentPage}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="tech-content text-muted-foreground">{totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-border/60 bg-card disabled:opacity-40 hover:border-accent/40"
            aria-label={bi('التالي', 'Next')}
          >
            <NextIcon className="w-4 h-4" />
          </button>
        </nav>
      ) : null}
    </div>
  );
};

export default SearchResultsV3;