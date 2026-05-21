import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Star, ShieldCheck, SlidersHorizontal, RotateCcw, ChevronRight, ChevronLeft, MapPin, ArrowUpDown, Tag, Wallet, ChevronDown, Layers,
} from 'lucide-react';
import { CategoryTree } from './CategoryTree';
import { TagsFilter } from './TagsFilter';
import type { SearchFilterValues } from '@/services/search/useSearch';
import { useCategoryCounts } from '@/services/categories/useCategoryCounts';
export type { SearchFilterValues };

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
    filters.serviceCategoryId !== 'all',
  ].filter(Boolean).length + selectedTags.length;

  const selectedCategory = categories?.find(c => c.id === filters.categoryId);
  const selectedCity = cities?.find(c => c.id === filters.cityId);
  const selectedServiceCategory = categories?.find(c => c.id === filters.serviceCategoryId || c.slug === filters.serviceCategoryId);
  const sortLabels: Record<SearchFilterValues['sortBy'], { ar: string; en: string }> = {
    relevance: { ar: 'الأكثر صلة', en: 'Relevance' },
    rating: { ar: 'الأعلى تقييماً', en: 'Top rated' },
    newest: { ar: 'الأحدث', en: 'Newest' },
    name: { ar: 'الاسم', en: 'Name' },
  };
  const priceSummary = filters.priceMin || filters.priceMax
    ? `${filters.priceMin || 0} – ${filters.priceMax || '∞'}`
    : '';
  const ratingSummary = filters.minRating > 0 ? `${filters.minRating}★+` : '';

  const CollapseIcon = isRTL
    ? (showFilters ? ChevronRight : ChevronLeft)
    : (showFilters ? ChevronLeft : ChevronRight);

  return (
    <aside
      className={`flex-shrink-0 transition-all duration-300 w-full ${showFilters ? 'lg:w-[280px] xl:w-[300px]' : 'lg:w-[56px]'}`}
      aria-label={isRTL ? 'مرشحات البحث' : 'Search filters'}
    >
      <div className="lg:sticky lg:top-24">
        {/* Header card — stays in flow on mobile so it doesn't cover content */}
        <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-sm overflow-hidden">
          <button
            onClick={onToggleFilters}
            className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors"
            title={showFilters ? (isRTL ? 'طي التصفية' : 'Collapse filters') : (isRTL ? 'عرض التصفية' : 'Show filters')}
            aria-expanded={showFilters}
          >
            <div className="flex items-center gap-2.5 font-heading font-bold text-foreground min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4 text-accent" />
              </div>
              <span className="text-sm truncate">{t('search.filters')}</span>
              {activeCount > 0 && (
                <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center rounded-full font-bold tech-content">
                  {activeCount}
                </Badge>
              )}
            </div>
            <span className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-muted-foreground">
              <CollapseIcon className="w-4 h-4" />
            </span>
            <span className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground">
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {hasActiveFilters && showFilters && (
            <button
              onClick={onClearFilters}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-body font-semibold text-destructive hover:bg-destructive/5 border-t border-border/60 py-2.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('search.clear_filters')}
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 space-y-2.5 animate-fade-in lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pe-1 no-scrollbar">
            {/* Category */}
            <FilterCard
              icon={Tag}
              label={t('search.category')}
              summary={selectedCategory ? (language === 'ar' ? selectedCategory.name_ar : selectedCategory.name_en) : ''}
            >
              <CategoryTree
                categories={(categories || []) as any}
                selectedId={filters.categoryId}
                onSelect={v => onFilterChange('categoryId', v)}
              />
            </FilterCard>

            {/* Service Category — facet driven by business_services.category_id */}
            <FilterCard
              icon={Layers}
              label={isRTL ? 'نوع الخدمة' : 'Service category'}
              summary={selectedServiceCategory ? (language === 'ar' ? selectedServiceCategory.name_ar : selectedServiceCategory.name_en) : ''}
              defaultOpen={false}
            >
              <ServiceCategoryFacet
                categories={categories || []}
                value={filters.serviceCategoryId}
                onChange={(v) => onFilterChange('serviceCategoryId', v)}
              />
            </FilterCard>

            {/* City */}
            <FilterCard
              icon={MapPin}
              label={t('search.city')}
              summary={selectedCity ? (language === 'ar' ? selectedCity.name_ar : selectedCity.name_en) : ''}
            >
              <Select value={filters.cityId} onValueChange={v => onFilterChange('cityId', v)}>
                <SelectTrigger className="w-full rounded-xl h-10 text-sm bg-background border-border/60 hover:border-accent/40 transition-colors">
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
            <FilterCard icon={Wallet} label={t('search.price_range')} hint={isRTL ? 'ر.س' : 'SAR'} summary={priceSummary}>
              <PriceRangeInputs
                priceMin={filters.priceMin}
                priceMax={filters.priceMax}
                onChange={(min, max) => {
                  if (min !== filters.priceMin) onFilterChange('priceMin', min);
                  if (max !== filters.priceMax) onFilterChange('priceMax', max);
                }}
                isRTL={isRTL}
              />
            </FilterCard>

            {/* Rating */}
            <FilterCard icon={Star} label={t('search.min_rating')} summary={ratingSummary}>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 3, 4, 4.5, 5].map((r) => {
                  const active = filters.minRating === r;
                  const label = r === 0
                    ? (isRTL ? 'الكل' : 'All')
                    : (
                      <span className="inline-flex items-center gap-0.5 tech-content">
                        {r}
                        <Star className="w-3 h-3 fill-current" />
                        {r < 5 ? '+' : ''}
                      </span>
                    );
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => onFilterChange('minRating', r)}
                      className={`h-9 rounded-lg text-[11px] font-heading font-semibold transition-all border flex items-center justify-center ${
                        active
                          ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                          : 'bg-background border-border/60 text-foreground/70 hover:border-accent/40 hover:text-accent'
                      }`}
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </FilterCard>

            {/* Verified — toggle row */}
            <label
              htmlFor="verified"
              className={`flex items-center justify-between gap-3 p-3 rounded-2xl border cursor-pointer transition-all min-h-[60px] ${
                filters.verifiedOnly
                  ? 'bg-success/5 border-success/30'
                  : 'bg-card border-border/60 hover:border-accent/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  filters.verifiedOnly ? 'bg-success/15' : 'bg-muted'
                }`}>
                  <ShieldCheck className={`w-4 h-4 ${filters.verifiedOnly ? 'text-success dark:text-success' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-heading font-semibold text-foreground truncate">{t('search.verified_only')}</div>
                  <div className="text-[11px] text-muted-foreground">{isRTL ? 'مزودون موثقون فقط' : 'Verified providers only'}</div>
                </div>
              </div>
              <Switch
                id="verified"
                checked={filters.verifiedOnly}
                onCheckedChange={c => onFilterChange('verifiedOnly', c === true)}
                className="data-[state=checked]:bg-success"
              />
            </label>

            {/* Sort */}
            <FilterCard
              icon={ArrowUpDown}
              label={t('search.sort_by')}
              summary={language === 'ar' ? sortLabels[filters.sortBy].ar : sortLabels[filters.sortBy].en}
              defaultOpen={false}
            >
              <Select value={filters.sortBy} onValueChange={(v) => onFilterChange('sortBy', v as SearchFilterValues['sortBy'])}>
                <SelectTrigger className="w-full rounded-xl h-10 text-sm bg-background border-border/60 hover:border-accent/40 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{language === 'ar' ? 'الأكثر صلة' : 'Relevance'}</SelectItem>
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
    </aside>
  );
};

const FilterCard = ({
  icon: Icon, label, hint, children, summary, defaultOpen = false,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  children: React.ReactNode;
  /** Compact value preview shown in the header when collapsed (mobile). */
  summary?: string;
  /** Whether this card is open by default on mobile. */
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasSummary = Boolean(summary);
  return (
    <section className="rounded-2xl bg-card border border-border/60 hover:border-accent/30 transition-colors shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="lg:pointer-events-none w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border/50 bg-muted/30 lg:bg-muted/20 hover:bg-muted/50 lg:hover:bg-muted/20 transition-colors text-start"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-accent shrink-0" />
          <span className="text-[12.5px] font-heading font-bold text-foreground truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasSummary && !open && (
            <span className="lg:hidden max-w-[120px] truncate text-[11px] font-body font-semibold text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
              {summary}
            </span>
          )}
          {hint && (
            <span className="text-[10px] font-body text-muted-foreground tech-content px-1.5 py-0.5 rounded-md bg-background/60 border border-border/50">{hint}</span>
          )}
          <ChevronDown
            className={`lg:hidden w-4 h-4 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      <div className={`${open ? 'block' : 'hidden'} lg:block p-3`}>{children}</div>
    </section>
  );
};

/* Debounced price inputs — keeps typing snappy and only commits to the parent
   filter state after the user pauses (300ms). */
const PriceRangeInputs = ({
  priceMin, priceMax, onChange, isRTL,
}: {
  priceMin: number;
  priceMax: number;
  onChange: (min: number, max: number) => void;
  isRTL: boolean;
}) => {
  const [localMin, setLocalMin] = useState<string>(priceMin ? String(priceMin) : '');
  const [localMax, setLocalMax] = useState<string>(priceMax ? String(priceMax) : '');
  const timerRef = useRef<number | null>(null);

  // Sync from parent when filters reset externally
  useEffect(() => { setLocalMin(priceMin ? String(priceMin) : ''); }, [priceMin]);
  useEffect(() => { setLocalMax(priceMax ? String(priceMax) : ''); }, [priceMax]);

  const schedule = (minStr: string, maxStr: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onChange(Number(minStr) || 0, Number(maxStr) || 0);
    }, 350);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={isRTL ? 'من' : 'Min'}
        value={localMin}
        onChange={e => { setLocalMin(e.target.value); schedule(e.target.value, localMax); }}
        className="flex-1 rounded-xl text-sm h-10 bg-background border-border/60 hover:border-accent/40 focus-visible:border-accent tech-content text-center"
      />
      <span className="text-muted-foreground/50 text-xs font-bold select-none">—</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={isRTL ? 'إلى' : 'Max'}
        value={localMax}
        onChange={e => { setLocalMax(e.target.value); schedule(localMin, e.target.value); }}
        className="flex-1 rounded-xl text-sm h-10 bg-background border-border/60 hover:border-accent/40 focus-visible:border-accent tech-content text-center"
      />
    </div>
  );
};

