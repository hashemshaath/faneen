import { useLanguage } from '@/i18n/LanguageContext';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Star, BadgeCheck, SlidersHorizontal, RotateCcw, DollarSign, ChevronDown, MapPin, ArrowUpDown, Tag,
} from 'lucide-react';
import { CategoryTree } from './CategoryTree';
import { TagsFilter } from './TagsFilter';

export interface SearchFilterValues {
  categoryId: string;
  cityId: string;
  minRating: number;
  verifiedOnly: boolean;
  sortBy: 'rating' | 'newest' | 'name';
  priceMin: number;
  priceMax: number;
}

interface SearchFiltersProps {
  filters: SearchFilterValues;
  onFilterChange: <K extends keyof SearchFilterValues>(key: K, value: SearchFilterValues[K]) => void;
  onClearFilters: () => void;
  categories?: { id: string; name_ar: string; name_en: string; parent_id?: string | null; slug?: string }[];
  cities?: { id: string; name_ar: string; name_en: string }[];
  hasActiveFilters: boolean;
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedTags?: string[];
  onToggleTag?: (tagId: string) => void;
  onClearTags?: () => void;
}

export const SearchFilters = ({
  filters, onFilterChange, onClearFilters, categories, cities,
  hasActiveFilters, showFilters, onToggleFilters,
  selectedTags = [], onToggleTag, onClearTags,
}: SearchFiltersProps) => {
  const { t, language, isRTL } = useLanguage();

  const activeCount = [
    filters.categoryId !== 'all',
    filters.cityId !== 'all',
    filters.minRating > 0,
    filters.verifiedOnly,
    filters.priceMin > 0,
    filters.priceMax > 0,
  ].filter(Boolean).length + selectedTags.length;

  return (
    <div className="lg:w-[260px] xl:w-[280px] flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onToggleFilters}
          className="flex items-center gap-2 font-heading font-bold text-foreground hover:text-accent transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
          </div>
          <span>{t('search.filters')}</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
              {activeCount}
            </Badge>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform lg:hidden ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-[11px] text-destructive font-body hover:underline flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {t('search.clear_filters')}
          </button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-1.5 animate-fade-in">
          {/* Category */}
          <FilterCard icon={Tag} label={t('search.category')}>
            <CategoryTree
              categories={(categories || []) as any}
              selectedId={filters.categoryId}
              onSelect={v => onFilterChange('categoryId', v)}
            />
          </FilterCard>

          {/* City */}
          <FilterCard icon={MapPin} label={t('search.city')}>
            <Select value={filters.cityId} onValueChange={v => onFilterChange('cityId', v)}>
              <SelectTrigger className="w-full rounded-xl h-9 text-sm bg-muted/20 dark:bg-muted/10 border-border/20 dark:border-border/10">
                <SelectValue placeholder={t('search.all_cities')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('search.all_cities')}</SelectItem>
                {cities?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterCard>

          {/* Price Range */}
          <FilterCard icon={DollarSign} label={t('search.price_range')}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={0}
                  placeholder={isRTL ? 'من' : 'Min'}
                  value={filters.priceMin || ''}
                  onChange={e => onFilterChange('priceMin', Number(e.target.value) || 0)}
                  className="rounded-xl text-sm h-9 ps-7 bg-muted/20 dark:bg-muted/10 border-border/20 dark:border-border/10"
                />
                <DollarSign className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
              <span className="text-muted-foreground/30 text-xs font-bold">—</span>
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={0}
                  placeholder={isRTL ? 'إلى' : 'Max'}
                  value={filters.priceMax || ''}
                  onChange={e => onFilterChange('priceMax', Number(e.target.value) || 0)}
                  className="rounded-xl text-sm h-9 ps-7 bg-muted/20 dark:bg-muted/10 border-border/20 dark:border-border/10"
                />
                <DollarSign className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
            </div>
          </FilterCard>

          {/* Rating */}
          <FilterCard icon={Star} label={`${t('search.min_rating')}: ${filters.minRating > 0 ? `${filters.minRating}+` : t('profile.all')}`}>
            <div className="flex items-center gap-3">
              <Slider
                value={[filters.minRating]}
                onValueChange={([v]) => onFilterChange('minRating', v)}
                max={5}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-px">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 transition-colors ${i < filters.minRating ? 'text-accent fill-accent' : 'text-border dark:text-border/20'}`}
                  />
                ))}
              </div>
            </div>
          </FilterCard>

          {/* Verified */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card dark:bg-card/60 border border-border/20 dark:border-border/10 hover:border-accent/20 transition-colors">
            <Checkbox
              id="verified"
              checked={filters.verifiedOnly}
              onCheckedChange={c => onFilterChange('verifiedOnly', c === true)}
            />
            <label htmlFor="verified" className="text-sm font-body text-foreground cursor-pointer flex items-center gap-1.5 flex-1">
              <BadgeCheck className="w-4 h-4 text-accent" />
              {t('search.verified_only')}
            </label>
          </div>

          {/* Sort */}
          <FilterCard icon={ArrowUpDown} label={t('search.sort_by')}>
            <Select value={filters.sortBy} onValueChange={(v: any) => onFilterChange('sortBy', v)}>
              <SelectTrigger className="w-full rounded-xl h-9 text-sm bg-muted/20 dark:bg-muted/10 border-border/20 dark:border-border/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">{t('search.sort_rating')}</SelectItem>
                <SelectItem value="newest">{t('search.sort_newest')}</SelectItem>
                <SelectItem value="name">{t('search.sort_name')}</SelectItem>
              </SelectContent>
            </Select>
          </FilterCard>

          {/* Tags */}
          {onToggleTag && onClearTags && (
            <TagsFilter
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
              onClearTags={onClearTags}
            />
          )}
        </div>
      )}
    </div>
  );
};

const FilterCard = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="p-3 rounded-xl bg-card dark:bg-card/60 border border-border/20 dark:border-border/10 space-y-2.5 hover:border-accent/15 transition-colors">
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-accent/60" />
      <span className="text-xs font-heading font-semibold text-foreground/80">{label}</span>
    </div>
    {children}
  </div>
);
