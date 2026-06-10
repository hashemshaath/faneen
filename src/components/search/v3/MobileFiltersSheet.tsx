import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal } from 'lucide-react';
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
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="lg:hidden h-11 px-3 rounded-xl border border-border/60 bg-card inline-flex items-center gap-2 text-sm font-body font-medium hover:border-accent/50"
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
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto safe-min-pb">
        <SheetHeader className="mb-4">
          <SheetTitle>{bi('الفلاتر', 'Filters')}</SheetTitle>
        </SheetHeader>
        <SearchFiltersV3 {...rest} />
      </SheetContent>
    </Sheet>
  );
};

export default MobileFiltersSheet;