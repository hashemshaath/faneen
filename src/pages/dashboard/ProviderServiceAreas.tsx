import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listOwnerBusinesses } from '@/modules/businesses';
import {
  listServiceAreasByBusiness,
  insertServiceArea,
  deleteServiceAreaById,
  clearPrimaryServiceAreasForBusiness,
  setServiceAreaPrimaryById,
} from '@/modules/catalog';
import { listActiveCities } from '@/modules/locations';
import { listDistrictsByCity } from '@/modules/addresses/services/districts';
import { SA_REGIONS, findRegionForCity, type SaRegionId } from '@/data/sa-regions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MapPin, Star, Trash2, Loader2, Building2, Globe, Map as MapIcon,
  Search, Check, Save, X, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { trackEvent } from '@/lib/analytics';
import { pingProviderActive } from '@/hooks/useProviderActivityPing';
import { usePageMeta } from '@/hooks/usePageMeta';

interface BusinessOpt { id: string; name_ar: string; }
interface AreaRow {
  id: string; business_id: string; city: string; district: string | null; is_primary: boolean;
}
interface CityRow { id: string; name_ar: string; name_en: string | null; }
interface CountryRow { id: string; code: string; name_ar: string; name_en: string; }

/**
 * Selection model — purely client-side, persisted by diff on Save.
 * Per city: 'all' = persists one row with district=null (entire city),
 *           'specific' = persists one row per selected district.
 * City absent from map = not covered. This naturally supports
 * "select all then exclude" by switching to 'specific' and unchecking.
 */
type CitySel = { mode: 'all' | 'specific'; districts: Set<string> };

