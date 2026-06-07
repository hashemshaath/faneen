import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { TaxonomyFilterState } from './TaxonomyFilters';

interface Props {
  value: TaxonomyFilterState;
  onChange: (next: TaxonomyFilterState) => void;
}

/**
 * Calm, single-row search bar. Primary filters (status, visibility) stay inline.
 * Advanced filters open in an inline drawer panel — never a popup.
 */
export const TaxonomySearchBar: React.FC<Props> = ({ value, onChange }) => {
  const { isRTL } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const set = <K extends keyof TaxonomyFilterState>(k: K, v: TaxonomyFilterState[K]) =>
    onChange({ ...value, [k]: v });

  const activeAdvanced =
    value.visibility !== '' || value.missing !== '' || value.status !== 'all';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            dir="auto"
            value={value.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder={
              isRTL
                ? 'ابحث عن تصنيف، خدمة، منتج، كلمة بحثية أو رابط مختصر…'
                : 'Search a category, service, product, keyword or short link…'
            }
            className="ps-9 pe-9 h-12 rounded-2xl bg-card border-border text-sm shadow-sm"
          />
          {value.query && (
            <button
              type="button"
              onClick={() => set('query', '')}
              className="absolute top-1/2 -translate-y-1/2 end-2 p-1 rounded hover:bg-muted"
              aria-label="clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={value.status} onValueChange={(v) => set('status', v as TaxonomyFilterState['status'])}>
          <SelectTrigger className="h-12 rounded-2xl w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
            <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
            <SelectItem value="hidden">{isRTL ? 'مخفي' : 'Hidden'}</SelectItem>
            <SelectItem value="archived">{isRTL ? 'مؤرشف' : 'Archived'}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={showAdvanced || activeAdvanced ? 'default' : 'outline'}
          className="h-12 rounded-2xl gap-2"
          onClick={() => setShowAdvanced((s) => !s)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {isRTL ? 'فلاتر متقدمة' : 'Advanced'}
        </Button>
      </div>

      {showAdvanced && (
        <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? 'مكان الظهور' : 'Visibility surface'}</Label>
              <Select
                value={value.visibility || 'any'}
                onValueChange={(v) => set('visibility', (v === 'any' ? '' : v) as TaxonomyFilterState['visibility'])}
              >
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{isRTL ? 'أي مكان' : 'Any'}</SelectItem>
                  <SelectItem value="show_in_registration">{isRTL ? 'يظهر في التسجيل' : 'In registration'}</SelectItem>
                  <SelectItem value="show_in_search">{isRTL ? 'يظهر في البحث' : 'In search'}</SelectItem>
                  <SelectItem value="show_in_seo">{isRTL ? 'يظهر في SEO' : 'In SEO'}</SelectItem>
                  <SelectItem value="show_in_showcase">{isRTL ? 'يظهر في Showcase' : 'In showcase'}</SelectItem>
                  <SelectItem value="show_in_products">{isRTL ? 'في المنتجات' : 'In products'}</SelectItem>
                  <SelectItem value="show_in_contracts">{isRTL ? 'في العقود' : 'In contracts'}</SelectItem>
                  <SelectItem value="show_in_quotes">{isRTL ? 'في عروض الأسعار' : 'In quotes'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? 'النواقص' : 'Missing data'}</Label>
              <Select
                value={value.missing || 'none'}
                onValueChange={(v) => set('missing', (v === 'none' ? '' : v) as TaxonomyFilterState['missing'])}
              >
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? 'لا شيء' : 'None'}</SelectItem>
                  <SelectItem value="description">{isRTL ? 'بدون وصف' : 'Missing description'}</SelectItem>
                  <SelectItem value="seo">{isRTL ? 'بدون SEO' : 'Missing SEO'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={value.status === 'archived'}
                onCheckedChange={(v) => set('status', v ? 'archived' : 'all')}
                id="tx-archived-only"
              />
              <Label htmlFor="tx-archived-only" className="text-xs cursor-pointer">
                {isRTL ? 'عرض المؤرشف فقط' : 'Show archived only'}
              </Label>
            </div>
            {activeAdvanced && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  onChange({ ...value, status: 'all', visibility: '', missing: '' })
                }
              >
                {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};