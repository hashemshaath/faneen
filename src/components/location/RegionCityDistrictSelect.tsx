/**
 * Q3-UI — shared cascading DB-backed region → city → district selector.
 *
 * Loads reference data from `saudi_regions`, `cities`, `districts` via
 * React Query. First-segments used here are added to the persist allowlist
 * in src/lib/queryPersist.ts (`saudi-regions-public`,
 * `cities-by-region-public`, `districts-by-city-public`).
 *
 * RTL-first, Arabic labels by default. Consumers control required-ness.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export interface RegionCityDistrictValue {
  regionId: string | null;
  cityId: string | null;
  districtId: string | null;
}

export interface ResolvedLocationText {
  regionText: string;
  cityText: string;
  districtText: string;
}

export interface RegionCityDistrictSelectProps {
  value: RegionCityDistrictValue;
  onChange: (
    value: RegionCityDistrictValue,
    resolved: ResolvedLocationText,
  ) => void;
  requiredRegion?: boolean;
  requiredCity?: boolean;
  disabled?: boolean;
}

interface RegionRow { id: string; name_ar: string; name_en: string; sort_order: number }
interface CityRow   { id: string; name_ar: string; name_en: string; region_id: string | null }
interface DistrictRow { id: string; district_ar: string; district_en: string | null; city_id: string | null }

const REGIONS_KEY   = ['saudi-regions-public'] as const;
const CITIES_KEY    = (regionId: string) => ['cities-by-region-public', regionId] as const;
const DISTRICTS_KEY = (cityId: string) => ['districts-by-city-public', cityId] as const;

function useRegions() {
  return useQuery<RegionRow[]>({
    queryKey: [...REGIONS_KEY],
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saudi_regions')
        .select('id, name_ar, name_en, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RegionRow[];
    },
  });
}

function useCitiesByRegion(regionId: string | null) {
  return useQuery<CityRow[]>({
    queryKey: regionId ? CITIES_KEY(regionId) : ['cities-by-region-public', 'none'],
    enabled: !!regionId,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name_ar, name_en, region_id')
        .eq('is_active', true)
        .eq('region_id', regionId!)
        .order('name_ar', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CityRow[];
    },
  });
}

function useDistrictsByCity(cityId: string | null) {
  return useQuery<DistrictRow[]>({
    queryKey: cityId ? DISTRICTS_KEY(cityId) : ['districts-by-city-public', 'none'],
    enabled: !!cityId,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('districts')
        .select('id, district_ar, district_en, city_id')
        .eq('is_active', true)
        .eq('city_id', cityId!)
        .order('district_ar', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DistrictRow[];
    },
  });
}

interface ComboOption { id: string; label: string }

const SearchCombobox: React.FC<{
  options: ComboOption[];
  value: string | null;
  onSelect: (id: string, label: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  loading?: boolean;
  id?: string;
}> = ({ options, value, onSelect, placeholder, searchPlaceholder, emptyText, disabled, loading, id }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'w-full h-12 justify-between font-normal',
            !selected && 'text-muted-foreground',
          )}
        >
          <span className="truncate">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
              </span>
            ) : selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-[--radix-popover-trigger-width]">
        <Command>
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="w-4 h-4 text-muted-foreground" />
            <CommandInput placeholder={searchPlaceholder} className="h-9 border-0 focus:ring-0" />
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.label} ${o.id}`}
                  onSelect={() => {
                    onSelect(o.id, o.label);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('w-4 h-4 me-2', value === o.id ? 'opacity-100' : 'opacity-0')} />
                  <span dir="auto">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const RegionCityDistrictSelect: React.FC<RegionCityDistrictSelectProps> = ({
  value, onChange, requiredRegion, requiredCity, disabled,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const regionsQ   = useRegions();
  const citiesQ    = useCitiesByRegion(value.regionId);
  const districtsQ = useDistrictsByCity(value.cityId);

  const regions   = regionsQ.data ?? [];
  const cities    = citiesQ.data ?? [];
  const districts = districtsQ.data ?? [];

  const regionLabel = (r: RegionRow) => isAr ? r.name_ar : (r.name_en || r.name_ar);
  const cityLabel   = (c: CityRow)   => isAr ? c.name_ar : (c.name_en || c.name_ar);
  const districtLabel = (d: DistrictRow) => isAr ? d.district_ar : (d.district_en || d.district_ar);

  const selectedRegion   = regions.find((r) => r.id === value.regionId) ?? null;
  const selectedCity     = cities.find((c) => c.id === value.cityId) ?? null;
  const selectedDistrict = districts.find((d) => d.id === value.districtId) ?? null;

  const emit = (next: RegionCityDistrictValue) => {
    const region = regions.find((r) => r.id === next.regionId) ?? null;
    const city   = cities.find((c) => c.id === next.cityId) ?? null;
    // if we changed city, districts list must be fetched fresh; resolve label from current list only if match
    const district = districts.find((d) => d.id === next.districtId) ?? null;
    onChange(next, {
      regionText: region ? regionLabel(region) : '',
      cityText: city ? cityLabel(city) : '',
      districtText: district ? districtLabel(district) : '',
    });
  };

  const cityOptions: ComboOption[] = useMemo(
    () => cities.map((c) => ({ id: c.id, label: cityLabel(c) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cities, isAr],
  );
  const districtOptions: ComboOption[] = useMemo(
    () => districts.map((d) => ({ id: d.id, label: districtLabel(d) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [districts, isAr],
  );

  return (
    <div className="space-y-4" data-testid="region-city-district-select">
      {/* Region — chips (13 regions fits comfortably) */}
      <div>
        <Label>
          المنطقة {requiredRegion && <span className="text-destructive">*</span>}
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {regionsQ.isLoading && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> جارٍ التحميل…
            </span>
          )}
          {regions.map((r) => {
            const active = value.regionId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => {
                  if (active) return;
                  emit({ regionId: r.id, cityId: null, districtId: null });
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground/80 border-border hover:border-primary/40 hover:text-primary',
                )}
              >
                {regionLabel(r)}
              </button>
            );
          })}
        </div>
      </div>

      {/* City — searchable combobox */}
      <div>
        <Label htmlFor="rcd-city">
          المدينة {requiredCity && <span className="text-destructive">*</span>}
        </Label>
        <div className="mt-2">
          <SearchCombobox
            id="rcd-city"
            options={cityOptions}
            value={value.cityId}
            onSelect={(cityId) => emit({ regionId: value.regionId, cityId, districtId: null })}
            placeholder={selectedRegion ? 'اختر المدينة' : 'اختر المنطقة أولًا'}
            searchPlaceholder="ابحث عن مدينة…"
            emptyText="لا توجد نتائج"
            disabled={disabled || !selectedRegion}
            loading={citiesQ.isLoading && !!selectedRegion}
          />
        </div>
      </div>

      {/* District — only when districts exist */}
      {selectedCity && (districtsQ.isLoading || districts.length > 0) && (
        <div>
          <Label htmlFor="rcd-district">الحي (اختياري)</Label>
          <div className="mt-2">
            <SearchCombobox
              id="rcd-district"
              options={districtOptions}
              value={value.districtId}
              onSelect={(districtId) =>
                emit({ regionId: value.regionId, cityId: value.cityId, districtId })
              }
              placeholder="اختر الحي"
              searchPlaceholder="ابحث عن حي…"
              emptyText="لا توجد أحياء"
              disabled={disabled}
              loading={districtsQ.isLoading}
            />
          </div>
          {value.districtId && (
            <button
              type="button"
              onClick={() =>
                emit({ regionId: value.regionId, cityId: value.cityId, districtId: null })
              }
              className="mt-1 text-[11px] text-muted-foreground hover:text-foreground underline"
            >
              إزالة الحي
            </button>
          )}
        </div>
      )}

      {/* Keep selected refs alive for parents even if lists reload */}
      <span className="sr-only" aria-hidden="true">
        {selectedRegion?.id} {selectedCity?.id} {selectedDistrict?.id}
      </span>
    </div>
  );
};

export default RegionCityDistrictSelect;