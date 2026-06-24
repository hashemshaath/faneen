/**
 * Inline provider search & picker for the contract-create "Parties" step.
 * No popup/dialog — appears inline beneath the Parties panel.
 * Visible only when the second-party (account holder) needs to pick a
 * first-party (executing provider) and no project-linked provider exists.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, CheckCircle2, X, Building2, BadgeCheck, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { pickBi } from '@/components/common/Bilingual';
import {
  searchPublicProvidersByText,
  type PublicProviderSearchRow,
} from '@/modules/businesses/services/public/searchPublicProvidersByText';

export interface SelectedProviderBusiness {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  ref_id: string | null;
  username: string | null;
  logo_url: string | null;
}

export interface ContractProviderSearchPickerProps {
  isRTL: boolean;
  selected: SelectedProviderBusiness | null;
  onSelect: (provider: SelectedProviderBusiness | null) => void;
}

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const ContractProviderSearchPicker: React.FC<ContractProviderSearchPickerProps> = ({
  isRTL, selected, onSelect,
}) => {
  const [text, setText] = useState('');
  const debounced = useDebounced(text, 300);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['contract-provider-search', debounced],
    queryFn: () => searchPublicProvidersByText({ query: debounced, limit: 8 }),
    enabled: debounced.trim().length >= 2 && !selected,
    staleTime: 30_000,
  });

  const displayName = useMemo(() => {
    if (!selected) return '';
    return (isRTL ? selected.name_ar : selected.name_en) || selected.name_ar || selected.name_en || '';
  }, [selected, isRTL]);

  if (selected) {
    return (
      <div
        data-testid="contract-provider-picker-selected"
        className="p-3 rounded-xl border border-success/40 bg-success/5 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">{displayName}</div>
            {selected.ref_id && (
              <div className="text-[10px] text-muted-foreground">
                {pickBi(isRTL, 'المعرّف: ', 'Ref: ')}{selected.ref_id}
              </div>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-[11px]"
          onClick={() => onSelect(null)}
        >
          <X className="w-3.5 h-3.5" />
          {pickBi(isRTL, 'تغيير', 'Change')}
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="contract-provider-picker" className="space-y-2.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold">
        <Building2 className="w-3.5 h-3.5 text-primary" />
        {pickBi(isRTL, 'ابحث عن مزوّد الخدمة (الطرف الأول)', 'Search for the service provider (first party)')}
      </div>
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={pickBi(isRTL, 'اكتب اسم المنشأة أو المعرّف…', 'Type business name or ref…')}
          className={`${isRTL ? 'pr-8' : 'pl-8'} h-9 text-xs`}
          aria-label={pickBi(isRTL, 'بحث المزوّد', 'Provider search')}
        />
      </div>

      {isFetching && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {pickBi(isRTL, 'جاري البحث…', 'Searching…')}
        </div>
      )}

      {!isFetching && debounced.trim().length >= 2 && results.length === 0 && (
        <div className="text-[11px] text-muted-foreground p-2.5 rounded-lg border border-dashed border-border/60 text-center">
          {pickBi(isRTL, 'لا توجد نتائج مطابقة. جرّب اسمًا آخر أو المعرّف.', 'No matches. Try another name or the ref code.')}
        </div>
      )}

      {!isFetching && debounced.trim().length < 2 && (
        <div className="text-[10px] text-muted-foreground">
          {pickBi(isRTL, 'اكتب حرفين على الأقل لبدء البحث.', 'Type at least 2 characters to search.')}
        </div>
      )}

      {results.length > 0 && (
        <ul className="space-y-1.5" role="listbox" aria-label={pickBi(isRTL, 'نتائج البحث', 'Search results')}>
          {results.map((row: PublicProviderSearchRow) => {
            const name = (isRTL ? row.name_ar : row.name_en) || row.name_ar || row.name_en || row.username || row.ref_id || '—';
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect({
                    id: row.id,
                    name_ar: row.name_ar,
                    name_en: row.name_en,
                    ref_id: row.ref_id,
                    username: row.username,
                    logo_url: row.logo_url,
                  })}
                  className="w-full text-start p-2.5 rounded-lg border border-border/50 bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {row.logo_url
                      ? <img src={row.logo_url} alt="" className="w-full h-full object-cover" />
                      : <Building2 className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate">{name}</span>
                      {row.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {row.ref_id && <span>{row.ref_id}</span>}
                      {typeof row.rating_avg === 'number' && row.rating_avg > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-accent text-accent" />
                          {row.rating_avg.toFixed(1)}
                          {row.rating_count ? <span className="opacity-60">({row.rating_count})</span> : null}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[9px] h-5">
                    {pickBi(isRTL, 'اختيار', 'Select')}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ContractProviderSearchPicker;