import { useMemo } from 'react';
import { ShieldCheck, Star, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SA_REGIONS } from '@/data/sa-regions';
import type { SearchFilterValues } from '@/services/search/useSearch';
import { SearchFiltersSkeletonV3 } from './SearchFiltersSkeletonV3';

interface CatLite { id: string; slug: string; name_ar: string; name_en: string; parent_id: string | null }
interface CityLite { id: string; name_ar: string; name_en: string }

interface Props {
  filters: SearchFilterValues;
  onFilterChange: <K extends keyof SearchFilterValues>(k: K, v: SearchFilterValues[K]) => void;
  onClearFilters: () => void;
  categories?: CatLite[];
  cities?: CityLite[];
  hasActiveFilters: boolean;
  loading?: boolean;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[11px] font-heading font-bold text-foreground uppercase tracking-wide mb-1.5">
    {children}
  </label>
);

export const SearchFiltersV3 = ({
  filters, onFilterChange, onClearFilters, categories, cities, hasActiveFilters, loading,
}: Props) => {
  const { language } = useLanguage();
  const bi = useBi();

  if (loading) return <SearchFiltersSkeletonV3 />;

  const parents = useMemo(
    () => (categories ?? []).filter((c) => !c.parent_id),
    [categories],
  );
  const children = useMemo(
    () => (categories ?? []).filter((c) => c.parent_id),
    [categories],
  );
  const sortedCities = useMemo(
    () => [...(cities ?? [])].sort((a, b) =>
      (language === 'ar' ? a.name_ar : a.name_en).localeCompare(
        language === 'ar' ? b.name_ar : b.name_en,
        language,
      ),
    ),
    [cities, language],
  );

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>{bi('القطاع', 'Sector')}</SectionLabel>
        <Select value={filters.categoryId} onValueChange={(v) => onFilterChange('categoryId', v)}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={bi('كل القطاعات', 'All sectors')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل القطاعات', 'All sectors')}</SelectItem>
            {parents.map((c) => (
              <SelectItem key={c.id} value={c.id} dir="auto">
                {language === 'ar' ? c.name_ar : c.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {children.length > 0 ? (
        <div>
          <SectionLabel>{bi('التخصص', 'Specialty')}</SectionLabel>
          <Select value={filters.serviceCategoryId} onValueChange={(v) => onFilterChange('serviceCategoryId', v)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={bi('كل التخصصات', 'All specialties')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bi('كل التخصصات', 'All specialties')}</SelectItem>
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id} dir="auto">
                  {language === 'ar' ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div>
        <SectionLabel>{bi('المنطقة', 'Region')}</SectionLabel>
        <Select value={filters.regionId || 'all'} onValueChange={(v) => onFilterChange('regionId', v)}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={bi('كل المناطق', 'All regions')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل المناطق', 'All regions')}</SelectItem>
            {SA_REGIONS.map((r) => (
              <SelectItem key={r.id} value={r.id} dir="auto">
                {language === 'ar' ? r.name_ar : r.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <SectionLabel>{bi('المدينة', 'City')}</SectionLabel>
        <Select value={filters.cityId} onValueChange={(v) => onFilterChange('cityId', v)}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={bi('كل المدن', 'All cities')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل المدن', 'All cities')}</SelectItem>
            {sortedCities.map((c) => (
              <SelectItem key={c.id} value={c.id} dir="auto">
                {language === 'ar' ? c.name_ar : c.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <SectionLabel>{bi('التقييم', 'Rating')}</SectionLabel>
        <div className="flex gap-1.5 flex-wrap">
          {[0, 3, 4, 4.5].map((r) => {
            const active = filters.minRating === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onFilterChange('minRating', r)}
                className={`h-9 px-3 rounded-full text-xs font-body font-medium inline-flex items-center gap-1 border transition-colors ${
                  active
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-card text-foreground border-border/60 hover:border-accent/50'
                }`}
              >
                {r === 0 ? bi('الكل', 'Any') : (<><Star className="w-3 h-3 fill-current" /> <span className="tech-content">{r}+</span></>)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>{bi('الحالة', 'Status')}</SectionLabel>
        <label className="inline-flex items-center gap-2 h-11 px-3 rounded-xl border border-border/60 bg-card cursor-pointer hover:border-accent/50 w-full">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => onFilterChange('verifiedOnly', e.target.checked)}
            className="w-4 h-4 rounded accent-success"
          />
          <ShieldCheck className="w-4 h-4 text-success" />
          <span className="text-sm font-body font-medium">{bi('موثّق فقط', 'Verified only')}</span>
        </label>
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="w-full h-11 rounded-xl border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 inline-flex items-center justify-center gap-2 text-sm font-body font-semibold"
        >
          <RotateCcw className="w-4 h-4" />
          {bi('مسح كل الفلاتر', 'Clear all filters')}
        </button>
      ) : null}
    </div>
  );
};

export default SearchFiltersV3;