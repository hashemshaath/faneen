/**
 * Q2-UI — Provider Service Coverage (مناطق التغطية).
 *
 * Q3-aware coverage editor. Persists into public.business_service_areas
 * using the id columns (region_id, city_id, district_ids uuid[]) and
 * dual-writes the legacy text columns (city, district) from the resolved
 * Arabic names so the older matching/read paths keep working.
 *
 * Coverage semantics:
 *   - district_ids = []            → covers entire city (default).
 *   - district_ids = [uuid,...]    → covers only those districts.
 * Uniqueness (Q3 index idx_bsa_unique_coverage): one row per
 *   (business, branch_or_null, city). We enforce this client-side too
 *   to give an Arabic error before hitting the DB.
 *
 * Access: requireProvider guard on the route; RLS allows owner + active
 * business staff + admin (see 20260712185609 migration).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  MapPin, MapPinned, Plus, X, Trash2, Building2, Loader2, Search, Check,
  AlertCircle, Globe2, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import RegionCityDistrictSelect, {
  type RegionCityDistrictValue,
  type ResolvedLocationText,
} from '@/components/location/RegionCityDistrictSelect';
import { cn } from '@/lib/utils';

type Nullable<T> = T | null;

interface CoverageRow {
  id: string;
  business_id: string;
  branch_id: Nullable<string>;
  region_id: Nullable<string>;
  city_id: Nullable<string>;
  district_ids: string[];
  city: string;
  district: Nullable<string>;
}
interface BranchRow { id: string; name_ar: Nullable<string>; name_en: Nullable<string>; }
interface CityRefRow { id: string; name_ar: string; name_en: Nullable<string>; region_id: Nullable<string> }
interface RegionRefRow { id: string; name_ar: string; name_en: Nullable<string> }
interface DistrictRefRow { id: string; district_ar: string; district_en: Nullable<string>; city_id: Nullable<string> }

const EMPTY_RCD: RegionCityDistrictValue = { regionId: null, cityId: null, districtId: null };

const DashboardBusinessCoverage: React.FC = () => {
  useNoIndex();
  usePageMeta({
    title: 'مناطق التغطية | قطاعات',
    description: 'حدد المدن والأحياء التي تغطيها منشأتك ليصلك طلبات عروض الأسعار من عملاء تلك المناطق مباشرة.',
  });
  const { user } = useAuth();
  const workspace = useActiveWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const businessId = workspace.active_entity_id;

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <MapPinned className="w-5 h-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-heading font-bold">مناطق التغطية</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          حدّد المناطق والمدن والأحياء التي تغطيها منشأتك. ستصلك طلبات عروض الأسعار من العملاء داخل هذه المناطق تلقائيًا.
        </p>
      </header>

      {workspace.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {!workspace.isLoading && !businessId && (
        <Card><CardContent className="py-14 text-center space-y-3">
          <Building2 className="mx-auto w-10 h-10 text-muted-foreground" />
          <h2 className="font-heading font-semibold text-lg">لا توجد منشأة نشطة</h2>
          <p className="text-sm text-muted-foreground">أنشئ ملف منشأتك أولًا لتتمكن من تحديد مناطق التغطية.</p>
          <Button onClick={() => navigate('/dashboard/business-edit')}>الذهاب إلى بيانات المنشأة</Button>
        </CardContent></Card>
      )}

      {businessId && (
        <CoverageBody
          businessId={businessId}
          userId={user?.id ?? ''}
          adding={adding}
          setAdding={setAdding}
          editingId={editingId}
          setEditingId={setEditingId}
          qc={qc}
        />
      )}
    </div>
  );
};

interface BodyProps {
  businessId: string;
  userId: string;
  adding: boolean;
  setAdding: (v: boolean) => void;
  editingId: string | null;
  setEditingId: (v: string | null) => void;
  qc: ReturnType<typeof useQueryClient>;
}

const CoverageBody: React.FC<BodyProps> = ({ businessId, userId, adding, setAdding, editingId, setEditingId, qc }) => {
  const coverageQ = useQuery<CoverageRow[]>({
    queryKey: ['coverage-areas', userId, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_service_areas')
        .select('id, business_id, branch_id, region_id, city_id, district_ids, city, district')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CoverageRow[];
    },
  });

  const branchesQ = useQuery<BranchRow[]>({
    queryKey: ['coverage-branches', userId, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_branches')
        .select('id, name_ar, name_en')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name_ar', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BranchRow[];
    },
  });

  const rows = coverageQ.data ?? [];
  const branches = branchesQ.data ?? [];

  const groups = useMemo(() => {
    const m = new Map<string | null, CoverageRow[]>();
    for (const r of rows) {
      const key = r.branch_id ?? null;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return Array.from(m.entries());
  }, [rows]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_service_areas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف منطقة التغطية');
      qc.invalidateQueries({ queryKey: ['coverage-areas', userId, businessId] });
    },
    onError: () => toast.error('تعذر الحذف'),
  });

  const handleDelete = (id: string) => {
    if (!window.confirm('هل تريد حذف منطقة التغطية هذه؟')) return;
    deleteMut.mutate(id);
  };

  const branchName = (id: string | null): string => {
    if (!id) return 'كل الفروع';
    const b = branches.find((x) => x.id === id);
    return b?.name_ar || b?.name_en || 'فرع';
  };

  if (coverageQ.isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  const isEmpty = rows.length === 0 && !adding;

  return (
    <div className="space-y-5">
      {isEmpty && (
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="w-4 h-4 text-primary" />
          <AlertTitle className="font-semibold">ابدأ بتحديد مناطق تغطيتك</AlertTitle>
          <AlertDescription className="text-sm">
            حدد المناطق التي تغطيها لتصلك طلبات عروض الأسعار من عملاء هذه المناطق مباشرة.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          <Badge variant="secondary" className="rounded-full">{rows.length} منطقة</Badge>
        </div>
        {!adding && (
          <Button onClick={() => { setEditingId(null); setAdding(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> إضافة منطقة تغطية
          </Button>
        )}
      </div>

      {adding && (
        <CoverageEditor
          businessId={businessId}
          userId={userId}
          branches={branches}
          existing={rows}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ['coverage-areas', userId, businessId] });
          }}
        />
      )}

      {groups.map(([branchId, list]) => (
        <Card key={branchId ?? 'all'} className="overflow-hidden">
          <CardContent className="p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-semibold text-base">{branchName(branchId)}</h3>
              <Badge variant="outline" className="rounded-full text-[11px]">{list.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {list.map((r) => (
                <div key={r.id} className="rounded-xl border bg-card p-3 space-y-2">
                  {editingId === r.id ? (
                    <CoverageEditor
                      businessId={businessId}
                      userId={userId}
                      branches={branches}
                      existing={rows}
                      row={r}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        qc.invalidateQueries({ queryKey: ['coverage-areas', userId, businessId] });
                      }}
                    />
                  ) : (
                    <CoverageRowView
                      row={r}
                      onEdit={() => setEditingId(r.id)}
                      onDelete={() => handleDelete(r.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const CoverageRowView: React.FC<{
  row: CoverageRow;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ row, onEdit, onDelete }) => {
  const cityLabel = row.city || '—';
  const districtsCount = row.district_ids?.length ?? 0;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">{cityLabel}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {districtsCount === 0
            ? (<span className="inline-flex items-center gap-1"><Globe2 className="w-3 h-3" /> يغطي كامل المدينة</span>)
            : (<span>{districtsCount} حي محدد</span>)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 px-2">تعديل</Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="h-8 px-2 text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

interface EditorProps {
  businessId: string;
  userId: string;
  branches: BranchRow[];
  existing: CoverageRow[];
  row?: CoverageRow;
  onCancel: () => void;
  onSaved: () => void;
}

const CoverageEditor: React.FC<EditorProps> = ({ businessId, userId, branches, existing, row, onCancel, onSaved }) => {
  const qc = useQueryClient();
  const isEdit = !!row;
  const [rcd, setRcd] = useState<RegionCityDistrictValue>(() =>
    row ? { regionId: row.region_id, cityId: row.city_id, districtId: null } : EMPTY_RCD,
  );
  const [resolved, setResolved] = useState<ResolvedLocationText>({ regionText: '', cityText: '', districtText: '' });
  const [mode, setMode] = useState<'all' | 'specific'>(row && row.district_ids.length > 0 ? 'specific' : 'all');
  const [districtIds, setDistrictIds] = useState<Set<string>>(new Set(row?.district_ids ?? []));
  const [branchId, setBranchId] = useState<string | null>(row?.branch_id ?? null);
  const [searchDist, setSearchDist] = useState('');

  // Hydrate resolved city name for existing row on first render (labels come from lookups).
  const cityMetaQ = useQuery<CityRefRow | null>({
    queryKey: ['coverage-city-meta', userId, rcd.cityId],
    enabled: !!rcd.cityId && !resolved.cityText,
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name_ar, name_en, region_id').eq('id', rcd.cityId!).maybeSingle();
      return (data ?? null) as CityRefRow | null;
    },
  });
  const regionMetaQ = useQuery<RegionRefRow | null>({
    queryKey: ['coverage-region-meta', userId, rcd.regionId],
    enabled: !!rcd.regionId && !resolved.regionText,
    queryFn: async () => {
      const { data } = await supabase.from('saudi_regions').select('id, name_ar, name_en').eq('id', rcd.regionId!).maybeSingle();
      return (data ?? null) as RegionRefRow | null;
    },
  });
  React.useEffect(() => {
    if (cityMetaQ.data && !resolved.cityText) {
      setResolved((r) => ({ ...r, cityText: cityMetaQ.data!.name_ar }));
    }
    if (regionMetaQ.data && !resolved.regionText) {
      setResolved((r) => ({ ...r, regionText: regionMetaQ.data!.name_ar }));
    }
  }, [cityMetaQ.data, regionMetaQ.data, resolved.cityText, resolved.regionText]);

  const districtsQ = useQuery<DistrictRefRow[]>({
    queryKey: ['coverage-districts-for-city', userId, rcd.cityId],
    enabled: !!rcd.cityId,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('districts')
        .select('id, district_ar, district_en, city_id')
        .eq('is_active', true)
        .eq('city_id', rcd.cityId!)
        .order('district_ar', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DistrictRefRow[];
    },
  });

  const filteredDistricts = useMemo(() => {
    const q = searchDist.trim();
    const list = districtsQ.data ?? [];
    if (!q) return list;
    return list.filter((d) => d.district_ar.includes(q) || (d.district_en ?? '').toLowerCase().includes(q.toLowerCase()));
  }, [districtsQ.data, searchDist]);

  const districtLabel = (id: string): string => {
    const d = (districtsQ.data ?? []).find((x) => x.id === id);
    return d?.district_ar || d?.district_en || id.slice(0, 8);
  };

  const toggleDistrict = (id: string) => {
    setDistrictIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // Client-side uniqueness: (business, branch_or_null, city_id).
  const duplicate = useMemo(() => {
    if (!rcd.cityId) return false;
    return existing.some((e) =>
      e.id !== row?.id &&
      e.city_id === rcd.cityId &&
      (e.branch_id ?? null) === (branchId ?? null),
    );
  }, [existing, rcd.cityId, branchId, row?.id]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!rcd.cityId) throw new Error('city_required');
      if (duplicate) throw new Error('duplicate');
      const cityText = resolved.cityText || cityMetaQ.data?.name_ar || '';
      const districtIdArr = mode === 'specific' ? Array.from(districtIds) : [];
      // Legacy `district` text: only meaningful when exactly one district picked.
      let legacyDistrict: string | null = null;
      if (districtIdArr.length === 1) legacyDistrict = districtLabel(districtIdArr[0]);
      const payload = {
        business_id: businessId,
        branch_id: branchId,
        region_id: rcd.regionId,
        city_id: rcd.cityId,
        district_ids: districtIdArr,
        city: cityText,
        district: legacyDistrict,
      };
      if (isEdit) {
        const { error } = await supabase
          .from('business_service_areas')
          .update(payload)
          .eq('id', row!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_service_areas')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'تم تحديث منطقة التغطية' : 'تمت إضافة منطقة التغطية');
      qc.invalidateQueries({ queryKey: ['coverage-areas', userId, businessId] });
      onSaved();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'city_required') toast.error('اختر المدينة');
      else if (msg === 'duplicate' || msg.includes('unique') || msg.includes('idx_bsa_unique_coverage')) {
        toast.error('توجد منطقة تغطية بنفس (الفرع + المدينة) — استخدم التعديل بدلًا من الإضافة.');
      } else {
        toast.error('تعذر الحفظ. حاول مرة أخرى.');
      }
    },
  });

  const canSave = !!rcd.cityId && !duplicate && !saveMut.isPending;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{isEdit ? 'تعديل منطقة التغطية' : 'منطقة تغطية جديدة'}</h4>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 px-2">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <RegionCityDistrictSelect
        value={{ regionId: rcd.regionId, cityId: rcd.cityId, districtId: null }}
        onChange={(v, res) => {
          setRcd({ regionId: v.regionId, cityId: v.cityId, districtId: null });
          setResolved(res);
          // City changed → drop chosen districts.
          if (v.cityId !== rcd.cityId) setDistrictIds(new Set());
        }}
        requiredCity
      />

      {duplicate && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>مكرر</AlertTitle>
          <AlertDescription className="text-xs">
            هذه المدينة مضافة بالفعل لنفس الفرع. عدّل الصف الموجود لإضافة أحياء إضافية.
          </AlertDescription>
        </Alert>
      )}

      {branches.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">الفرع (اختياري)</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBranchId(null)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs border transition',
                branchId === null ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40',
              )}
            >
              كل الفروع
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBranchId(b.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs border transition',
                  branchId === b.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40',
                )}
              >
                {b.name_ar || b.name_en || 'فرع'}
              </button>
            ))}
          </div>
        </div>
      )}

      {rcd.cityId && (
        <div className="space-y-2">
          <Label className="text-xs">نطاق التغطية داخل المدينة</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('all')}
              className={cn(
                'p-3 rounded-xl border text-start text-sm transition',
                mode === 'all' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Globe2 className="w-4 h-4 text-primary" />
                يغطي كامل المدينة
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">جميع أحياء المدينة</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('specific')}
              className={cn(
                'p-3 rounded-xl border text-start text-sm transition',
                mode === 'specific' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                <MapPin className="w-4 h-4 text-primary" />
                أحياء محددة
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">اختر الأحياء المشمولة</div>
            </button>
          </div>
        </div>
      )}

      {rcd.cityId && mode === 'specific' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs">الأحياء</Label>
            <span className="text-[11px] text-muted-foreground">{districtIds.size} مختار</span>
          </div>

          {districtIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(districtIds).map((id) => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px]">
                  {districtLabel(id)}
                  <button type="button" onClick={() => toggleDistrict(id)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchDist}
              onChange={(e) => setSearchDist(e.target.value)}
              placeholder="ابحث عن حي…"
              className="h-9 pr-8"
            />
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border bg-background">
            {districtsQ.isLoading && (
              <div className="p-4 text-xs text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> جارٍ تحميل الأحياء…
              </div>
            )}
            {!districtsQ.isLoading && filteredDistricts.length === 0 && (
              <div className="p-4 text-xs text-muted-foreground">لا توجد أحياء لهذه المدينة.</div>
            )}
            {!districtsQ.isLoading && filteredDistricts.map((d) => {
              const active = districtIds.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDistrict(d.id)}
                  className={cn(
                    'w-full text-start px-3 py-2 text-sm flex items-center justify-between border-b last:border-b-0 transition',
                    active ? 'bg-primary/5' : 'hover:bg-muted',
                  )}
                >
                  <span dir="auto">{d.district_ar}</span>
                  {active && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
        <Button onClick={() => saveMut.mutate()} disabled={!canSave} className="gap-1.5">
          {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          حفظ
        </Button>
      </div>
    </div>
  );
};

export default DashboardBusinessCoverage;