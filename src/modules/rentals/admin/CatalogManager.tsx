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
import { Search, Pencil, Save, X, Power, Trash2, UserPlus, Loader2, ImageOff, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { IconPicker, RenderIcon } from '@/components/admin/IconPicker';
import { Textarea } from '@/components/ui/textarea';

interface TaxCat { id: string; slug: string; name_ar: string; name_en: string | null; parent_id: string | null; sort_order: number | null; }
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
  image_url: string | null;
  icon: string | null;
  description_ar: string | null;
  description_en: string | null;
}
interface Biz { id: string; name_ar: string; name_en: string | null; }

type Draft = Partial<CatalogRow>;

const EQUIPMENT_TYPE_ID = '069e30de-e312-479f-8efa-84fc8251bfaf';
const CURRENCIES = ['SAR', 'AED', 'USD', 'EUR'] as const;

export const CatalogManager: React.FC = () => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [cats, setCats] = useState<TaxCat[]>([]);
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [q, setQ] = useState('');
  const [filterParent, setFilterParent] = useState<string>('all');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [onlyMissingImage, setOnlyMissingImage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [draftParent, setDraftParent] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignBiz, setAssignBiz] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const [c, t, b] = await Promise.all([
      supabase.from('rental_equipment_catalog').select('id,slug,name_ar,name_en,brand,model,category_id,taxonomy_category_id,estimated_daily_price,estimated_weekly_price,estimated_monthly_price,estimated_deposit,currency,is_active,image_url,icon,description_ar,description_en').order('name_ar'),
      supabase.from('taxonomy_categories').select('id,slug,name_ar,name_en,parent_id,sort_order').eq('taxonomy_type_id', EQUIPMENT_TYPE_ID).eq('is_archived', false).order('sort_order'),
      supabase.from('businesses').select('id,name_ar,name_en').eq('is_active', true).order('name_ar').limit(500),
    ]);
    setRows((c.data as CatalogRow[] | null) ?? []);
    setCats((t.data as TaxCat[] | null) ?? []);
    setBusinesses((b.data as Biz[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const parents = useMemo(() => cats.filter(c => !c.parent_id), [cats]);
  const childrenOf = (parentId: string) => cats.filter(c => c.parent_id === parentId);
  const parentIdOf = (catId: string | null) => {
    if (!catId) return null;
    return cats.find(c => c.id === catId)?.parent_id ?? null;
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => {
      if (filterParent !== 'all') {
        const pid = parentIdOf(r.taxonomy_category_id);
        if (pid !== filterParent) return false;
      }
      if (filterCat !== 'all' && r.taxonomy_category_id !== filterCat) return false;
      if (filterStatus === 'active' && !r.is_active) return false;
      if (filterStatus === 'inactive' && r.is_active) return false;
      if (onlyMissingImage && r.image_url) return false;
      if (!needle) return true;
      return [r.name_ar, r.name_en, r.brand, r.model, r.slug].filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, filterParent, filterCat, filterStatus, onlyMissingImage, cats]);

  const startEdit = (r: CatalogRow) => {
    setEditingId(r.id);
    setDraft({ ...r });
    setDraftParent(parentIdOf(r.taxonomy_category_id) ?? '');
  };
  const cancelEdit = () => { setEditingId(null); setDraft({}); setDraftParent(''); };

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
      image_url: draft.image_url ?? null,
      icon: draft.icon ?? null,
      description_ar: draft.description_ar ?? null,
      description_en: draft.description_en ?? null,
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

  const missingImageCount = useMemo(() => rows.filter(r => !r.image_url).length, [rows]);

  const assignToProvider = async (r: CatalogRow) => {
    if (!assignBiz) { toast.error(bi('اختر المزود', 'Select a provider')); return; }
    if (!r.category_id) { toast.error(bi('تصنيف الصنف غير محدد', 'Category missing')); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user?.id) { toast.error(bi('يجب تسجيل الدخول', 'Login required')); return; }
    const payload = {
      provider_business_id: assignBiz,
      category_id: r.category_id,
      taxonomy_category_id: r.taxonomy_category_id ?? undefined,
      name_ar: r.name_ar,
      name_en: r.name_en ?? undefined,
      base_price: r.estimated_daily_price ?? 0,
      currency: r.currency ?? 'SAR',
      deposit_amount: r.estimated_deposit ?? 0,
      unit: 'day' as const,
      status: 'pending_review' as const,
      is_published: false,
      created_by: u.user.id,
    };
    const { error } = await supabase.from('rental_items').insert([payload]);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم الإسناد للمزود', 'Assigned to provider'));
    setAssignFor(null); setAssignBiz('');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Toolbar — hierarchical: parent → subcategory → search → status → missing-image */}
      <Card className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground" />
            <Input dir="auto" value={q} onChange={e => setQ(e.target.value)} placeholder={isRTL ? 'بحث بالاسم/الماركة/الموديل…' : 'Search name/brand/model…'} className="h-11 ps-9 rounded-xl" />
          </div>
          <Select value={filterStatus} onValueChange={(v: 'all' | 'active' | 'inactive') => setFilterStatus(v)}>
            <SelectTrigger className="h-11 rounded-xl w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bi('كل الحالات', 'All status')}</SelectItem>
              <SelectItem value="active">{bi('نشط', 'Active')}</SelectItem>
              <SelectItem value="inactive">{bi('معطل', 'Inactive')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant={onlyMissingImage ? 'default' : 'outline'}
            onClick={() => setOnlyMissingImage(v => !v)}
            className="h-11 rounded-xl"
            aria-pressed={onlyMissingImage}
          >
            <ImageOff className="size-4 me-1.5" />
            <Bi ar="بدون صورة" en="Missing image" />
            <Badge variant="secondary" className="ms-2 tech-content">{missingImageCount}</Badge>
          </Button>
          <Badge variant="secondary" className="ms-auto tech-content">{filtered.length} / {rows.length}</Badge>
        </div>
        {/* Step 1: parent group → Step 2: subcategory (scoped to parent) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground"><Bi ar="١) التصنيف الرئيسي" en="1) Main category" /></Label>
            <Select value={filterParent} onValueChange={(v) => { setFilterParent(v); setFilterCat('all'); }}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل التصنيفات الرئيسية', 'All main categories')}</SelectItem>
                {parents.map(p => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground"><Bi ar="٢) التصنيف الفرعي" en="2) Subcategory" /></Label>
            <Select
              value={filterCat}
              onValueChange={setFilterCat}
              disabled={filterParent === 'all'}
            >
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={bi('اختر التصنيف الرئيسي أولًا', 'Pick main category first')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل التصنيفات الفرعية', 'All subcategories')}</SelectItem>
                {(filterParent === 'all' ? [] : childrenOf(filterParent)).map(c => (
                  <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
                    <div className="size-14 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <RenderIcon value={r.icon || 'lucide:Package'} size={22} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{isRTL ? r.name_ar : (r.name_en || r.name_ar)}</div>
                      <div className="text-xs text-muted-foreground tech-content truncate">
                        {[r.brand, r.model].filter(Boolean).join(' · ') || '—'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {cat && <Badge variant="outline" className="text-xs">{isRTL ? cat.name_ar : (cat.name_en || cat.name_ar)}</Badge>}
                        <Badge className={`text-xs ${r.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-muted text-muted-foreground hover:bg-muted'}`}>
                          {r.is_active ? bi('نشط', 'Active') : bi('معطل', 'Inactive')}
                        </Badge>
                        {!r.image_url && (
                          <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 bg-amber-50">
                            <AlertTriangle className="size-3" />
                            <Bi ar="بدون صورة" en="No image" />
                          </Badge>
                        )}
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
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <Bi ar="المعلومات الأساسية" en="Basic info" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="الاسم بالعربية" en="Arabic name" /> <span className="text-red-500">*</span></Label>
                      <Input dir="auto" value={draft.name_ar ?? ''} onChange={e => setDraft(d => ({ ...d, name_ar: e.target.value }))} placeholder={isRTL ? 'مثال: مولد كهربائي 5 كيلو' : 'e.g. 5kW Generator'} className="h-11 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="الاسم بالإنجليزية" en="English name" /></Label>
                      <Input dir="auto" value={draft.name_en ?? ''} onChange={e => setDraft(d => ({ ...d, name_en: e.target.value }))} placeholder="e.g. 5kW Generator" className="h-11 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="الماركة" en="Brand" /></Label>
                      <Input dir="auto" value={draft.brand ?? ''} onChange={e => setDraft(d => ({ ...d, brand: e.target.value }))} placeholder={isRTL ? 'مثال: APC' : 'e.g. APC'} className="h-11 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="الموديل" en="Model" /></Label>
                      <Input dir="auto" value={draft.model ?? ''} onChange={e => setDraft(d => ({ ...d, model: e.target.value }))} placeholder={isRTL ? 'مثال: SRT-10K' : 'e.g. SRT-10K'} className="h-11 rounded-lg" />
                    </div>
                  </div>

                  {/* Hierarchical: pick main category → then subcategory (services list follows) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        <Bi ar="١) التصنيف الرئيسي" en="1) Main category" /> <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={draftParent}
                        onValueChange={(v) => { setDraftParent(v); setDraft(d => ({ ...d, taxonomy_category_id: null })); }}
                      >
                        <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder={bi('اختر التصنيف الرئيسي', 'Pick main category')} /></SelectTrigger>
                        <SelectContent>
                          {parents.map(p => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        <Bi ar="٢) التصنيف الفرعي" en="2) Subcategory" /> <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={draft.taxonomy_category_id ?? ''}
                        onValueChange={v => setDraft(d => ({ ...d, taxonomy_category_id: v }))}
                        disabled={!draftParent}
                      >
                        <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder={bi('اختر التصنيف الرئيسي أولًا', 'Pick main category first')} /></SelectTrigger>
                        <SelectContent>
                          {(draftParent ? childrenOf(draftParent) : []).map(c => (
                            <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                    <Bi ar="المظهر" en="Appearance" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="الصورة" en="Image" /></Label>
                      <ImageUpload
                        bucket="business-assets"
                        folder={`catalog/${r.slug || r.id}`}
                        value={draft.image_url ?? ''}
                        onChange={(url) => setDraft(d => ({ ...d, image_url: url }))}
                        onRemove={() => setDraft(d => ({ ...d, image_url: null }))}
                        aspectRatio="square"
                        maxSizeMB={3}
                        pipeline="business"
                        businessKind="logo"
                        placeholder={bi('ارفع صورة (PNG/JPG/WebP)', 'Upload (PNG/JPG/WebP)')}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        <Bi
                          ar="يتم ضغط الصورة تلقائيًا وإنشاء نسخ مصغّرة (thumbnail/card/medium) لتسريع التحميل."
                          en="Auto-compressed; thumbnail/card/medium variants generated for fast loading."
                        />
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="الأيقونة (احتياطي عند غياب الصورة)" en="Icon (fallback when no image)" /></Label>
                      <IconPicker value={draft.icon ?? ''} onChange={(v) => setDraft(d => ({ ...d, icon: v }))} />
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                    <Bi ar="الأسعار التقديرية" en="Estimated prices" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="يومي" en="Daily" /></Label>
                      <Input type="number" dir="ltr" value={draft.estimated_daily_price ?? ''} onChange={e => setDraft(d => ({ ...d, estimated_daily_price: e.target.value === '' ? null : Number(e.target.value) }))} className="h-11 rounded-lg tech-content" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="أسبوعي" en="Weekly" /></Label>
                      <Input type="number" dir="ltr" value={draft.estimated_weekly_price ?? ''} onChange={e => setDraft(d => ({ ...d, estimated_weekly_price: e.target.value === '' ? null : Number(e.target.value) }))} className="h-11 rounded-lg tech-content" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="شهري" en="Monthly" /></Label>
                      <Input type="number" dir="ltr" value={draft.estimated_monthly_price ?? ''} onChange={e => setDraft(d => ({ ...d, estimated_monthly_price: e.target.value === '' ? null : Number(e.target.value) }))} className="h-11 rounded-lg tech-content" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="مبلغ التأمين" en="Deposit" /></Label>
                      <Input type="number" dir="ltr" value={draft.estimated_deposit ?? ''} onChange={e => setDraft(d => ({ ...d, estimated_deposit: e.target.value === '' ? null : Number(e.target.value) }))} className="h-11 rounded-lg tech-content" />
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                    <Bi ar="الوصف" en="Description" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="الوصف بالعربية" en="Arabic description" /></Label>
                      <Textarea dir="auto" rows={3} value={draft.description_ar ?? ''} onChange={e => setDraft(d => ({ ...d, description_ar: e.target.value }))} className="rounded-lg resize-none" placeholder={bi('وصف موجز يظهر للزبائن…','Short description shown to customers…')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium"><Bi ar="الوصف بالإنجليزية" en="English description" /></Label>
                      <Textarea dir="ltr" rows={3} value={draft.description_en ?? ''} onChange={e => setDraft(d => ({ ...d, description_en: e.target.value }))} className="rounded-lg resize-none" />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
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