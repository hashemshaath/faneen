import { Navbar } from '@/components/layout/Navbar';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LayoutGrid, List, Share2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useBi } from '@/components/common/Bilingual';
import type { SearchFilterValues } from '@/services/search/useSearch';
import { MobileFiltersSheet } from './MobileFiltersSheet';

export type ViewModeV3 = 'grid' | 'list';

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch?: (q: string) => void;
  businesses?: { id: string; name_ar: string; name_en: string }[];
  categories?: { id: string; slug: string; name_ar: string; name_en: string; parent_id: string | null }[];
  cities?: { id: string; name_ar: string; name_en: string }[];
  sortBy: SearchFilterValues['sortBy'];
  onSortChange: (s: SearchFilterValues['sortBy']) => void;
  viewMode: ViewModeV3;
  onViewModeChange: (m: ViewModeV3) => void;
  totalResults: number;
  // Mobile filter sheet inputs
  filters: SearchFilterValues;
  onFilterChange: <K extends keyof SearchFilterValues>(k: K, v: SearchFilterValues[K]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  // Children: optional active-filter chips bar
  children?: React.ReactNode;
}

export const SearchHeaderV3 = ({
  query, onQueryChange, onSearch, businesses, categories, cities,
  sortBy, onSortChange, viewMode, onViewModeChange, totalResults,
  filters, onFilterChange, onClearFilters, hasActiveFilters, activeFilterCount,
  children,
}: Props) => {
  const bi = useBi();

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      toast.success(bi('تم نسخ رابط البحث', 'Search link copied'));
    } catch { /* ignore */ }
  };

  const viewBtns: { mode: ViewModeV3; icon: typeof LayoutGrid; labelAr: string; labelEn: string }[] = [
    { mode: 'grid', icon: LayoutGrid, labelAr: 'شبكة', labelEn: 'Grid' },
    { mode: 'list', icon: List, labelAr: 'قائمة', labelEn: 'List' },
  ];

  return (
    <>
      <Navbar />
      <div
        data-sticky-header="search"
        className="mt-16 sm:mt-[4.5rem] sticky top-16 sm:top-[4.5rem] z-sticky bg-background/95 backdrop-blur-md border-b border-border/50"
      >
        <div className="container-app py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <SearchAutocomplete
                query={query}
                onQueryChange={onQueryChange}
                onSearch={onSearch}
                businesses={businesses}
                categories={categories}
              />
            </div>

            <MobileFiltersSheet
              filters={filters}
              onFilterChange={onFilterChange}
              onClearFilters={onClearFilters}
              categories={categories}
              cities={cities}
              hasActiveFilters={hasActiveFilters}
              activeCount={activeFilterCount}
            />

            <Select value={sortBy} onValueChange={(v) => onSortChange(v as SearchFilterValues['sortBy'])}>
              <SelectTrigger
                className="hidden sm:inline-flex h-11 rounded-xl text-xs bg-muted/40 border-border/40 px-3 gap-1.5 w-auto min-w-[140px]"
                aria-label={bi('الترتيب', 'Sort')}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="relevance">{bi('الأكثر صلة', 'Relevance')}</SelectItem>
                <SelectItem value="rating">{bi('الأعلى تقييماً', 'Top rated')}</SelectItem>
                <SelectItem value="newest">{bi('الأحدث', 'Newest')}</SelectItem>
                <SelectItem value="name">{bi('الاسم', 'Name')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 border border-border/40">
              {viewBtns.map(({ mode, icon: Icon, labelAr, labelEn }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(mode)}
                  title={bi(labelAr, labelEn)}
                  aria-label={bi(labelAr, labelEn)}
                  aria-pressed={viewMode === mode}
                  className={`p-2 inline-flex items-center justify-center rounded-lg transition-colors ${
                    viewMode === mode
                      ? 'bg-card text-accent ring-1 ring-accent/20 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="h-11 w-11 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10 border border-border/40 transition-colors"
              aria-label={bi('مشاركة البحث', 'Share search')}
              title={bi('مشاركة البحث', 'Share search')}
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {(children || totalResults > 0) ? (
          <div className="border-t border-border/40 bg-muted/20">
            <div className="container-app py-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-heading font-bold text-foreground whitespace-nowrap">
                <span className="tech-content">{totalResults.toLocaleString('en-US')}</span>
                <span className="ms-1 text-muted-foreground font-normal">{bi('نتيجة', 'results')}</span>
              </span>
              {children ? <div className="flex-1 min-w-0">{children}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default SearchHeaderV3;