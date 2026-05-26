import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listActiveCities } from '@/modules/locations';
import { SA_REGIONS, findRegionForCity, type SaRegionId } from '@/data/sa-regions';
import { useLanguage } from '@/i18n/LanguageContext';
import { MapPin } from 'lucide-react';

/**
 * Centralized Region → City cascading selector.
 * - Fetches active cities once via shared React Query cache (`['active-cities-ref']`).
 * - Region list comes from the canonical SA_REGIONS constant.
 * - City dropdown is filtered to the selected region.
 * - Keeps city_id valid: clearing region clears city; switching region clears city if it no longer belongs.
 *
 * Used by admin business creation/edit, branch editor, and any future place that needs the same pair.
 */

export interface RegionCityValue {
  region_id: SaRegionId | '' | null;
  city_id: string | '' | null;
}

interface City {
  id: string;
  name_ar: string;
  name_en: string | null;
}

interface Props {
  value: RegionCityValue;
  onChange: (next: RegionCityValue) => void;
  /** When true, marks both fields visually as required (no enforcement). */
  required?: boolean;
  /** Optional labels override. */
  regionLabel?: string;
  cityLabel?: string;
  className?: string;
  /** Compact mode reduces label sizes. Default true. */
  compact?: boolean;
}

export const RegionCitySelector: React.FC<Props> = ({
  value, onChange, required, regionLabel, cityLabel, className = '', compact = true,
}) => {
  const { isRTL, language } = useLanguage();

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['active-cities-ref'],
    queryFn: async () => {
      const { data, error } = await listActiveCities<City>({
        select: 'id, name_ar, name_en',
        order: 'name_ar',
      });
      if (error) throw error;
      return (data ?? []) as City[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Group cities by region (memoized).
  const citiesByRegion = useMemo(() => {
    const map = new Map<SaRegionId, City[]>();
    for (const c of cities) {
      const rid = findRegionForCity(c.name_ar, c.name_en);
      if (!rid) continue;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(c);
    }
    return map;
  }, [cities]);

  const visibleCities = value.region_id ? (citiesByRegion.get(value.region_id as SaRegionId) ?? []) : [];

  const handleRegion = (rid: string) => {
    const newRid = (rid || null) as SaRegionId | null;
    const stillBelongs = !!value.city_id && (citiesByRegion.get(newRid as SaRegionId) ?? []).some((c) => c.id === value.city_id);
    onChange({ region_id: newRid, city_id: stillBelongs ? value.city_id : '' });
  };

  const handleCity = (cid: string) => onChange({ ...value, city_id: cid });

  const labelCls = compact ? 'text-xs' : 'text-sm';

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${className}`}>
      <div className="space-y-1.5">
        <Label className={`${labelCls} flex items-center gap-1.5`}>
          <MapPin className="w-3 h-3 text-muted-foreground" />
          {regionLabel ?? (isRTL ? 'المنطقة' : 'Region')}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={(value.region_id as string) || ''} onValueChange={handleRegion}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder={isRTL ? 'اختر المنطقة' : 'Select region'} />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-72">
            {SA_REGIONS.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {language === 'ar' ? r.name_ar : r.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className={`${labelCls} flex items-center gap-1.5`}>
          <MapPin className="w-3 h-3 text-muted-foreground" />
          {cityLabel ?? (isRTL ? 'المدينة' : 'City')}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={(value.city_id as string) || ''}
          onValueChange={handleCity}
          disabled={!value.region_id || isLoading}
        >
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder={
              !value.region_id
                ? (isRTL ? 'اختر المنطقة أولاً' : 'Select region first')
                : isLoading
                  ? (isRTL ? 'جارٍ التحميل…' : 'Loading…')
                  : visibleCities.length === 0
                    ? (isRTL ? 'لا توجد مدن متاحة' : 'No cities available')
                    : (isRTL ? 'اختر المدينة' : 'Select city')
            } />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-72">
            {visibleCities.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {language === 'ar' ? c.name_ar : (c.name_en || c.name_ar)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default RegionCitySelector;