const ProviderServiceAreas: React.FC = () => {
  useNoIndex();
  usePageMeta({ title: 'مناطق الخدمة | قطاعات', description: 'حدّد الدول والمناطق والمدن والأحياء التي تخدمها منشأتك.' });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeBiz, setActiveBiz] = useState<string>('');
  const [countryId, setCountryId] = useState<string>('');
  const [selectedRegions, setSelectedRegions] = useState<Set<SaRegionId>>(new Set());
  const [selection, setSelection] = useState<Map<string, CitySel>>(new Map());
  const [primaryCity, setPrimaryCity] = useState<string>('');
  const [search, setSearch] = useState('');
  const [openCity, setOpenCity] = useState<string>('');

  const { data: countries } = useQuery({
    queryKey: ['countries-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries').select('id, code, name_ar, name_en')
        .eq('is_active', true).order('name_ar');
      if (error) throw error;
      return (data ?? []) as CountryRow[];
    },
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (countries && countries.length && !countryId) setCountryId(countries[0].id);
  }, [countries, countryId]);

  const { data: businesses, isLoading: loadingBiz } = useQuery({
    queryKey: ['my-businesses', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await listOwnerBusinesses<BusinessOpt>({
        userId: user!.id,
        select: 'id, name_ar',
        orderBy: { column: 'created_at', ascending: true },
      });
      if (error) throw error;
      const list = (data ?? []) as BusinessOpt[];
      if (list.length && !activeBiz) setActiveBiz(list[0].id);
      return list;
    },
  });

  const { data: cities = [], isLoading: loadingCities } = useQuery({
    queryKey: ['active-cities-ref'],
    queryFn: async () => {
      const { data, error } = await listActiveCities<CityRow>({
        select: 'id, name_ar, name_en', order: 'name_ar',
      });
      if (error) throw error;
      return (data ?? []) as CityRow[];
    },
    staleTime: 10 * 60_000,
  });

  const { data: areas, isLoading: loadingAreas } = useQuery({
    queryKey: ['service-areas', activeBiz],
    enabled: !!activeBiz,
    queryFn: async () => {
      const { data, error } = await listServiceAreasByBusiness<AreaRow>({
        businessId: activeBiz,
        select: 'id, business_id, city, district, is_primary',
        order: [
          { column: 'is_primary', ascending: false },
          { column: 'created_at', ascending: true },
        ],
      });
      if (error) throw error;
      return (data ?? []) as AreaRow[];
    },
  });

  // Hydrate local selection from DB rows whenever areas/cities load.
  useEffect(() => {
    if (!areas || !cities.length) return;
    const next = new Map<string, CitySel>();
    for (const a of areas) {
      const cur = next.get(a.city) ?? { mode: 'all', districts: new Set<string>() };
      if (a.district) {
        cur.mode = 'specific';
        cur.districts.add(a.district);
      }
      next.set(a.city, cur);
    }
    setSelection(next);
    const primary = areas.find((a) => a.is_primary);
    setPrimaryCity(primary?.city ?? '');
    // Preselect regions for covered cities so the UI focuses there.
    const regions = new Set<SaRegionId>();
    for (const city of next.keys()) {
      const c = cities.find((x) => x.name_ar === city);
      const rid = c ? findRegionForCity(c.name_ar, c.name_en) : null;
      if (rid) regions.add(rid);
    }
    if (regions.size) setSelectedRegions(regions);
  }, [areas, cities]);

  // Cities grouped by region (memoized).
  const citiesByRegion = useMemo(() => {
    const map = new Map<SaRegionId, CityRow[]>();
    for (const c of cities) {
      const rid = findRegionForCity(c.name_ar, c.name_en);
      if (!rid) continue;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(c);
    }
    return map;
  }, [cities]);

  const visibleCities = useMemo(() => {
    const regionIds = selectedRegions.size ? Array.from(selectedRegions) : SA_REGIONS.map((r) => r.id);
    const acc: CityRow[] = [];
    for (const rid of regionIds) acc.push(...(citiesByRegion.get(rid) ?? []));
    const q = search.trim();
    return q ? acc.filter((c) => c.name_ar.includes(q) || (c.name_en ?? '').toLowerCase().includes(q.toLowerCase())) : acc;
  }, [selectedRegions, citiesByRegion, search]);

  // Lazy district loader per open city.
  const { data: districtsForOpen = [] } = useQuery({
    queryKey: ['districts-by-city', openCity],
    enabled: !!openCity,
    queryFn: async () => {
      const city = cities.find((c) => c.name_ar === openCity);
      if (!city) return [] as string[];
      const rid = findRegionForCity(city.name_ar, city.name_en);
      const region = rid ? (SA_REGIONS.find((r) => r.id === rid)?.name_ar ?? '') : '';
      const { data } = await listDistrictsByCity(region, city.name_ar);
      return (data ?? []).map((d) => d.district_ar);
    },
    staleTime: 5 * 60_000,
  });

  // ── Selection helpers ──
  const toggleRegion = (rid: SaRegionId) => {
    setSelectedRegions((prev) => {
      const n = new Set(prev); n.has(rid) ? n.delete(rid) : n.add(rid); return n;
    });
  };
  const selectAllRegions = () => setSelectedRegions(new Set(SA_REGIONS.map((r) => r.id)));
  const clearRegions = () => setSelectedRegions(new Set());

  const toggleCity = (cityName: string) => {
    setSelection((prev) => {
      const n = new Map(prev);
      if (n.has(cityName)) n.delete(cityName);
      else n.set(cityName, { mode: 'all', districts: new Set() });
      return n;
    });
  };
  const selectAllVisibleCities = () => {
    setSelection((prev) => {
      const n = new Map(prev);
      for (const c of visibleCities) if (!n.has(c.name_ar)) n.set(c.name_ar, { mode: 'all', districts: new Set() });
      return n;
    });
  };
  const clearVisibleCities = () => {
    setSelection((prev) => {
      const n = new Map(prev);
      for (const c of visibleCities) n.delete(c.name_ar);
      return n;
    });
  };
  const setCityMode = (cityName: string, mode: 'all' | 'specific') => {
    setSelection((prev) => {
      const n = new Map(prev);
      const cur = n.get(cityName) ?? { mode: 'all', districts: new Set<string>() };
      n.set(cityName, { mode, districts: mode === 'all' ? new Set() : cur.districts });
      return n;
    });
  };
  const toggleDistrict = (cityName: string, district: string) => {
    setSelection((prev) => {
      const n = new Map(prev);
      const cur = n.get(cityName) ?? { mode: 'specific', districts: new Set<string>() };
      const ds = new Set(cur.districts);
      ds.has(district) ? ds.delete(district) : ds.add(district);
      n.set(cityName, { mode: 'specific', districts: ds });
      return n;
    });
  };
  const selectAllDistrictsExcept = (cityName: string, all: string[], excluded: string[]) => {
    setSelection((prev) => {
      const n = new Map(prev);
      const ds = new Set(all.filter((d) => !excluded.includes(d)));
      n.set(cityName, { mode: 'specific', districts: ds });
      return n;
    });
  };

  // ── Save: diff selection vs existing areas ──
  const save = useMutation({
    mutationFn: async () => {
      if (!activeBiz) throw new Error('no business');
      const desired: Array<{ city: string; district: string | null }> = [];
      for (const [city, sel] of selection.entries()) {
        if (sel.mode === 'all') desired.push({ city, district: null });
        else for (const d of sel.districts) desired.push({ city, district: d });
      }
      const existing = areas ?? [];
      const keyOf = (c: string, d: string | null) => `${c}::${d ?? ''}`;
      const desiredKeys = new Set(desired.map((x) => keyOf(x.city, x.district)));
      const existingKeys = new Map(existing.map((e) => [keyOf(e.city, e.district), e]));

      const toInsert = desired.filter((d) => !existingKeys.has(keyOf(d.city, d.district)));
      const toDelete = existing.filter((e) => !desiredKeys.has(keyOf(e.city, e.district)));

      for (const row of toDelete) {
        const { error } = await deleteServiceAreaById(row.id);
        if (error) throw error;
      }
      for (const row of toInsert) {
        const { error } = await insertServiceArea({
          business_id: activeBiz,
          country_id: countryId || undefined,
          city: row.city,
          district: row.district,
          is_primary: false,
        });
        if (error) throw error;
      }
      // Apply primary (city-level)
      if (primaryCity && selection.has(primaryCity)) {
        await clearPrimaryServiceAreasForBusiness(activeBiz);
        // Find a row that matches primary city (after refetch); we re-query.
        const { data: refreshed } = await listServiceAreasByBusiness<AreaRow>({
          businessId: activeBiz,
          select: 'id, business_id, city, district, is_primary',
        });
        const cityRows = (refreshed ?? []).filter((r) => r.city === primaryCity);
        const target = cityRows.find((r) => r.district === null) ?? cityRows[0];
        if (target) await setServiceAreaPrimaryById(target.id);
      }
      return { inserted: toInsert.length, deleted: toDelete.length };
    },
    onSuccess: (r) => {
      toast.success(`تم الحفظ — أضيف ${r.inserted}، حُذف ${r.deleted}`);
      qc.invalidateQueries({ queryKey: ['service-areas', activeBiz] });
      trackEvent('provider_service_areas_saved', { business_id: activeBiz, inserted: r.inserted, deleted: r.deleted });
      void pingProviderActive(true);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : '';
      toast.error(msg.includes('duplicate') ? 'تكرار في المدن/الأحياء' : 'تعذر حفظ التغييرات');
    },
  });

  const addArea = useMutation({
    mutationFn: async () => {
      if (!activeBiz) throw new Error('no business');
      const c = city.trim();
      if (c.length < 2) throw new Error('city too short');
      // If marking primary, clear others first
      if (isPrimary) {
        await clearPrimaryServiceAreasForBusiness(activeBiz);
      }
      const { error } = await insertServiceArea({
        business_id: activeBiz,
        city: c,
        district: district.trim() || null,
        is_primary: isPrimary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تمت إضافة منطقة الخدمة');
      setCity(''); setDistrict(''); setIsPrimary(false);
      qc.invalidateQueries({ queryKey: ['service-areas', activeBiz] });
      trackEvent('provider_service_area_added', { business_id: activeBiz });
      void pingProviderActive(true);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('duplicate') || msg.includes('unique')) toast.error('هذه المنطقة مضافة مسبقًا');
      else if (msg === 'city too short') toast.error('أدخل اسم مدينة صحيح');
      else toast.error('تعذر إضافة المنطقة');
    },
  });

  const removeArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteServiceAreaById(id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف المنطقة');
      qc.invalidateQueries({ queryKey: ['service-areas', activeBiz] });
      trackEvent('provider_service_area_removed', { business_id: activeBiz });
      void pingProviderActive(true);
    },
    onError: () => toast.error('تعذر الحذف'),
  });

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      await clearPrimaryServiceAreasForBusiness(activeBiz);
      const { error } = await setServiceAreaPrimaryById(id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-areas', activeBiz] });
      void pingProviderActive(true);
    },
    onError: () => toast.error('تعذر التحديث'),
  });

  if (loadingBiz) {
    return <DashboardLayout><Skeleton className="h-40 max-w-2xl" /></DashboardLayout>;
  }

  if (!businesses || businesses.length === 0) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl"><CardContent className="py-14 text-center space-y-3">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-heading font-bold text-xl">لا توجد منشأة بعد</h1>
          <p className="text-sm text-muted-foreground">أنشئ ملف منشأتك أولًا لتتمكن من إضافة مناطق الخدمة.</p>
          <Button asChild className="min-h-[44px]"><Link to="/dashboard/business-edit">إنشاء ملف المنشأة</Link></Button>
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  // ── Derived stats ──
  const totalCities = selection.size;
  const totalDistricts = Array.from(selection.values()).reduce((sum, s) => sum + (s.mode === 'specific' ? s.districts.size : 0), 0);
  const fullCities = Array.from(selection.values()).filter((s) => s.mode === 'all').length;
  const hasChanges = (() => {
    if (!areas) return false;
    const desired: string[] = [];
    for (const [city, sel] of selection.entries()) {
      if (sel.mode === 'all') desired.push(`${city}::`);
      else for (const d of sel.districts) desired.push(`${city}::${d}`);
    }
    const existing = areas.map((a) => `${a.city}::${a.district ?? ''}`);
    if (desired.length !== existing.length) return true;
    const set = new Set(existing);
    return desired.some((k) => !set.has(k));
  })();

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> مناطق الخدمة
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              اختر الدول والمناطق والمدن والأحياء التي تغطيها منشأتك. يمكنك تحديد دولة كاملة، أو مدينة كاملة،
              أو تحديد الكل واستثناء أحياء بعينها.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">{totalCities} مدينة</Badge>
            <Badge variant="secondary" className="rounded-full">{fullCities} كاملة</Badge>
            <Badge variant="secondary" className="rounded-full">{totalDistricts} حي</Badge>
          </div>
        </header>

        {/* Business + Country pickers */}
        <Card><CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {businesses.length > 1 ? (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Building2 className="h-3 w-3" /> المنشأة</Label>
              <Select value={activeBiz} onValueChange={setActiveBiz}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Building2 className="h-3 w-3" /> المنشأة</Label>
              <div className="h-11 px-3 rounded-xl border bg-muted/30 flex items-center text-sm">{businesses[0]?.name_ar}</div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Globe className="h-3 w-3" /> الدولة</Label>
            <Select value={countryId} onValueChange={setCountryId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر الدولة" /></SelectTrigger>
              <SelectContent>
                {(countries ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent></Card>

        {/* Regions */}
        <Card><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-heading font-semibold text-base flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-primary" /> المناطق
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={selectAllRegions} className="h-8 rounded-lg">تحديد الكل</Button>
              <Button size="sm" variant="ghost" onClick={clearRegions} className="h-8 rounded-lg">مسح</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {SA_REGIONS.map((r) => {
              const active = selectedRegions.has(r.id);
              const count = (citiesByRegion.get(r.id) ?? []).length;
              return (
                <button
                  key={r.id} type="button" onClick={() => toggleRegion(r.id)}
                  className={`h-11 px-3 rounded-xl border text-sm text-start transition flex items-center justify-between gap-2 hover-lift ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted/50 border-border'
                  }`}
                >
                  <span className="truncate">{r.name_ar}</span>
                  <span className={`text-[10px] rounded-full px-1.5 ${active ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </CardContent></Card>

        {/* Cities + Districts */}
        <Card><CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-heading font-semibold text-base">المدن والأحياء</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={selectAllVisibleCities} disabled={!visibleCities.length} className="h-8 rounded-lg">
                تغطية كل المدن الظاهرة
              </Button>
              <Button size="sm" variant="ghost" onClick={clearVisibleCities} disabled={!visibleCities.length} className="h-8 rounded-lg">
                إزالة الظاهرة
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              dir="auto" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن مدينة…" className="h-11 rounded-xl ps-9"
            />
          </div>
          {selectedRegions.size === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
              <AlertCircle className="h-3.5 w-3.5" /> اختر منطقة أو أكثر لتصفية المدن، أو ابحث مباشرة.
            </div>
          )}
          {loadingCities ? (
            <Skeleton className="h-40" />
          ) : visibleCities.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">لا توجد مدن مطابقة.</div>
          ) : (
            <Accordion type="single" collapsible value={openCity} onValueChange={setOpenCity} className="border rounded-xl divide-y">
              {visibleCities.map((c) => {
                const sel = selection.get(c.name_ar);
                const isCovered = !!sel;
                const label = sel
                  ? sel.mode === 'all' ? 'كل الأحياء' : `${sel.districts.size} حي`
                  : 'غير مغطاة';
                return (
                  <AccordionItem key={c.id} value={c.name_ar} className="border-0">
                    <div className="flex items-center gap-2 px-3">
                      <Checkbox
                        checked={isCovered}
                        onCheckedChange={() => toggleCity(c.name_ar)}
                        aria-label={`تغطية ${c.name_ar}`}
                      />
                      <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                        <div className="flex items-center justify-between gap-2 flex-1 pe-2">
                          <span className="font-medium text-sm">{c.name_ar}</span>
                          <Badge variant={isCovered ? (sel?.mode === 'all' ? 'default' : 'secondary') : 'outline'} className="text-[10px] rounded-full">
                            {label}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="px-4 pb-4">
                      {!isCovered ? (
                        <p className="text-xs text-muted-foreground">حدّد المربع أعلاه لتغطية هذه المدينة.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm" variant={sel?.mode === 'all' ? 'default' : 'outline'}
                              onClick={() => setCityMode(c.name_ar, 'all')} className="h-8 rounded-lg"
                            >
                              <Check className="h-3.5 w-3.5" /> كل الأحياء
                            </Button>
                            <Button
                              size="sm" variant={sel?.mode === 'specific' ? 'default' : 'outline'}
                              onClick={() => setCityMode(c.name_ar, 'specific')} className="h-8 rounded-lg"
                            >
                              أحياء محددة
                            </Button>
                            <Button
                              size="sm" variant={primaryCity === c.name_ar ? 'default' : 'ghost'}
                              onClick={() => setPrimaryCity(primaryCity === c.name_ar ? '' : c.name_ar)}
                              className="h-8 rounded-lg ms-auto"
                            >
                              <Star className="h-3.5 w-3.5" /> {primaryCity === c.name_ar ? 'رئيسية' : 'تعيين كرئيسية'}
                            </Button>
                          </div>

                          {sel?.mode === 'specific' && (
                            <CityDistrictsPicker
                              cityName={c.name_ar}
                              all={openCity === c.name_ar ? districtsForOpen : []}
                              selected={sel.districts}
                              onToggle={(d) => toggleDistrict(c.name_ar, d)}
                              onAllExcept={(excluded) => selectAllDistrictsExcept(c.name_ar, openCity === c.name_ar ? districtsForOpen : [], excluded)}
                            />
                          )}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent></Card>

        {/* Selected summary */}
        {selection.size > 0 && (
          <Card><CardContent className="p-5 space-y-3">
            <h2 className="font-heading font-semibold text-base">المختار</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(selection.entries()).map(([city, sel]) => (
                <Badge key={city} variant="secondary" className="rounded-full pe-1 ps-3 gap-1.5">
                  <span>{city}</span>
                  <span className="text-[10px] opacity-70">
                    {sel.mode === 'all' ? 'كل الأحياء' : `${sel.districts.size} حي`}
                  </span>
                  {primaryCity === city && <Star className="h-3 w-3 text-primary" />}
                  <button onClick={() => toggleCity(city)} className="ms-1 rounded-full hover:bg-background/50 p-0.5" aria-label="إزالة">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent></Card>
        )}

        {/* Sticky save bar */}
        <div className="sticky bottom-2 z-10">
          <Card className="border-primary/30 shadow-lg">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {loadingAreas ? 'جارٍ تحميل المناطق…' : hasChanges ? 'يوجد تغييرات غير محفوظة' : 'لا توجد تغييرات'}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => { setSelection(new Map()); setPrimaryCity(''); }} className="h-10 rounded-lg" disabled={save.isPending}>
                  إعادة تعيين
                </Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending || !hasChanges} className="h-10 rounded-lg">
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ التغييرات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ── Districts sub-picker ──
interface DistrictsPickerProps {
  cityName: string;
  all: string[];
  selected: Set<string>;
  onToggle: (district: string) => void;
  onAllExcept: (excluded: string[]) => void;
}
const CityDistrictsPicker: React.FC<DistrictsPickerProps> = ({ all, selected, onToggle, onAllExcept }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => q ? all.filter((d) => d.includes(q.trim())) : all, [all, q]);
  if (!all.length) return <p className="text-xs text-muted-foreground">لا توجد بيانات أحياء لهذه المدينة بعد.</p>;
  return (
    <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
      <div className="flex items-center gap-2">
        <Input dir="auto" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن حي…" className="h-9 rounded-lg" />
        <Button size="sm" variant="outline" onClick={() => onAllExcept([])} className="h-9 rounded-lg whitespace-nowrap">
          تحديد الكل
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onAllExcept(all)} className="h-9 rounded-lg whitespace-nowrap">
          مسح
        </Button>
      </div>
      <div className="text-[11px] text-muted-foreground">
        المختار: {selected.size} / {all.length}
        {selected.size > 0 && selected.size < all.length && (
          <> · المستثنى: {all.length - selected.size}</>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto">
        {filtered.map((d) => {
          const on = selected.has(d);
          return (
            <button
              key={d} type="button" onClick={() => onToggle(d)}
              className={`h-9 px-2.5 rounded-lg border text-xs text-start truncate transition flex items-center gap-1.5 ${
                on ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-muted/50 border-border'
              }`}
            >
              {on ? <Check className="h-3 w-3 shrink-0" /> : <span className="h-3 w-3 shrink-0 rounded-sm border border-border" />}
              <span className="truncate">{d}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderServiceAreas;