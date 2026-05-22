import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { listAdminBusinesses } from '@/modules/businesses';
import { toast } from 'sonner';
import { Plus, Trash2, Star, Loader2, MapPin, ExternalLink } from 'lucide-react';

interface AreaRow {
  id: string;
  business_id: string;
  city: string;
  district: string | null;
  is_primary: boolean;
  businesses?: { name_ar: string; ref_id: string } | null;
}

const AdminBusinessServiceAreas: React.FC = () => {
  useNoIndex();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [biz, setBiz] = useState<string>('');
  const [newCity, setNewCity] = useState('');
  const [newDistrict, setNewDistrict] = useState('');

  const { data: businesses } = useQuery({
    queryKey: ['admin-businesses-light'],
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<{ id: string; name_ar: string; ref_id: string }>({
        select: 'id, name_ar, ref_id',
        orderBy: { column: 'name_ar' },
        limit: 1000,
      });
      if (error) throw error;
      return (data ?? []) as { id: string; name_ar: string; ref_id: string }[];
    },
  });

  const { data: areas, isLoading } = useQuery({
    queryKey: ['admin-service-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_service_areas')
        .select('id, business_id, city, district, is_primary, businesses!inner(name_ar, ref_id)')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as AreaRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!areas) return [];
    const q = search.trim().toLowerCase();
    return areas.filter((a) => {
      if (q && !`${a.city} ${a.district ?? ''} ${a.businesses?.name_ar ?? ''} ${a.businesses?.ref_id ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [areas, search]);

  const addArea = useMutation({
    mutationFn: async () => {
      if (!biz) throw new Error('biz');
      if (newCity.trim().length < 2) throw new Error('city');
      const { error } = await supabase.from('business_service_areas').insert({
        business_id: biz, city: newCity.trim(), district: newDistrict.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تمت الإضافة');
      setNewCity(''); setNewDistrict('');
      qc.invalidateQueries({ queryKey: ['admin-service-areas'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'biz') toast.error('اختر المنشأة');
      else if (msg === 'city') toast.error('أدخل اسم مدينة');
      else if (msg.includes('duplicate')) toast.error('مكرر');
      else toast.error('تعذرت الإضافة');
    },
  });

  const setPrimary = useMutation({
    mutationFn: async (a: AreaRow) => {
      await supabase.from('business_service_areas').update({ is_primary: false }).eq('business_id', a.business_id);
      const { error } = await supabase.from('business_service_areas').update({ is_primary: true }).eq('id', a.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries({ queryKey: ['admin-service-areas'] }); },
    onError: () => toast.error('تعذر التحديث'),
  });

  const removeArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_service_areas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['admin-service-areas'] }); },
    onError: () => toast.error('تعذر الحذف'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-6xl">
        <header className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-heading font-bold text-2xl">مناطق خدمة المنشآت</h1>
            <p className="text-sm text-muted-foreground mt-1">عرض وإدارة المناطق التي تخدمها كل منشأة في المنصة.</p>
          </div>
        </header>

        <Card><CardContent className="p-5 space-y-3">
          <h2 className="font-heading font-semibold text-base">إضافة منطقة لمنشأة</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">المنشأة</Label>
              <Select value={biz} onValueChange={setBiz}>
                <SelectTrigger><SelectValue placeholder="اختر منشأة" /></SelectTrigger>
                <SelectContent>
                  {businesses?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name_ar} ({b.ref_id})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">المدينة</Label><Input dir="auto" value={newCity} onChange={(e) => setNewCity(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">الحي (اختياري)</Label><Input dir="auto" value={newDistrict} onChange={(e) => setNewDistrict(e.target.value)} /></div>
          </div>
          <Button onClick={() => addArea.mutate()} disabled={addArea.isPending} className="min-h-[44px]">
            {addArea.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة
          </Button>
        </CardContent></Card>

        <Card><CardContent className="p-5 space-y-3">
          <Input dir="auto" placeholder="ابحث (منشأة / مدينة / حي / Ref ID)..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">لا توجد نتائج.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-start p-2">المنشأة</th>
                    <th className="text-start p-2">المدينة</th>
                    <th className="text-start p-2">الحي</th>
                    <th className="text-start p-2">رئيسية</th>
                    <th className="text-start p-2">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{a.businesses?.name_ar ?? '—'}</span>
                          <span className="text-xs text-muted-foreground tech-content">{a.businesses?.ref_id}</span>
                        </div>
                      </td>
                      <td className="p-2">{a.city}</td>
                      <td className="p-2 text-muted-foreground">{a.district ?? '—'}</td>
                      <td className="p-2">
                        {a.is_primary ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">رئيسية</span>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setPrimary.mutate(a)}><Star className="h-3.5 w-3.5" /></Button>
                        )}
                      </td>
                      <td className="p-2 flex gap-1">
                        <Button asChild size="sm" variant="ghost"><Link to={`/admin/businesses?focus=${a.business_id}`}><ExternalLink className="h-3.5 w-3.5" /></Link></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeArea.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminBusinessServiceAreas;