import { SearchX, RotateCcw, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
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

      {/*
        Phase 12B — Conversion CTA: when the search returns nothing, give
        the user a clear path to /quote so they don't leave the funnel.
        /quote and RFQ submit logic are untouched — this is a link only.
      */}
      <div className="mt-8 max-w-md w-full rounded-2xl border border-border/60 bg-card p-5 text-start">
        <p className="text-sm text-foreground mb-3">
          {bi(
            'ما لقيت المزوّد المناسب؟ أرسل طلبك ونساعدك توصل لمزودين مناسبين.',
            "Didn't find the right provider? Send your request and we'll help you reach matching ones.",
          )}
        </p>
        <Link to="/quote" className="inline-block">
          <Button variant="primary" size="app" className="gap-2">
            <Send className="w-4 h-4" />
            {bi('اطلب عرض سعر', 'Request a quote')}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default SearchEmptyStateV3;