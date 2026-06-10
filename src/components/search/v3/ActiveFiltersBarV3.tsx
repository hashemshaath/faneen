import { X, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import type { SearchFilterValues } from '@/services/search/useSearch';
import { SA_REGIONS } from '@/data/sa-regions';

interface Props {
  filters: SearchFilterValues;
  query: string;
  categories?: { id: string; name_ar: string; name_en: string }[];
  cities?: { id: string; name_ar: string; name_en: string }[];
  onFilterChange: <K extends keyof SearchFilterValues>(k: K, v: SearchFilterValues[K]) => void;
  onQueryChange: (q: string) => void;
  onClearAll: () => void;
}

export const ActiveFiltersBarV3 = ({
  filters, query, categories, cities, onFilterChange, onQueryChange, onClearAll,
}: Props) => {
  const { language } = useLanguage();
  const bi = useBi();

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (query.trim()) {
    chips.push({ key: 'q', label: `"${query}"`, onRemove: () => onQueryChange('') });
  }
  if (filters.categoryId !== 'all') {
    const c = categories?.find(c => c.id === filters.categoryId);
    chips.push({
      key: 'cat',
      label: c ? (language === 'ar' ? c.name_ar : c.name_en) : '',
      onRemove: () => onFilterChange('categoryId', 'all'),
    });
  }
  if (filters.serviceCategoryId !== 'all') {
    const c = categories?.find(c => c.id === filters.serviceCategoryId);
    chips.push({
      key: 'svc',
      label: c ? (language === 'ar' ? c.name_ar : c.name_en) : '',
      onRemove: () => onFilterChange('serviceCategoryId', 'all'),
    });
  }
  if (filters.cityId !== 'all') {
    const c = cities?.find(c => c.id === filters.cityId);
    chips.push({
      key: 'city',
      label: c ? (language === 'ar' ? c.name_ar : c.name_en) : '',
      onRemove: () => onFilterChange('cityId', 'all'),
    });
  }
  if (filters.regionId && filters.regionId !== 'all') {
    const r = SA_REGIONS.find(r => r.id === filters.regionId);
    chips.push({
      key: 'region',
      label: r ? (language === 'ar' ? r.name_ar : r.name_en) : '',
      onRemove: () => onFilterChange('regionId', 'all'),
    });
  }
  if (filters.minRating > 0) {
    chips.push({
      key: 'rating',
      label: `${filters.minRating}+ ★`,
      onRemove: () => onFilterChange('minRating', 0),
    });
  }
  if (filters.verifiedOnly) {
    chips.push({
      key: 'verified',
      label: bi('موثق فقط', 'Verified only'),
      onRemove: () => onFilterChange('verifiedOnly', false),
    });
  }

  const visible = chips.filter((c) => c.label);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 ps-2.5 pe-1 py-0.5 h-7 rounded-full bg-accent/10 text-accent border border-accent/25 text-xs font-body font-medium"
        >
          <span className="truncate max-w-[160px]" dir="auto">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-accent/25"
            aria-label={bi(`إزالة ${chip.label}`, `Remove ${chip.label}`)}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      {visible.length > 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 text-[11px] text-destructive hover:bg-destructive/10 font-body font-medium px-2.5 py-1 rounded-full border border-destructive/25"
        >
          <RotateCcw className="w-3 h-3" />
          {bi('مسح الكل', 'Clear all')}
        </button>
      ) : null}
    </div>
  );
};

export default ActiveFiltersBarV3;