import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Search, Loader2, ListTree } from 'lucide-react';

interface CatalogRow {
  id: string;
  region_ar: string | null;
  region_en: string | null;
  city_ar: string;
  city_en: string;
  district_ar: string | null;
  district_en: string | null;
  is_active: boolean;
  sort_order: number;
}

const emptyDraft = {
  region_ar: '', region_en: '', city_ar: '', city_en: '',
  district_ar: '', district_en: '', sort_order: 0,
};

const AdminLocationsCatalog: React.FC = () => {
  useNoIndex();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(emptyDraft);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-location-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_catalog')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('city_ar', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) =>
      [r.city_ar, r.city_en, r.region_ar, r.region_en, r.district_ar, r.district_en]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [data, search]);

  const addRow = useMutation({
    mutationFn: async () => {
      if (draft.city_ar.trim().length < 2 || draft.city_en.trim().length < 2) {
        throw new Error('city required');
      }
      const { error } = await supabase.from('location_catalog').insert({
        region_ar: draft.region_ar.trim() || null,
        region_en: draft.region_en.trim() || null,
        city_ar: draft.city_ar.trim(),
        city_en: draft.city_en.trim(),
        district_ar: draft.district_ar.trim() || null,
        district_en: draft.district_en.trim() || null,
        sort_order: Number(draft.sort_order) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تمت الإضافة');
      setDraft(emptyDraft);
      qc.invalidateQueries({ queryKey: ['admin-location-catalog'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('duplicate') || msg.includes('unique')) toast.error('هذه المدينة/الحي مضافة مسبقاً');
      else if (msg === 'city required') toast.error('أدخل اسم المدينة بالعربي والإنجليزي');
      else toast.error('تعذرت الإضافة');
    },
  });

  const updateRow = useMutation({
    mutationFn: async (row: CatalogRow) => {
      const { error } = await supabase
        .from('location_catalog')
        .update({
          region_ar: row.region_ar,
          region_en: row.region_en,
          city_ar: row.city_ar,
          city_en: row.city_en,
          district_ar: row.district_ar,
          district_en: row.district_en,
          is_active: row.is_active,
          sort_order: row.sort_order,
        })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الحفظ');
      qc.invalidateQueries({ queryKey: ['admin-location-catalog'] });
    },
    onError: () => toast.error('تعذر الحفظ'),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('location_catalog').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['admin-location-catalog'] });
    },
    onError: () => toast.error('لا تملك صلاحية الحذف (سوبر أدمن فقط)'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-6xl">
        <header className="flex items-center gap-2">
          <ListTree className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-heading font-bold text-2xl">كتالوج المدن والمناطق</h1>
            <p className="text-sm text-muted-foreground mt-1">المرجع المركزي للمدن والأحياء المعتمدة في المنصة.</p>
          </div>
        </header>

        <Card><CardContent className="p-5 space-y-3">
          <h2 className="font-heading font-semibold text-base">إضافة موقع</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1"><Label className="text-xs">المنطقة (ع)</Label><Input dir="auto" value={draft.region_ar} onChange={(e) => setDraft({ ...draft, region_ar: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Region (EN)</Label><Input dir="ltr" value={draft.region_en} onChange={(e) => setDraft({ ...draft, region_en: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">المدينة (ع) *</Label><Input dir="auto" value={draft.city_ar} onChange={(e) => setDraft({ ...draft, city_ar: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">City (EN) *</Label><Input dir="ltr" value={draft.city_en} onChange={(e) => setDraft({ ...draft, city_en: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">الحي (ع)</Label><Input dir="auto" value={draft.district_ar} onChange={(e) => setDraft({ ...draft, district_ar: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">District (EN)</Label><Input dir="ltr" value={draft.district_en} onChange={(e) => setDraft({ ...draft, district_en: e.target.value })} /></div>
          </div>
          <Button onClick={() => addRow.mutate()} disabled={addRow.isPending} className="min-h-[44px]">
            {addRow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة
          </Button>
        </CardContent></Card>

        <Card><CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input dir="auto" placeholder="ابحث في المدن أو الأحياء..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
            <span className="text-xs text-muted-foreground ms-auto tech-content">{filtered.length} / {data?.length ?? 0}</span>
          </div>

          {isLoading ? (
            <Skeleton className="h-40" />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">لا توجد نتائج.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-start p-2">المدينة (ع)</th>
                    <th className="text-start p-2">City (EN)</th>
                    <th className="text-start p-2">المنطقة (ع)</th>
                    <th className="text-start p-2">الحي (ع)</th>
                    <th className="text-start p-2">ترتيب</th>
                    <th className="text-start p-2">نشط</th>
                    <th className="text-start p-2">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <EditableRow key={row.id} row={row} onSave={(r) => updateRow.mutate(r)} onDelete={() => deleteRow.mutate(row.id)} />
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

const EditableRow: React.FC<{ row: CatalogRow; onSave: (r: CatalogRow) => void; onDelete: () => void }> = ({ row, onSave, onDelete }) => {
  const [local, setLocal] = useState(row);
  const dirty = JSON.stringify(local) !== JSON.stringify(row);
  return (
    <tr className="border-b border-border/50">
      <td className="p-2"><Input dir="auto" value={local.city_ar} onChange={(e) => setLocal({ ...local, city_ar: e.target.value })} className="h-9" /></td>
      <td className="p-2"><Input dir="ltr" value={local.city_en} onChange={(e) => setLocal({ ...local, city_en: e.target.value })} className="h-9" /></td>
      <td className="p-2"><Input dir="auto" value={local.region_ar ?? ''} onChange={(e) => setLocal({ ...local, region_ar: e.target.value })} className="h-9" /></td>
      <td className="p-2"><Input dir="auto" value={local.district_ar ?? ''} onChange={(e) => setLocal({ ...local, district_ar: e.target.value })} className="h-9" /></td>
      <td className="p-2 w-20"><Input type="number" value={local.sort_order} onChange={(e) => setLocal({ ...local, sort_order: Number(e.target.value) || 0 })} className="h-9 tech-content" /></td>
      <td className="p-2"><Switch checked={local.is_active} onCheckedChange={(v) => setLocal({ ...local, is_active: v })} /></td>
      <td className="p-2 flex gap-1">
        <Button size="sm" variant={dirty ? 'default' : 'ghost'} disabled={!dirty} onClick={() => onSave(local)}><Save className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </td>
    </tr>
  );
};

export default AdminLocationsCatalog;