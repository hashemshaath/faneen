import type { ReactNode } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { SearchAutocomplete } from './SearchAutocomplete';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LayoutGrid, List, Map as MapIcon, Columns, Share2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import type { ViewMode, SortKey } from './SearchResults';

interface SearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch?: (q: string) => void;
  businesses?: { id: string; name_ar: string; name_en: string }[];
  categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
  sortBy?: SortKey;
  onSortChange?: (s: SortKey) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  totalResults: number;
  /** Rendered as a second slim bar (active filter chips). */
  children?: ReactNode;
}

export const SearchHeader = ({
  query, onQueryChange, onSearch, businesses, categories,
  sortBy, onSortChange, viewMode, onViewModeChange, totalResults, children,
}: SearchHeaderProps) => {
  const { isRTL, t } = useLanguage();

  const viewButtons: { mode: ViewMode; icon: typeof LayoutGrid; labelAr: string; labelEn: string }[] = [
    { mode: 'grid', icon: LayoutGrid, labelAr: 'شبكة', labelEn: 'Grid' },
    { mode: 'list', icon: List, labelAr: 'قائمة', labelEn: 'List' },
    { mode: 'split', icon: Columns, labelAr: 'مقسم', labelEn: 'Split' },
    { mode: 'map', icon: MapIcon, labelAr: 'خريطة', labelEn: 'Map' },
  ];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(isRTL ? 'تم نسخ رابط البحث' : 'Search link copied');
  };

  return (
    <>
      <Navbar />
      {/* Bar 1 — unified search/sort/view/share toolbar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
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

            {sortBy && onSortChange ? (
              <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortKey)}>
                <SelectTrigger
                  className="hidden sm:inline-flex h-11 rounded-xl text-xs bg-muted/40 border-border/40 px-3 gap-1.5 w-auto min-w-[130px]"
                  aria-label={isRTL ? 'الترتيب' : 'Sort'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="relevance">{isRTL ? 'الأكثر صلة' : 'Relevance'}</SelectItem>
                  <SelectItem value="rating">{isRTL ? 'الأعلى تقييماً' : 'Top rated'}</SelectItem>
                  <SelectItem value="newest">{isRTL ? 'الأحدث' : 'Newest'}</SelectItem>
                  <SelectItem value="name">{isRTL ? 'الاسم' : 'Name'}</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            <div className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 border border-border/40">
              {viewButtons.map(({ mode, icon: Icon, labelAr, labelEn }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(mode)}
                  className={`p-2 inline-flex items-center justify-center rounded-lg transition-colors ${viewMode === mode ? 'bg-card text-accent ring-1 ring-accent/20 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label={isRTL ? labelAr : labelEn}
                  aria-pressed={viewMode === mode}
                  title={isRTL ? labelAr : labelEn}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="h-11 w-11 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10 border border-border/40 transition-colors"
              aria-label={isRTL ? 'مشاركة البحث' : 'Share search'}
              title={isRTL ? 'مشاركة البحث' : 'Share search'}
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Bar 2 — slim context bar (count + active filter chips) */}
        {(children || totalResults > 0) ? (
          <div className="border-t border-border/40 bg-muted/20">
            <div className="container-app py-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-heading font-bold text-foreground whitespace-nowrap">
                <span className="tech-content">{totalResults.toLocaleString()}</span>
                <span className="ms-1 text-muted-foreground font-normal">{t('search.results')}</span>
              </span>
              {children ? <div className="flex-1 min-w-0">{children}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};
