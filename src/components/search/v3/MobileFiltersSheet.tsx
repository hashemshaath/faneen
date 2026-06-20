import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, Check, RotateCcw } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { SearchFiltersV3 } from './SearchFiltersV3';
import type { SearchFilterValues } from '@/services/search/useSearch';

interface Props {
  filters: SearchFilterValues;
  onFilterChange: <K extends keyof SearchFilterValues>(k: K, v: SearchFilterValues[K]) => void;
  onClearFilters: () => void;
  categories?: { id: string; slug: string; name_ar: string; name_en: string; parent_id: string | null }[];
  cities?: { id: string; name_ar: string; name_en: string }[];
  hasActiveFilters: boolean;
  activeCount: number;
}

export const MobileFiltersSheet = ({ activeCount, ...rest }: Props) => {
  const bi = useBi();
  const { onClearFilters, hasActiveFilters } = rest;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="lg:hidden h-11 min-w-11 px-3 rounded-xl border border-border/60 bg-card inline-flex items-center gap-2 text-sm font-body font-medium hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-label={bi('الفلاتر', 'Filters')}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{bi('فلاتر', 'Filters')}</span>
          {activeCount > 0 ? (
            <span className="ms-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold tech-content">
              {activeCount}
            </span>
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] flex flex-col safe-min-pb p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <SheetTitle>{bi('الفلاتر', 'Filters')}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SearchFiltersV3 {...rest} />
        </div>
        <div className="border-t border-border/60 bg-card px-5 py-3 flex items-center gap-2">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-11 px-3 rounded-xl border border-border/60 inline-flex items-center gap-1.5 text-sm font-body font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4" />
              {bi('مسح', 'Reset')}
            </button>
          ) : null}
          <SheetClose
            className="flex-1 h-11 rounded-xl bg-accent text-accent-foreground inline-flex items-center justify-center gap-2 text-sm font-body font-semibold hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Check className="w-4 h-4" />
            <span>
              {activeCount > 0
                ? bi(`تطبيق (${activeCount})`, `Apply (${activeCount})`)
                : bi('تطبيق', 'Apply')}
            </span>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFiltersSheet;