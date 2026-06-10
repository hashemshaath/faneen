import { SearchX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBi } from '@/components/common/Bilingual';

interface Props {
  hasFilters: boolean;
  query?: string;
  didYouMean?: string | null;
  onDidYouMeanClick?: (term: string) => void;
  onClearFilters?: () => void;
}

export const SearchEmptyStateV3 = ({
  hasFilters,
  query,
  didYouMean,
  onDidYouMeanClick,
  onClearFilters,
}: Props) => {
  const bi = useBi();
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
        <SearchX className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-heading font-bold text-foreground mb-1.5">
        {bi('لا توجد نتائج', 'No results')}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-5">
        {query
          ? bi(
              `لم نجد مزودين يطابقون "${query}". جرّب كلمات أخرى أو خفّف الفلاتر.`,
              `No providers matched "${query}". Try different keywords or relax the filters.`,
            )
          : bi(
              'لا توجد نتائج بهذه الفلاتر. جرّب توسيع نطاق البحث.',
              'No results for these filters. Try broadening your search.',
            )}
      </p>
      {didYouMean && onDidYouMeanClick ? (
        <button
          onClick={() => onDidYouMeanClick(didYouMean)}
          className="text-sm text-accent hover:underline mb-3"
        >
          {bi('هل تقصد:', 'Did you mean:')}{' '}
          <span className="font-semibold" dir="auto">{didYouMean}</span>
        </button>
      ) : null}
      {hasFilters && onClearFilters ? (
        <Button onClick={onClearFilters} variant="outline" size="app" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          {bi('مسح الفلاتر', 'Clear filters')}
        </Button>
      ) : null}
    </div>
  );
};

export default SearchEmptyStateV3;