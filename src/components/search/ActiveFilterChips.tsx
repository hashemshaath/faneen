import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { X, RotateCcw } from 'lucide-react';
import type { SearchFilterValues } from '@/services/search/useSearch';

interface ActiveFilterChipsProps {
  filters: SearchFilterValues;
  query: string;
  selectedTags: string[];
  categories?: { id: string; name_ar: string; name_en: string }[];
  cities?: { id: string; name_ar: string; name_en: string }[];
  onFilterChange: <K extends keyof SearchFilterValues>(key: K, value: SearchFilterValues[K]) => void;
  onQueryChange: (q: string) => void;
  onClearTag: (tagId: string) => void;
  onClearAll: () => void;
}

export const ActiveFilterChips = ({
  filters, query, selectedTags, categories, cities,
  onFilterChange, onQueryChange, onClearTag, onClearAll,
}: ActiveFilterChipsProps) => {
  const { language, isRTL } = useLanguage();

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (query.trim()) {
    chips.push({
      key: 'query',
      label: `${isRTL ? 'بحث' : 'Search'}: "${query}"`,
      onRemove: () => onQueryChange(''),
    });
  }

  if (filters.categoryId !== 'all') {
    const cat = categories?.find(c => c.id === filters.categoryId);
    chips.push({
      key: 'cat',
      label: cat ? (language === 'ar' ? cat.name_ar : cat.name_en) : filters.categoryId,
      onRemove: () => onFilterChange('categoryId', 'all'),
    });
  }

  if (filters.cityId !== 'all') {
    const city = cities?.find(c => c.id === filters.cityId);
    chips.push({
      key: 'city',
      label: city ? (language === 'ar' ? city.name_ar : city.name_en) : filters.cityId,
      onRemove: () => onFilterChange('cityId', 'all'),
    });
  }

  if (filters.minRating > 0) {
    chips.push({
      key: 'rating',
      label: `${filters.minRating}+ ⭐`,
      onRemove: () => onFilterChange('minRating', 0),
    });
  }

  if (filters.verifiedOnly) {
    chips.push({
      key: 'verified',
      label: isRTL ? 'موثق فقط' : 'Verified only',
      onRemove: () => onFilterChange('verifiedOnly', false),
    });
  }

  if (filters.priceMin > 0 || filters.priceMax > 0) {
    const label = filters.priceMin > 0 && filters.priceMax > 0
      ? `${filters.priceMin} - ${filters.priceMax} ${isRTL ? 'ر.س' : 'SAR'}`
      : filters.priceMin > 0
        ? `${isRTL ? 'من' : 'From'} ${filters.priceMin}`
        : `${isRTL ? 'إلى' : 'Up to'} ${filters.priceMax}`;
    chips.push({
      key: 'price',
      label,
      onRemove: () => { onFilterChange('priceMin', 0); onFilterChange('priceMax', 0); },
    });
  }

  selectedTags.forEach(tagId => {
    chips.push({
      key: `tag-${tagId}`,
      label: `#${tagId.slice(0, 6)}`,
      onRemove: () => onClearTag(tagId),
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4 animate-fade-in">
      {chips.map(chip => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 ps-2.5 pe-1 py-1 h-7 bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15 transition-colors cursor-default group/chip text-xs font-body"
        >
          <span className="truncate max-w-[120px]">{chip.label}</span>
          <button
            onClick={chip.onRemove}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-accent/20 transition-colors"
            aria-label={`Remove ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="flex items-center gap-1 text-[11px] text-destructive hover:underline font-body px-2 py-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          {isRTL ? 'مسح الكل' : 'Clear all'}
        </button>
      )}
    </div>
  );
};
