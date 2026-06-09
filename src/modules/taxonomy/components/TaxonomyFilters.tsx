import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { Search, X } from 'lucide-react';
import type { TaxonomyType, TaxonomyViewMode } from '../types';

export interface TaxonomyFilterState {
  query: string;
  typeId: string;
  status: 'all' | 'active' | 'hidden' | 'archived';
  visibility: '' | 'show_in_registration' | 'show_in_search' | 'show_in_seo' | 'show_in_showcase' | 'show_in_products' | 'show_in_contracts' | 'show_in_quotes';
  missing: '' | 'description' | 'seo';
  /** Safe Batch 5 — when false (default), legacy/merged primary slugs are hidden from the admin list. */
  showLegacy: boolean;
}

export const defaultTaxonomyFilters: TaxonomyFilterState = {
  query: '',
  typeId: 'all',
  status: 'all',
  visibility: '',
  missing: '',
  showLegacy: false,
};

interface Props {
  types: TaxonomyType[];
  value: TaxonomyFilterState;
  onChange: (next: TaxonomyFilterState) => void;
  view: TaxonomyViewMode;
  onViewChange: (v: TaxonomyViewMode) => void;
  onExportCsv: () => void;
  onNew: () => void;
}

export const TaxonomyFilters: React.FC<Props> = ({
  types, value, onChange, view, onViewChange, onExportCsv, onNew,
}) => {
  const { isRTL } = useLanguage();
  const set = <K extends keyof TaxonomyFilterState>(k: K, v: TaxonomyFilterState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            dir="auto"
            value={value.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder={isRTL ? 'بحث في الاسم، slug، الوصف، الكلمات…' : 'Search name, slug, description, keywords…'}
            className="ps-9 h-11 rounded-xl"
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

        <Select value={value.typeId} onValueChange={(v) => set('typeId', v)}>
          <SelectTrigger className="h-11 rounded-xl w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All types'}</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>{isRTL ? t.name_ar : t.name_en ?? t.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.status} onValueChange={(v) => set('status', v as TaxonomyFilterState['status'])}>
          <SelectTrigger className="h-11 rounded-xl w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
            <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
            <SelectItem value="hidden">{isRTL ? 'مخفي' : 'Hidden'}</SelectItem>
            <SelectItem value="archived">{isRTL ? 'مؤرشف' : 'Archived'}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={value.visibility || 'any'} onValueChange={(v) => set('visibility', (v === 'any' ? '' : v) as TaxonomyFilterState['visibility'])}>
          <SelectTrigger className="h-11 rounded-xl w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{isRTL ? 'أي مكان ظهور' : 'Any visibility'}</SelectItem>
            <SelectItem value="show_in_registration">{isRTL ? 'يظهر في التسجيل' : 'In registration'}</SelectItem>
            <SelectItem value="show_in_search">{isRTL ? 'يظهر في البحث' : 'In search'}</SelectItem>
            <SelectItem value="show_in_seo">{isRTL ? 'يظهر في SEO' : 'In SEO'}</SelectItem>
            <SelectItem value="show_in_showcase">{isRTL ? 'يظهر في Showcase' : 'In showcase'}</SelectItem>
            <SelectItem value="show_in_products">{isRTL ? 'في المنتجات' : 'In products'}</SelectItem>
            <SelectItem value="show_in_contracts">{isRTL ? 'في العقود' : 'In contracts'}</SelectItem>
            <SelectItem value="show_in_quotes">{isRTL ? 'في عروض الأسعار' : 'In quotes'}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={value.missing || 'none'} onValueChange={(v) => set('missing', (v === 'none' ? '' : v) as TaxonomyFilterState['missing'])}>
          <SelectTrigger className="h-11 rounded-xl w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{isRTL ? 'كل العناصر' : 'All items'}</SelectItem>
            <SelectItem value="description">{isRTL ? 'بدون وصف' : 'Missing description'}</SelectItem>
            <SelectItem value="seo">{isRTL ? 'بدون SEO' : 'Missing SEO'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="inline-flex rounded-xl border border-border bg-muted/30 p-0.5 text-xs">
          {(['tree','table','cards'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onViewChange(m)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${view===m ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {m === 'tree' ? (isRTL ? 'شجرة' : 'Tree') : m === 'table' ? (isRTL ? 'جدول' : 'Table') : (isRTL ? 'بطاقات' : 'Cards')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 rounded-xl" onClick={onExportCsv}>
            {isRTL ? 'تصدير CSV' : 'Export CSV'}
          </Button>
          <Button className="h-10 rounded-xl" onClick={onNew}>
            {isRTL ? 'تصنيف جديد' : 'New category'}
          </Button>
        </div>
      </div>
    </div>
  );
};