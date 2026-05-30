/**
 * ADDRESS-GOVERNANCE-1 — Unified National Address form (UI primitive).
 *
 * One controlled component used by profile + business + branch screens to
 * collect a Saudi National Address with:
 *   • Short national address + SPL lookup (auto-fill)
 *   • Cascading Region → City → District (typeable / searchable)
 *   • Street, Building, Additional, Postal
 *   • Auto-generated detailed line (manual override supported)
 *
 * The component is presentation-only — it does NOT call the database.
 * Persistence is the caller's job (must go through `upsertPrimaryAddress`).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPinned, Search, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import {
  SA_REGIONS, findRegionByLabel, findRegionForCity, getRegionById,
  type SaRegionId,
} from '@/data/sa-regions';
import { listActiveCities } from '@/modules/locations/services/listActiveCities';
import { nationalAddressLookup } from '@/modules/locations';
import { searchDistricts, type DistrictRow } from '@/modules/addresses/services/districts';
import { buildAddressLine } from '@/modules/addresses/helpers/buildAddressLine';

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

/** Shape this form reads/writes. Mirrors `AddressFields` (subset used by UI). */
export interface NationalAddressValue {
  short_address: string | null;
  region: string | null;
  region_en: string | null;
  city_id: string | null;
  district: string | null;
  district_en: string | null;
  street_name: string | null;
  street_name_en: string | null;
  building_number: string | null;
  additional_number: string | null;
  post_code: string | null;
  address: string | null;
  address_en: string | null;
  /** Whether the detailed address line was edited manually / pulled from SPL. */
  address_manual?: boolean;
}

export interface NationalAddressFormProps {
  value: NationalAddressValue;
  onChange: (next: NationalAddressValue) => void;
  isRTL: boolean;
  /** Show building / additional / postal inputs. Defaults to true. */
  showStructured?: boolean;
  className?: string;
}

interface CityRow { id: string; name_ar: string; name_en: string }

