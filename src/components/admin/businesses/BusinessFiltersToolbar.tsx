import React from 'react';
import { Search, X, Filter, Languages, FlaskConical, ArrowUpDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface TierOption { value: string; label_ar: string; label_en: string; icon: string }

interface Props {
  searchInputRef?: React.RefObject<HTMLInputElement>;
  searchInput: string;
  search: string;
  onSearchInput: (v: string) => void;
  onClearSearch: () => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  /** Currently selected tiers (multi-select). Empty array = all. */
  selectedTiers: string[];
  /** Toggle a single tier on/off. */
  onToggleTier: (value: string) => void;
  /** Clear all selected tiers (reset to "all"). */
  onClearTiers: () => void;
  filterTranslation: string;
  onTranslationChange: (v: string) => void;
  filterOrigin: string;
  setFilterOrigin: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  tiers: TierOption[];
  language: 'ar' | 'en';
  isRTL: boolean;
  resultsCount: number;
  onClearAll: () => void;
  /** Optional per-tier counts; enables the embedded distribution strip + inline counts. */
  tierDistribution?: Record<string, number>;
  /** Total businesses for percentage math. */
  totalCount?: number;
}

/**
 * Sticky filter toolbar for AdminBusinesses. All state is lifted to the
 * parent — this component only renders inputs/selects + the active-filter
 * chips row. Logic for routing/search-params lives in the page.
 */
export const BusinessFiltersToolbar: React.FC<Props> = ({
  searchInputRef, searchInput, search, onSearchInput, onClearSearch,
  filterStatus, setFilterStatus, selectedTiers, onToggleTier, onClearTiers,
  filterTranslation, onTranslationChange, filterOrigin, setFilterOrigin,
  sortBy, setSortBy, tiers, language, isRTL, resultsCount, onClearAll,
  tierDistribution, totalCount = 0,
}) => {
  const hasActive =
    !!search || filterStatus !== 'all' || selectedTiers.length > 0 ||
    filterTranslation !== 'all' || filterOrigin !== 'all' || sortBy !== 'recent';

  const tierColor: Record<string, string> = {
    free: 'bg-muted-foreground/40',
    basic: 'bg-info',
    premium: 'bg-accent',
    enterprise: 'bg-secondary',
  };
  const tierAccent: Record<string, string> = {
    free: 'border-muted-foreground/40 bg-muted/50 text-foreground',
    basic: 'border-info/50 bg-info/10 text-info',
    premium: 'border-accent/50 bg-accent/10 text-accent',
    enterprise: 'border-secondary/50 bg-secondary/10 text-secondary',
  };
  const showDistribution = !!tierDistribution && totalCount > 0;
  const selectedSet = React.useMemo(() => new Set(selectedTiers), [selectedTiers]);

  return (
    <div className="rounded-2xl border border-border/30 bg-card p-4 sticky top-0 z-20 backdrop-blur-md bg-card/95">
      {showDistribution && (
        <div className="mb-3 pb-3 border-b border-border/20 space-y-2.5">
          {/* Distribution strip */}
          <div className="flex items-center gap-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted/50 flex-1 min-w-0">
            {tiers.map(t => {
              const c = tierDistribution![t.value] || 0;
              const pct = (c / totalCount) * 100;
              if (!pct) return null;
              return (
                <div
                  key={t.value}
                  className={`${tierColor[t.value] || 'bg-muted-foreground/30'} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${language === 'ar' ? t.label_ar : t.label_en}: ${c}`}
                />
              );
            })}
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 hidden xs:inline">
              {totalCount}
            </span>
          </div>
          {/* Multi-select tier chips — horizontally scrollable on mobile */}
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 snap-x"
            role="group"
            aria-label={isRTL ? 'تصفية حسب العضوية (متعدد)' : 'Filter by membership (multi)'}
          >
            <button
              type="button"
              onClick={onClearTiers}
              className={`shrink-0 snap-start h-9 px-3 inline-flex items-center gap-1.5 rounded-full border text-[12px] font-medium transition-colors ${
                selectedTiers.length === 0
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border/40 hover:bg-muted/50'
              }`}
              aria-pressed={selectedTiers.length === 0}
            >
              {isRTL ? 'الكل' : 'All'}
              <span className="tabular-nums opacity-70">{totalCount}</span>
            </button>
            {tiers.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => onToggleTier(t.value)}
                className={`shrink-0 snap-start h-9 px-3 inline-flex items-center gap-1.5 rounded-full border text-[12px] font-medium transition-all ${
                  selectedSet.has(t.value)
                    ? `${tierAccent[t.value] || 'border-foreground bg-foreground/5'} shadow-sm`
                    : 'bg-card text-muted-foreground border-border/40 hover:bg-muted/50'
                }`}
                aria-pressed={selectedSet.has(t.value)}
                title={language === 'ar' ? t.label_ar : t.label_en}
              >
                {selectedSet.has(t.value)
                  ? <Check className="w-3 h-3" />
                  : <span className={`inline-block w-2 h-2 rounded-full ${tierColor[t.value] || 'bg-muted-foreground/30'}`} />}
                <span>{language === 'ar' ? t.label_ar : t.label_en}</span>
                <span className="tech-content tabular-nums opacity-70">{tierDistribution![t.value] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ insetInlineStart: '12px' }} />
          <Input
            ref={searchInputRef}
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم، المعرف، الهاتف، البريد… ( / )' : 'Search by name, ID, phone, email… ( / )'}
            dir="auto"
            className="ps-10 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              style={{ insetInlineEnd: '10px' }}
              aria-label={isRTL ? 'مسح البحث' : 'Clear search'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl">
            <Filter className="w-4 h-4 me-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All Status'}</SelectItem>
            <SelectItem value="verified">{isRTL ? 'موثق' : 'Verified'}</SelectItem>
            <SelectItem value="unverified">{isRTL ? 'غير موثق' : 'Unverified'}</SelectItem>
            <SelectItem value="inactive">{isRTL ? 'معطل' : 'Inactive'}</SelectItem>
            <SelectItem value="contract">{isRTL ? 'مرتبط بعقود' : 'With Contracts'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTranslation} onValueChange={onTranslationChange}>
          <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl">
            <Languages className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{isRTL ? 'كل الترجمات' : 'All Translations'}</SelectItem>
            <SelectItem value="missing_en">{isRTL ? 'ينقص الإنجليزي' : 'Missing English'}</SelectItem>
            <SelectItem value="missing_ar">{isRTL ? 'ينقص العربي' : 'Missing Arabic'}</SelectItem>
            <SelectItem value="complete">{isRTL ? 'مكتملة الترجمة' : 'Translation Complete'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOrigin} onValueChange={setFilterOrigin}>
          <SelectTrigger
            className="w-full sm:w-44 h-10 rounded-xl"
            title={isRTL
              ? 'منشآت تجريبية = حسابات اختبار/عرض. منشآت إنتاج = حسابات حقيقية.'
              : 'Demo = test/showcase accounts. Production = real customers.'}
          >
            <FlaskConical className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{isRTL ? 'كل المنشآت (حقيقية + تجريبية)' : 'All entities (real + test)'}</SelectItem>
            <SelectItem value="production">{isRTL ? 'حقيقية فقط' : 'Real customers only'}</SelectItem>
            <SelectItem value="demo">{isRTL ? 'تجريبية فقط (اختبار/عرض)' : 'Test/demo only'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40 h-10 rounded-xl">
            <ArrowUpDown className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="recent">{isRTL ? 'الأحدث' : 'Most recent'}</SelectItem>
            <SelectItem value="rating">{isRTL ? 'الأعلى تقييماً' : 'Top rated'}</SelectItem>
            <SelectItem value="name">{isRTL ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</SelectItem>
            <SelectItem value="tier">{isRTL ? 'العضوية' : 'Tier'}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasActive && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20 flex-wrap">
          <span className="text-[11px] text-muted-foreground">
            {isRTL ? 'النتائج:' : 'Results:'} {resultsCount}
          </span>
          {search && (
            <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={onClearSearch}>
              "{search}" <X className="w-2.5 h-2.5" />
            </Badge>
          )}
          {filterStatus !== 'all' && (
            <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setFilterStatus('all')}>
              {filterStatus} <X className="w-2.5 h-2.5" />
            </Badge>
          )}
          {selectedTiers.map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => onToggleTier(t)}>
              {tiers.find(x => x.value === t)?.[language === 'ar' ? 'label_ar' : 'label_en'] || t}
              <X className="w-2.5 h-2.5" />
            </Badge>
          ))}
          {filterTranslation !== 'all' && (
            <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => onTranslationChange('all')}>
              {filterTranslation} <X className="w-2.5 h-2.5" />
            </Badge>
          )}
          {filterOrigin !== 'all' && (
            <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setFilterOrigin('all')}>
              {filterOrigin === 'demo' ? (isRTL ? 'تجريبية' : 'Test/demo') : (isRTL ? 'حقيقية' : 'Real')}
              <X className="w-2.5 h-2.5" />
            </Badge>
          )}
          {sortBy !== 'recent' && (
            <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setSortBy('recent')}>
              {sortBy} <X className="w-2.5 h-2.5" />
            </Badge>
          )}
          <button type="button" className="text-[10px] text-primary hover:underline ms-auto" onClick={onClearAll}>
            {isRTL ? 'مسح الكل' : 'Clear all'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BusinessFiltersToolbar;