import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useNoIndex } from '@/hooks/useNoIndex';
import { updateBusinessById, listAdminBusinesses } from '@/modules/businesses';
import { toast } from 'sonner';
import { Save, Loader2, Map as MapIcon, AlertCircle } from 'lucide-react';
import { LocationPicker, type ReverseGeocodeResult } from '@/components/dashboard/business-edit/LocationPicker';

interface BizRow {
  id: string;
  name_ar: string;
  ref_id: string;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  district: string | null;
  address: string | null;
}

const AdminBusinessCoordinates: React.FC = () => {
  useNoIndex();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [editor, setEditor] = useState<BizRow | null>(null);

  const { data: list, isLoading } = useQuery({
    queryKey: ['admin-biz-coords'],
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<BizRow>({
        select: 'id, name_ar, ref_id, latitude, longitude, region, district, address',
        orderBy: { column: 'name_ar' },
        limit: 1000,
      });
      if (error) throw error;
      return (data ?? []) as BizRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    return list.filter((b) => {
      if (missingOnly && b.latitude != null && b.longitude != null) return false;
      if (q && !`${b.name_ar} ${b.ref_id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [list, search, missingOnly]);

  const select = (b: BizRow) => { setSelectedId(b.id); setEditor({ ...b }); };

  const save = useMutation({
    mutationFn: async () => {
      if (!editor) return;
      const { error } = await updateBusinessById({
        id: editor.id,
        values: {
          latitude: editor.latitude,
          longitude: editor.longitude,
          region: editor.region,
          district: editor.district,
          address: editor.address,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الحفظ');
      qc.invalidateQueries({ queryKey: ['admin-biz-coords'] });
    },
    onError: () => toast.error('تعذر الحفظ'),
  });

  const handleAutofill = (data: ReverseGeocodeResult) => {
    if (!editor) return;
    setEditor({
      ...editor,
      region: data.region_ar ?? editor.region,
      district: data.district_ar ?? editor.district,
      address: data.address_ar ?? editor.address,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-6xl">
        <header className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-heading font-bold text-2xl">إحداثيات المنشآت</h1>
            <p className="text-sm text-muted-foreground mt-1">تحديث مواقع المنشآت على الخريطة وعناوينها التفصيلية.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-5"><CardContent className="p-4 space-y-3">
            <Input dir="auto" placeholder="ابحث (اسم / Ref ID)" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
              المنشآت بدون إحداثيات فقط
            </label>
            {isLoading ? (
              <Skeleton className="h-80" />
            ) : (
              <ul className="divide-y divide-border max-h-[520px] overflow-auto">
                {filtered.map((b) => {
                  const missing = b.latitude == null || b.longitude == null;
                  const active = selectedId === b.id;
                  return (
                    <li key={b.id}>
                      <button onClick={() => select(b)} className={`w-full text-start py-2.5 px-2 rounded-lg flex items-center gap-2 hover:bg-muted/50 ${active ? 'bg-muted' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{b.name_ar}</p>
                          <p className="text-[11px] text-muted-foreground tech-content">{b.ref_id}</p>
                        </div>
                        {missing && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && <p className="text-sm text-muted-foreground py-10 text-center">لا توجد نتائج.</p>}
              </ul>
            )}
          </CardContent></Card>

          <Card className="lg:col-span-7"><CardContent className="p-5 space-y-4">
            {!editor ? (
              <p className="text-sm text-muted-foreground py-20 text-center">اختر منشأة من القائمة لتعديل موقعها.</p>
            ) : (
              <>
                <div>
                  <h2 className="font-heading font-semibold text-lg">{editor.name_ar}</h2>
                  <p className="text-xs text-muted-foreground tech-content">{editor.ref_id}</p>
                </div>

                <LocationPicker
                  isRTL
                  latitude={editor.latitude}
                  longitude={editor.longitude}
                  onChange={(lat, lng) => setEditor({ ...editor, latitude: lat, longitude: lng })}
                  onAutofill={handleAutofill}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">المنطقة</Label><Input dir="auto" value={editor.region ?? ''} onChange={(e) => setEditor({ ...editor, region: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">الحي</Label><Input dir="auto" value={editor.district ?? ''} onChange={(e) => setEditor({ ...editor, district: e.target.value })} /></div>
                  <div className="space-y-1 sm:col-span-2"><Label className="text-xs">العنوان</Label><Input dir="auto" value={editor.address ?? ''} onChange={(e) => setEditor({ ...editor, address: e.target.value })} /></div>
                </div>

                <Button onClick={() => save.mutate()} disabled={save.isPending} className="min-h-[44px]">
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ
                </Button>
              </>
            )}
          </CardContent></Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminBusinessCoordinates;