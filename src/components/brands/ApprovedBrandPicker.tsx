/**
 * RFQ-BRAND-PICKER-1A — shared inline picker for approved brands.
 *
 * No popups (per UX constraint). No raw UUIDs. No pending/rejected brands.
 * Reads ONLY through brandsService → brands_public view.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { searchApprovedBrandsForPicker } from '@/modules/brands';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export type ApprovedBrandPickerProps =
  | {
      mode: 'single';
      value: string | null;
      onChange: (v: string | null) => void;
      sectorId?: string | null;
      placeholder?: string;
      disabled?: boolean;
    }
  | {
      mode: 'multi';
      value: string[];
      onChange: (v: string[]) => void;
      sectorId?: string | null;
      placeholder?: string;
      disabled?: boolean;
    };

type BrandRow = Awaited<ReturnType<typeof searchApprovedBrandsForPicker>>[number];

export const ApprovedBrandPicker: React.FC<ApprovedBrandPickerProps> = (props) => {
  const { isRTL } = useLanguage();
  const [query, setQuery] = React.useState('');
  const debounced = useDebouncedValue(query, 200);
  const [results, setResults] = React.useState<BrandRow[]>([]);
  const [selected, setSelected] = React.useState<Map<string, BrandRow>>(new Map());
  const [loading, setLoading] = React.useState(false);

  const valueIds = React.useMemo<string[]>(
    () => (props.mode === 'single' ? (props.value ? [props.value] : []) : props.value),
    [props],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchApprovedBrandsForPicker({
      sectorId: props.sectorId ?? null,
      q: debounced,
      limit: 30,
    })
      .then((rows) => {
        if (cancelled) return;
        setResults(rows);
        setSelected((prev) => {
          const next = new Map(prev);
          for (const r of rows) if (valueIds.includes(r.id)) next.set(r.id, r);
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [debounced, props.sectorId, valueIds]);

  const label = (b: BrandRow) => (isRTL ? b.name_ar : b.name_en) || b.name_ar || b.name_en || '';

  function toggle(id: string, row: BrandRow) {
    if (props.disabled) return;
    if (props.mode === 'single') {
      props.onChange(props.value === id ? null : id);
      setSelected(new Map([[id, row]]));
    } else {
      const set = new Set(props.value);
      set.has(id) ? set.delete(id) : set.add(id);
      props.onChange(Array.from(set));
      const next = new Map(selected);
      next.set(id, row);
      setSelected(next);
    }
  }

  function remove(id: string) {
    if (props.disabled) return;
    if (props.mode === 'single') props.onChange(null);
    else props.onChange(props.value.filter((x) => x !== id));
  }

  const isSelected = (id: string) => valueIds.includes(id);

  return (
    <div data-testid="approved-brand-picker" className="space-y-3">
      {/* Selected chips */}
      {valueIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {valueIds.map((id) => {
            const row = selected.get(id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 px-2 py-1">
                <Tag className="w-3 h-3" />
                <span dir="auto">{row ? label(row) : (isRTL ? 'علامة محددة' : 'Selected brand')}</span>
                {!props.disabled && (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    aria-label={isRTL ? 'إزالة' : 'Remove'}
                    className="ms-1 opacity-70 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={props.placeholder ?? (isRTL ? 'ابحث عن علامة تجارية معتمدة…' : 'Search approved brands…')}
          className="ps-9 h-12 rounded-xl"
          dir="auto"
          disabled={props.disabled}
        />
      </div>

      {/* Results */}
      <div className="border rounded-xl divide-y max-h-72 overflow-auto">
        {loading && (
          <div className="p-3 text-sm text-muted-foreground">
            {isRTL ? 'جاري التحميل…' : 'Loading…'}
          </div>
        )}
        {!loading && results.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground space-y-2">
            <p>{isRTL ? 'لا توجد علامات معتمدة مطابقة.' : 'No approved brands match.'}</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/brands">
                {isRTL ? 'اطلب إضافة علامة جديدة' : 'Request a new brand'}
              </Link>
            </Button>
          </div>
        )}
        {!loading && results.map((b) => (
          <button
            type="button"
            key={b.id}
            disabled={props.disabled}
            onClick={() => toggle(b.id, b)}
            className={`w-full text-start p-3 hover:bg-muted/50 flex items-center gap-3 ${
              isSelected(b.id) ? 'bg-muted/40' : ''
            }`}
          >
            {b.logo_url ? (
              <img src={b.logo_url} alt="" className="w-8 h-8 rounded object-contain bg-background" />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                <Tag className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" dir="auto">{label(b)}</div>
              <div className="text-xs text-muted-foreground truncate tech-content">{b.ref_id}</div>
            </div>
            {isSelected(b.id) && (
              <Badge variant="default" className="text-xs">
                {isRTL ? 'مختارة' : 'Selected'}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ApprovedBrandPicker;