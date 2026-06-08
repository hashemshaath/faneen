import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Pencil, Save, X, Power, Trash2, UserPlus, Loader2 } from 'lucide-react';

interface TaxCat { id: string; slug: string; name_ar: string; name_en: string | null; }
interface CatalogRow {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  brand: string | null;
  model: string | null;
  category_id: string | null;
  taxonomy_category_id: string | null;
  estimated_daily_price: number | null;
  estimated_weekly_price: number | null;
  estimated_monthly_price: number | null;
  estimated_deposit: number | null;
  currency: string | null;
  is_active: boolean;
}
interface Biz { id: string; name_ar: string; name_en: string | null; }

type Draft = Partial<CatalogRow>;

const EQUIPMENT_TYPE_ID = '069e30de-e312-479f-8efa-84fc8251bfaf';

export const CatalogManager: React.FC = () => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [cats, setCats] = useState<TaxCat[]>([]);
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [q, setQ] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignBiz, setAssignBiz] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const [c, t, b] = await Promise.all([
      supabase.from('rental_equipment_catalog').select('id,slug,name_ar,name_en,brand,model,category_id,taxonomy_category_id,estimated_daily_price,estimated_weekly_price,estimated_monthly_price,estimated_deposit,currency,is_active').order('name_ar'),
      supabase.from('taxonomy_categories').select('id,slug,name_ar,name_en').eq('taxonomy_type_id', EQUIPMENT_TYPE_ID).order('sort_order'),
      supabase.from('businesses').select('id,name_ar,name_en').eq('is_active', true).order('name_ar').limit(500),
    ]);
    setRows((c.data as CatalogRow[] | null) ?? []);
    setCats((t.data as TaxCat[] | null) ?? []);
    setBusinesses((b.data as Biz[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => {
      if (filterCat !== 'all' && r.taxonomy_category_id !== filterCat) return false;
      if (filterStatus === 'active' && !r.is_active) return false;
      if (filterStatus === 'inactive' && r.is_active) return false;
      if (!needle) return true;
      return [r.name_ar, r.name_en, r.brand, r.model, r.slug].filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, filterCat, filterStatus]);

  const startEdit = (r: CatalogRow) => { setEditingId(r.id); setDraft({ ...r }); };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    const payload: Draft = {
      name_ar: draft.name_ar,
      name_en: draft.name_en,
      brand: draft.brand,
      model: draft.model,
      taxonomy_category_id: draft.taxonomy_category_id,
      estimated_daily_price: draft.estimated_daily_price,
      estimated_weekly_price: draft.estimated_weekly_price,
      estimated_monthly_price: draft.estimated_monthly_price,
      estimated_deposit: draft.estimated_deposit,
      currency: draft.currency,
    };
    const { error } = await supabase.from('rental_equipment_catalog').update(payload).eq('id', id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم الحفظ', 'Saved'));
    cancelEdit();
    await load();
  };

  const toggleActive = async (r: CatalogRow) => {
    const { error } = await supabase.from('rental_equipment_catalog').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(!r.is_active ? bi('تم التفعيل', 'Activated') : bi('تم التعطيل', 'Deactivated'));
    await load();
  };

  const removeRow = async (id: string) => {
    if (!confirm(isRTL ? 'حذف هذا الصنف من الكتالوج الرئيسي؟' : 'Delete this catalog item?')) return;
    const { error } = await supabase.from('rental_equipment_catalog').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم الحذف', 'Deleted'));
    await load();
  };

  const assignToProvider = async (r: CatalogRow) => {
    if (!assignBiz) { toast.error(bi('اختر المزود', 'Select a provider')); return; }
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      provider_business_id: assignBiz,
      category_id: r.category_id,
      taxonomy_category_id: r.taxonomy_category_id,
      name_ar: r.name_ar,
      name_en: r.name_en,
      base_price: r.estimated_daily_price ?? 0,
      currency: r.currency ?? 'SAR',
      deposit_amount: r.estimated_deposit ?? 0,
      unit: 'day',
      status: 'pending_review',
      is_published: false,
      created_by: u.user?.id,
    };
    const { error } = await supabase.from('rental_items').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم الإسناد للمزود', 'Assigned to provider'));
    setAssignFor(null); setAssignBiz('');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground" />
          <Input dir="auto" value={q} onChange={e => setQ(e.target.value)} placeholder={isRTL ? 'بحث بالاسم/الماركة/الموديل…' : 'Search name/brand/model…'} className="h-11 ps-9 rounded-xl" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-11 rounded-xl w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل التصنيفات', 'All categories')}</SelectItem>
            {cats.map(c => <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v: 'all' | 'active' | 'inactive') => setFilterStatus(v)}>
          <SelectTrigger className="h-11 rounded-xl w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل الحالات', 'All status')}</SelectItem>
            <SelectItem value="active">{bi('نشط', 'Active')}</SelectItem>
            <SelectItem value="inactive">{bi('معطل', 'Inactive')}</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="ms-auto">{filtered.length} / {rows.length}</Badge>
      </Card>

      {/* List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(r => {
          const cat = cats.find(c => c.id === r.taxonomy_category_id);
          const isEdit = editingId === r.id;
          const isAssign = assignFor === r.id;
          return (
            <Card key={r.id} className="p-4 space-y-3 hover-lift">
              {!isEdit ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{isRTL ? r.name_ar : (r.name_en || r.name_ar)}</div>
                      <div className="text-xs text-muted-foreground tech-content truncate">
                        {[r.brand, r.model].filter(Boolean).join(' · ') || '—'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {cat && <Badge variant="outline" className="text-xs">{isRTL ? cat.name_ar : (cat.name_en || cat.name_ar)}</Badge>}
                        <Badge className={`text-xs ${r.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-muted text-muted-foreground hover:bg-muted'}`}>
                          {r.is_active ? bi('نشط', 'Active') : bi('معطل', 'Inactive')}
                        </Badge>
                        {r.estimated_daily_price != null && (
                          <span className="text-xs tech-content text-muted-foreground">
                            {r.estimated_daily_price} {r.currency || 'SAR'} / {bi('يوم', 'day')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 border-t">
                    <Button size="sm" variant="outline" onClick={() => startEdit(r)} className="h-9 rounded-lg"><Pencil className="size-3.5 me-1" /><Bi ar="تعديل" en="Edit" /></Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(r)} className="h-9 rounded-lg"><Power className="size-3.5 me-1" />{r.is_active ? bi('تعطيل', 'Deactivate') : bi('تفعيل', 'Activate')}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAssignFor(r.id); setAssignBiz(''); }} className="h-9 rounded-lg"><UserPlus className="size-3.5 me-1" /><Bi ar="إسناد لمزود" en="Assign provider" /></Button>
                    <Button size="sm" variant="outline" onClick={() => removeRow(r.id)} className="h-9 rounded-lg text-red-600 hover:text-red-700"><Trash2 className="size-3.5 me-1" /><Bi ar="حذف" en="Delete" /></Button>
                  </div>
                  {isAssign && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="text-xs font-medium"><Bi ar="اختر المزود لإنشاء عنصر جديد بهذه القيم" en="Select a provider to spawn an item from this template" /></div>
                      <Select value={assignBiz} onValueChange={setAssignBiz}>
                        <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder={isRTL ? 'اختر مزودًا…' : 'Choose provider…'} /></SelectTrigger>
                        <SelectContent>
                          {businesses.map(b => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => assignToProvider(r)} className="h-9 rounded-lg"><Save className="size-3.5 me-1" /><Bi ar="إنشاء" en="Create" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAssignFor(null); setAssignBiz(''); }} className="h-9 rounded-lg"><X className="size-3.5 me-1" /><Bi ar="إلغاء" en="Cancel" /></Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input dir="auto" value={draft.name_ar ?? ''} onChange={e => setDraft(d => ({ ...d, name_ar: e.target.value }))} placeholder="الاسم العربي" className="h-10 rounded-lg" />
                    <Input dir="auto" value={draft.name_en ?? ''} onChange={e => setDraft(d => ({ ...d, name_en: e.target.value }))} placeholder="English name" className="h-10 rounded-lg" />
                    <Input dir="auto" value={draft.brand ?? ''} onChange={e => setDraft(d => ({ ...d, brand: e.target.value }))} placeholder={isRTL ? 'الماركة' : 'Brand'} className="h-10 rounded-lg" />
                    <Input dir="auto" value={draft.model ?? ''} onChange={e => setDraft(d => ({ ...d, model: e.target.value }))} placeholder={isRTL ? 'الموديل' : 'Model'} className="h-10 rounded-lg" />
                  </div>
                  <Select value={draft.taxonomy_category_id ?? ''} onValueChange={v => setDraft(d => ({ ...d, taxonomy_category_id: v }))}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder={isRTL ? 'التصنيف' : 'Category'} /></SelectTrigger>
                    <SelectContent>
                      {cats.map(c => <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-4 gap-2">
                    <Input type="number" dir="ltr" value={draft.estimated_daily_price ?? ''} onChange={e => setDraft(d => ({ ...d, estimated_daily_price: e.target.value === '' ? null : Number(e.target.value) }))} placeholder={isRTL ? 'يومي' : 'Daily'} className="h-10 rounded-lg tech-content" />
                    <Input type="number" dir="ltr" value={draft.estimated_weekly_price ?? ''} onChange={e => setDraft(d => ({ ...d, estimated_weekly_price: e.target.value === '' ? null : Number(e.target.value) }))} placeholder={isRTL ? 'أسبوعي' : 'Weekly'} className="h-10 rounded-lg tech-content" />
                    <Input type="number" dir="ltr" value={draft.estimated_monthly_price ?? ''} onChange={e => setDraft(d => ({ ...d, estimated_monthly_price: e.target.value === '' ? null : Number(e.target.value) }))} placeholder={isRTL ? 'شهري' : 'Monthly'} className="h-10 rounded-lg tech-content" />
                    <Input type="number" dir="ltr" value={draft.estimated_deposit ?? ''} onChange={e => setDraft(d => ({ ...d, estimated_deposit: e.target.value === '' ? null : Number(e.target.value) }))} placeholder={isRTL ? 'تأمين' : 'Deposit'} className="h-10 rounded-lg tech-content" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => saveEdit(r.id)} disabled={savingId === r.id} className="h-9 rounded-lg">
                      {savingId === r.id ? <Loader2 className="size-3.5 me-1 animate-spin" /> : <Save className="size-3.5 me-1" />}
                      <Bi ar="حفظ" en="Save" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-9 rounded-lg"><X className="size-3.5 me-1" /><Bi ar="إلغاء" en="Cancel" /></Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground col-span-full"><Bi ar="لا توجد نتائج مطابقة." en="No matching results." /></Card>
        )}
      </div>
    </div>
  );
};

export default CatalogManager;