import React, { useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Plus, Star, StarOff, Trash2, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { trackEvent } from '@/lib/analytics';
import { pingProviderActive } from '@/hooks/useProviderActivityPing';

interface BusinessOpt { id: string; name_ar: string; }
interface AreaRow {
  id: string; business_id: string; city: string; district: string | null; is_primary: boolean;
}

const ProviderServiceAreas: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeBiz, setActiveBiz] = useState<string>('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-3xl">
        <header>
          <h1 className="font-heading font-bold text-xl sm:text-2xl">مناطق الخدمة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            أضف المدن أو الأحياء التي تخدمها منشأتك حتى تظهر لك فرص أكثر ملاءمة.
          </p>
        </header>

        {businesses.length > 1 && (
          <Card><CardContent className="p-4 space-y-2">
            <Label className="text-xs">المنشأة</Label>
            <Select value={activeBiz} onValueChange={setActiveBiz}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name_ar}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent></Card>
        )}

        <Card><CardContent className="p-5 space-y-4">
          <h2 className="font-heading font-semibold text-base">إضافة منطقة خدمة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">المدينة</Label>
              <Input dir="auto" placeholder="مثال: الرياض" value={city} onChange={(e) => setCity(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الحي (اختياري)</Label>
              <Input dir="auto" placeholder="مثال: العليا" value={district} onChange={(e) => setDistrict(e.target.value)} className="h-11" />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                اجعلها منطقة رئيسية
              </label>
            </div>
          </div>
          <Button
            onClick={() => addArea.mutate()}
            disabled={addArea.isPending || city.trim().length < 2}
            className="min-h-[44px]"
          >
            {addArea.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة منطقة خدمة
          </Button>
        </CardContent></Card>

        <Card><CardContent className="p-5 space-y-3">
          <h2 className="font-heading font-semibold text-base">المناطق الحالية</h2>
          {loadingAreas ? (
            <Skeleton className="h-20" />
          ) : (areas?.length ?? 0) === 0 ? (
            <div className="text-center py-8 space-y-2">
              <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-medium">لم تضف مناطق خدمة بعد</p>
              <p className="text-sm text-muted-foreground">إضافة مناطق الخدمة تساعد قطاعات على توجيه الطلبات المناسبة لمنشأتك.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {areas!.map((a) => (
                <li key={a.id} className="py-2.5 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.city}{a.district ? ` · ${a.district}` : ''}</p>
                    {a.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">منطقة رئيسية</span>}
                  </div>
                  {!a.is_primary && (
                    <Button size="sm" variant="ghost" className="min-h-[36px]" onClick={() => setPrimary.mutate(a.id)} title="تعيين كمنطقة رئيسية">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  {a.is_primary && (
                    <span className="text-muted-foreground p-2"><StarOff className="h-4 w-4" /></span>
                  )}
                  <Button size="sm" variant="ghost" className="min-h-[36px] text-destructive" onClick={() => removeArea.mutate(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      </div>
    </DashboardLayout>
  );
};

export default ProviderServiceAreas;