export const NationalAddressForm: React.FC<NationalAddressFormProps> = ({
  value, onChange, isRTL, showStructured = true, className,
}) => {
  const [splLoading, setSplLoading] = useState(false);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [regionId, setRegionId] = useState<SaRegionId | ''>('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [districtOpts, setDistrictOpts] = useState<DistrictRow[]>([]);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const districtBlurTimer = useRef<number | null>(null);

  const patch = (p: Partial<NationalAddressValue>) => onChange({ ...value, ...p });

  // Load cities once.
  useEffect(() => {
    (async () => {
      const { data } = await listActiveCities<CityRow>({});
      if (data) setCities(data);
    })();
  }, []);

  // Infer region from stored label on first load.
  useEffect(() => {
    if (regionId) return;
    const inferred = findRegionByLabel(value.region) ?? findRegionByLabel(value.region_en);
    if (inferred) { setRegionId(inferred); return; }
    if (value.city_id) {
      const c = cities.find((x) => x.id === value.city_id);
      if (c) {
        const r = findRegionForCity(c.name_ar, c.name_en);
        if (r) setRegionId(r);
      }
    }
  }, [value.region, value.region_en, value.city_id, cities, regionId]);

  // Cities belonging to the picked region.
  const filteredCities = useMemo(() => {
    if (!regionId) return cities;
    const list = cities.filter((c) => findRegionForCity(c.name_ar, c.name_en) === regionId);
    return list.length > 0 ? list : cities;
  }, [cities, regionId]);

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === value.city_id) ?? null,
    [cities, value.city_id],
  );

  // Debounced district search.
  useEffect(() => {
    if (!showDistrictDropdown) return;
    let cancelled = false;
    setDistrictLoading(true);
    const h = window.setTimeout(async () => {
      const region = getRegionById(regionId)?.name_ar ?? value.region ?? '';
      const city = selectedCity?.name_ar ?? '';
      const { data } = await searchDistricts(districtQuery, {
        region: region || undefined,
        city: city || undefined,
      });
      if (!cancelled) {
        setDistrictOpts(data);
        setDistrictLoading(false);
      }
    }, 220);
    return () => { cancelled = true; window.clearTimeout(h); };
  }, [districtQuery, regionId, selectedCity, value.region, showDistrictDropdown]);

  // Auto-compose the detailed line unless the user is editing it manually.
  useEffect(() => {
    if (value.address_manual) return;
    const base = {
      region: value.region, region_en: value.region_en,
      district: value.district, district_en: value.district_en,
      street_name: value.street_name, street_name_en: value.street_name_en,
      building_number: value.building_number,
      additional_number: value.additional_number, post_code: value.post_code,
    };
    const composedAr = buildAddressLine(base, 'ar');
    const composedEn = buildAddressLine(base, 'en');
    if (composedAr !== (value.address ?? '') || composedEn !== (value.address_en ?? '')) {
      onChange({
        ...value,
        address: composedAr || null,
        address_en: composedEn || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    value.address_manual, isRTL,
    value.region, value.region_en,
    value.district, value.district_en,
    value.street_name, value.street_name_en,
    value.building_number, value.additional_number, value.post_code,
  ]);

  // ── SPL lookup ──────────────────────────────────────────────────────────
  const lookupShortAddress = async () => {
    const code = (value.short_address ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z]{4}\d{4}$/.test(code)) {
      toast.error(t(isRTL,
        'أدخل رقم العنوان الوطني (4 أحرف + 4 أرقام)',
        'Enter a short national address (4 letters + 4 digits)'));
      return;
    }
    setSplLoading(true);
    try {
      const { data, error } = await nationalAddressLookup({ shortAddress: code });
      if (error) throw error;
      const res = data as {
        ok: boolean; message_ar?: string; message_en?: string;
        address?: {
          region_ar?: string | null; region_en?: string | null;
          city_ar?: string | null; city_en?: string | null;
          district_ar?: string | null; district_en?: string | null;
          street_ar?: string | null; street_en?: string | null;
          address_ar?: string | null; address_en?: string | null;
          building_number?: string | null; additional_number?: string | null;
          post_code?: string | null;
        };
      };
      if (!res?.ok || !res.address) {
        toast.error(isRTL ? (res?.message_ar ?? 'تعذّر العثور على العنوان') : (res?.message_en ?? 'Address not found'));
        return;
      }
      const a = res.address;
      // Try to map city by name.
      const matchedCity = cities.find((c) =>
        (a.city_ar && c.name_ar?.trim() === a.city_ar.trim())
        || (a.city_en && c.name_en?.trim().toLowerCase() === a.city_en.trim().toLowerCase()),
      );
      const inferredRegion = findRegionByLabel(a.region_ar) ?? findRegionByLabel(a.region_en);
      if (inferredRegion) setRegionId(inferredRegion);
      onChange({
        ...value,
        short_address: code,
        region: a.region_ar ?? value.region,
        region_en: a.region_en ?? value.region_en,
        city_id: matchedCity?.id ?? value.city_id,
        district: a.district_ar ?? value.district,
        district_en: a.district_en ?? value.district_en,
        street_name: a.street_ar ?? value.street_name,
        street_name_en: a.street_en ?? value.street_name_en,
        building_number: a.building_number ?? value.building_number,
        additional_number: a.additional_number ?? value.additional_number,
        post_code: a.post_code ?? value.post_code,
        address: (isRTL ? a.address_ar : a.address_en) ?? a.address_ar ?? a.address_en ?? value.address,
        address_en: a.address_en ?? a.address_ar ?? value.address_en,
        address_manual: true, // keep SPL's official text
      });
      toast.success(t(isRTL, 'تم تعبئة العنوان', 'Address filled in'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSplLoading(false);
    }
  };

  const onRegionChange = (id: string) => {
    const r = getRegionById(id || null);
    setRegionId((id as SaRegionId) || '');
    patch({
      region: r?.name_ar ?? null,
      region_en: r?.name_en ?? null,
      // reset city if it no longer belongs to the new region
      city_id: value.city_id && r
        && findRegionForCity(
          cities.find((c) => c.id === value.city_id)?.name_ar,
          cities.find((c) => c.id === value.city_id)?.name_en,
        ) !== r.id ? null : value.city_id,
    });
  };

  const onCityChange = (id: string) => {
    patch({ city_id: id || null, district: null, district_en: null });
    setDistrictQuery('');
  };

  const onDistrictPick = (d: DistrictRow) => {
    patch({ district: d.district_ar, district_en: d.district_en ?? null });
    setDistrictQuery(d.district_ar);
    setShowDistrictDropdown(false);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <header className="flex items-center gap-2">
        <MapPinned className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold">{t(isRTL, 'العنوان الوطني', 'National address')}</h2>
      </header>

      {/* SPL short address + Lookup */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground">
          {t(isRTL, 'رقم العنوان الوطني المختصر', 'Short national address')}
        </Label>
        <div className="mt-1 flex gap-2">
          <Input
            value={value.short_address ?? ''}
            onChange={(e) =>
              patch({ short_address: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) })
            }
            dir="ltr"
            className="h-11 rounded-xl tech-content uppercase"
            placeholder="RRRD2402"
            maxLength={8}
          />
          <Button
            type="button"
            variant="outline"
            onClick={lookupShortAddress}
            disabled={splLoading}
            title={t(isRTL, 'اختياري — لتعبئة الحقول تلقائياً', 'Optional — to auto-fill the fields')}
            className="h-11 rounded-xl gap-1.5 shrink-0"
          >
            {splLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t(isRTL, 'استدعاء (اختياري)', 'Lookup (optional)')}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {t(isRTL,
            'يمكنك إدخاله وحفظه يدوياً، أو الضغط على "استدعاء" لتعبئة المنطقة والمدينة والحي تلقائياً (اختياري).',
            'You can type and save it manually, or click "Lookup" to auto-fill region, city and district (optional).')}
        </p>
      </div>

      {/* Cascading Region → City → District */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Region */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'المنطقة', 'Region')}</Label>
          <Select value={regionId} onValueChange={onRegionChange}>
            <SelectTrigger className="mt-1 h-11 rounded-xl">
              <SelectValue placeholder={t(isRTL, 'اختر المنطقة', 'Select region')} />
            </SelectTrigger>
            <SelectContent>
              {SA_REGIONS.map((r) => (
                <SelectItem key={r.id} value={r.id}>{isRTL ? r.name_ar : r.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'المدينة', 'City')}</Label>
          <Select value={value.city_id ?? ''} onValueChange={onCityChange} disabled={filteredCities.length === 0}>
            <SelectTrigger className="mt-1 h-11 rounded-xl">
              <SelectValue placeholder={t(isRTL, 'اختر المدينة', 'Select city')} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {filteredCities.map((c) => (
                <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* District (search-as-you-type) */}
        <div className="relative">
          <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
            {t(isRTL, 'الحي', 'District')}
            <ChevronsUpDown className="w-3 h-3 opacity-60" />
          </Label>
          <Input
            value={districtQuery || value.district || ''}
            onChange={(e) => {
              setDistrictQuery(e.target.value);
              patch({ district: e.target.value || null });
              setShowDistrictDropdown(true);
            }}
            onFocus={() => setShowDistrictDropdown(true)}
            onBlur={() => {
              if (districtBlurTimer.current) window.clearTimeout(districtBlurTimer.current);
              districtBlurTimer.current = window.setTimeout(() => setShowDistrictDropdown(false), 180);
            }}
            dir="auto"
            className="mt-1 h-11 rounded-xl"
            placeholder={t(isRTL, 'اكتب للبحث أو اكتب يدويًا', 'Type to search or enter manually')}
            maxLength={120}
          />
          {showDistrictDropdown && (districtOpts.length > 0 || districtLoading) && (
            <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-border bg-popover shadow-lg">
              {districtLoading && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> {t(isRTL, 'جاري البحث...', 'Searching...')}
                </div>
              )}
              {!districtLoading && districtOpts.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onDistrictPick(d)}
                  className="block w-full text-start px-3 py-2 text-xs hover:bg-accent"
                >
                  <div className="font-medium">{isRTL ? d.district_ar : (d.district_en ?? d.district_ar)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(isRTL ? (d.city_ar ?? d.city) : (d.city_en ?? d.city))} — {(isRTL ? (d.region_ar ?? d.region) : (d.region_en ?? d.region))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Street + structured */}
      {showStructured && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3 grid sm:grid-cols-2 gap-3">
            <div>
            <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'الشارع (عربي)', 'Street (Arabic)')}</Label>
            <Input
              value={value.street_name ?? ''}
              onChange={(e) => patch({ street_name: e.target.value || null })}
              dir="rtl"
              className="mt-1 h-11 rounded-xl"
              maxLength={160}
            />
            </div>
            <div>
            <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'الشارع (إنجليزي)', 'Street (English)')}</Label>
            <Input
              value={value.street_name_en ?? ''}
              onChange={(e) => patch({ street_name_en: e.target.value || null })}
              dir="ltr"
              className="mt-1 h-11 rounded-xl"
              maxLength={160}
            />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'رقم المبنى', 'Building number')}</Label>
            <Input
              value={value.building_number ?? ''}
              onChange={(e) => patch({ building_number: e.target.value.replace(/\D/g, '').slice(0, 6) || null })}
              dir="ltr"
              inputMode="numeric"
              className="mt-1 h-11 rounded-xl tech-content"
              maxLength={6}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'الرقم الإضافي', 'Additional number')}</Label>
            <Input
              value={value.additional_number ?? ''}
              onChange={(e) => patch({ additional_number: e.target.value.replace(/\D/g, '').slice(0, 4) || null })}
              dir="ltr"
              inputMode="numeric"
              className="mt-1 h-11 rounded-xl tech-content"
              maxLength={4}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'الرمز البريدي', 'Postal code')}</Label>
            <Input
              value={value.post_code ?? ''}
              onChange={(e) => patch({ post_code: e.target.value.replace(/\D/g, '').slice(0, 5) || null })}
              dir="ltr"
              inputMode="numeric"
              className="mt-1 h-11 rounded-xl tech-content"
              maxLength={5}
            />
          </div>
        </div>
      )}

      {/* Auto-generated detailed line */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-medium text-muted-foreground">
            {t(isRTL, 'العنوان التفصيلي (عربي وإنجليزي)', 'Detailed address (Arabic & English)')}
          </Label>
          {value.address_manual && (
            <button
              type="button"
              onClick={() => patch({ address_manual: false })}
              className="text-[10px] text-primary hover:underline"
            >
              {t(isRTL, 'إعادة التوليد تلقائيًا', 'Auto-generate again')}
            </button>
          )}
        </div>
        <div className="mt-1 grid sm:grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground">{t(isRTL, 'عربي', 'Arabic')}</span>
            <Input
              value={value.address ?? ''}
              onChange={(e) => onChange({ ...value, address: e.target.value, address_manual: true })}
              dir="rtl"
              className="h-11 rounded-xl"
              placeholder={t(isRTL, 'يتم توليده تلقائيًا', 'Auto-generated')}
              maxLength={250}
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">{t(isRTL, 'إنجليزي', 'English')}</span>
            <Input
              value={value.address_en ?? ''}
              onChange={(e) => onChange({ ...value, address_en: e.target.value, address_manual: true })}
              dir="ltr"
              className="h-11 rounded-xl"
              placeholder={t(isRTL, 'Auto-generated', 'Auto-generated')}
              maxLength={250}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {value.address_manual
            ? t(isRTL, 'يدوي — لن يتم استبداله. اضغط "إعادة التوليد" لإرجاعه إلى التوليد التلقائي.',
                 'Manual — won\'t be overwritten. Click "Auto-generate" to revert.')
            : t(isRTL, 'يُحدَّث تلقائيًا عند تغيير أي حقل من حقول العنوان أعلاه.',
                 'Updates automatically when any address field above changes.')}
        </p>
      </div>
    </div>
  );
};

export default NationalAddressForm;