/* Service-category facet — shows categories that have ≥1 active service,
   grouped by parent → children. Clicking the active row clears the filter. */
interface ServiceCategoryFacetCategory {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id?: string | null;
  slug?: string;
}
const ServiceCategoryFacet = ({
  categories, value, onChange,
}: {
  categories: ServiceCategoryFacetCategory[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const { language, isRTL } = useLanguage();
  const { byId, bySlug, isLoading } = useCategoryCounts();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const getCount = (cat: ServiceCategoryFacetCategory): number => {
    const row = byId.get(cat.id) || (cat.slug ? bySlug.get(cat.slug) : undefined);
    return row?.active_services_count ?? 0;
  };

  const { roots, childrenByParent } = useMemo(() => {
    const r: ServiceCategoryFacetCategory[] = [];
    const map = new Map<string, ServiceCategoryFacetCategory[]>();
    for (const c of categories) {
      if (!c.parent_id) r.push(c);
      else {
        const arr = map.get(c.parent_id) || [];
        arr.push(c);
        map.set(c.parent_id, arr);
      }
    }
    return { roots: r, childrenByParent: map };
  }, [categories]);

  // Hide parents whose rollup count is 0 AND have no children with counts
  const visibleRoots = useMemo(() => {
    if (isLoading || byId.size === 0) return roots;
    return roots.filter((p) => {
      if (getCount(p) > 0) return true;
      const kids = childrenByParent.get(p.id) || [];
      return kids.some((k) => getCount(k) > 0);
    });
  }, [roots, childrenByParent, isLoading, byId]);

  const getName = (c: ServiceCategoryFacetCategory) =>
    language === 'ar' ? c.name_ar : (c.name_en || c.name_ar);

  const isSelected = (c: ServiceCategoryFacetCategory) =>
    value === c.id || (c.slug && value === c.slug);

  const toggleSelect = (c: ServiceCategoryFacetCategory) => {
    onChange(isSelected(c) ? 'all' : c.id);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (visibleRoots.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground py-2 text-center">
        {isRTL ? 'لا توجد خدمات متاحة' : 'No services available'}
      </p>
    );
  }

  return (
    <div className="space-y-0.5 -m-1 max-h-[280px] overflow-y-auto pe-1 no-scrollbar">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors min-h-[36px] ${
          value === 'all'
            ? 'bg-accent/12 text-accent font-heading font-bold ring-1 ring-accent/30'
            : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground'
        }`}
      >
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate text-start flex-1">{isRTL ? 'كل الخدمات' : 'All services'}</span>
      </button>

      {visibleRoots.map((parent) => {
        const kids = (childrenByParent.get(parent.id) || []).filter((k) => getCount(k) > 0);
        const hasKids = kids.length > 0;
        const count = getCount(parent);
        const selected = isSelected(parent);
        const childSelected = kids.some((k) => isSelected(k));
        const open = expanded.has(parent.id);

        return (
          <div key={parent.id}>
            <div className="flex items-stretch">
              <button
                type="button"
                onClick={() => toggleSelect(parent)}
                className={`flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors min-h-[36px] ${
                  selected || childSelected
                    ? 'bg-accent/12 text-accent font-heading font-bold ring-1 ring-accent/30'
                    : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground'
                }`}
                aria-pressed={selected}
              >
                <span className="truncate flex-1 text-start">{getName(parent)}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 min-w-[18px] h-[18px] tech-content bg-muted text-muted-foreground border-0">
                    {count}
                  </Badge>
                )}
              </button>
              {hasKids && (
                <button
                  type="button"
                  onClick={() => toggleExpand(parent.id)}
                  aria-label={open ? (isRTL ? 'طي' : 'Collapse') : (isRTL ? 'توسيع' : 'Expand')}
                  className="px-1.5 text-muted-foreground hover:text-foreground"
                >
                  {open ? <ChevronDown className="w-3.5 h-3.5" /> : (isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
                </button>
              )}
            </div>

            {hasKids && open && (
              <div className="ms-3 ps-2 space-y-0.5 mt-0.5 border-s border-border/50">
                {kids.map((child) => {
                  const cCount = getCount(child);
                  const cSel = isSelected(child);
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => toggleSelect(child)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors min-h-[32px] ${
                        cSel
                          ? 'bg-accent/12 text-accent font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                      aria-pressed={cSel}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
                      <span className="truncate text-start flex-1">{getName(child)}</span>
                      <span className="text-[10px] tech-content opacity-70">{cCount}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
