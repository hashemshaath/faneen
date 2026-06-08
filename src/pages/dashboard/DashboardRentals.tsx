import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, Package, CalendarClock, AlertTriangle, RefreshCw, Search, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  RentalCategories, RentalItems, RentalOrders,
  RENTAL_UNITS, ITEM_STATUS_LABELS,
} from '@/modules/rentals';
import type { RentalCategory, RentalItem, RentalOrder, RentalUnit } from '@/modules/rentals';
import { RentalStatusBadge } from '@/modules/rentals/components/RentalStatusBadge';
import { RentalDayCounter } from '@/modules/rentals/components/RentalDayCounter';
import { RentalExtensionPanel } from '@/modules/rentals/components/RentalExtensionPanel';
import { RentalOrderAssetLinks } from '@/modules/assets';
import { RentalImageUploader } from '@/modules/rentals/components/RentalImageUploader';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CatalogPick {
  id: string;
  name_ar: string;
  name_en: string | null;
  brand: string | null;
  model: string | null;
  category_id: string | null;
  estimated_daily_price: number | null;
  currency: string | null;
  image_url: string | null;
  description_ar: string | null;
  description_en: string | null;
}

/** Provider rentals dashboard — items + orders + extensions in one shell. */
const DashboardRentals: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const bi = useBi();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [categories, setCategories] = useState<RentalCategory[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: biz } = await supabase
        .from('businesses').select('id').eq('user_id', user.id).limit(1).maybeSingle();
      const bizId = biz?.id ?? null;
      setBusinessId(bizId);
      const [cats, it, ord] = await Promise.all([
        RentalCategories.listCategories(),
        bizId ? RentalItems.listProviderItems(bizId) : Promise.resolve({ data: [], error: null }),
        bizId ? RentalOrders.listOrdersForProvider(bizId) : Promise.resolve({ data: [], error: null }),
      ]);
      setCategories(cats.data ?? []);
      setItems(it.data ?? []);
      setOrders(ord.data ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  const activeOrders = useMemo(() => orders.filter(o => o.status === 'active'), [orders]);
  const expiringOrders = useMemo(() => orders.filter(o => o.status === 'expiring_soon'), [orders]);
  const overdueOrders = useMemo(() => orders.filter(o => o.status === 'expired'), [orders]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (!businessId) {
    return (
      <DashboardLayout>
        <PageHeader icon={Package} title={bi('التأجير','Rentals')} subtitle={bi('يلزم ربط منشأة بحسابك لإدارة عناصر التأجير.','Link a business to manage rental items.')} />
        <Card className="p-8 text-center text-muted-foreground">
          <Bi ar="لا يوجد ملف منشأة مرتبط بحسابك. اربط منشأة من إعدادات المنشأة لتفعيل التأجير." en="No linked business. Link one from business settings to enable rentals." />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16 md:pb-20">
        <PageHeader
          icon={Package}
          title={bi('التأجير','Rentals')}
          subtitle={bi('إدارة عناصر التأجير والعقود النشطة، التمديد والإغلاق.','Manage rental items, active contracts, extensions and closure.')}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Package} value={items.length} ar="عناصري" en="My items" tone="primary" />
          <StatTile icon={CalendarClock} value={activeOrders.length} ar="نشطة" en="Active" tone="emerald" />
          <StatTile icon={CalendarClock} value={expiringOrders.length} ar="قريبة الانتهاء" en="Expiring" tone="amber" />
          <StatTile icon={AlertTriangle} value={overdueOrders.length} ar="متجاوزة" en="Overdue" tone="red" />
        </div>

        <Tabs defaultValue="items" className="w-full">
          <TabsList className="bg-muted/40">
            <TabsTrigger value="items"><Bi ar="عناصري" en="My items" /></TabsTrigger>
            <TabsTrigger value="active"><Bi ar="عقود نشطة" en="Active orders" /></TabsTrigger>
            <TabsTrigger value="expiring"><Bi ar="قريبة الانتهاء" en="Expiring" /></TabsTrigger>
            <TabsTrigger value="overdue"><Bi ar="متجاوزة" en="Overdue" /></TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <ItemsPanel
              businessId={businessId}
              categories={categories}
              items={items}
              onChange={async () => {
                const r = await RentalItems.listProviderItems(businessId);
                setItems(r.data ?? []);
              }}
            />
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <OrdersPanel orders={activeOrders} items={items} onChanged={async () => {
              const r = await RentalOrders.listOrdersForProvider(businessId); setOrders(r.data ?? []);
            }} />
          </TabsContent>
          <TabsContent value="expiring" className="mt-4">
            <OrdersPanel orders={expiringOrders} items={items} onChanged={async () => {
              const r = await RentalOrders.listOrdersForProvider(businessId); setOrders(r.data ?? []);
            }} />
          </TabsContent>
          <TabsContent value="overdue" className="mt-4">
            <OrdersPanel orders={overdueOrders} items={items} onChanged={async () => {
              const r = await RentalOrders.listOrdersForProvider(businessId); setOrders(r.data ?? []);
            }} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

const TONE_BG: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  red: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

const StatTile: React.FC<{ icon: React.ComponentType<{ className?: string }>; value: number; ar: string; en: string; tone: keyof typeof TONE_BG }> = ({ icon: Icon, value, ar, en, tone }) => (
  <Card className="p-4 hover-lift">
    <div className="flex items-center gap-3">
      <div className={`size-10 rounded-xl flex items-center justify-center ${TONE_BG[tone]}`}><Icon className="size-5" /></div>
      <div>
        <div className="text-2xl font-semibold tech-content">{value}</div>
        <div className="text-xs text-muted-foreground"><Bi ar={ar} en={en} /></div>
      </div>
    </div>
  </Card>
);

/* ---------- Items panel (with inline add form) ---------- */

interface ItemsPanelProps {
  businessId: string;
  categories: RentalCategory[];
  items: RentalItem[];
  onChange: () => Promise<void>;
}

const ItemsPanel: React.FC<ItemsPanelProps> = ({ businessId, categories, items, onChange }) => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'pick' | 'manual' | 'request'>('pick');
  const [catalog, setCatalog] = useState<CatalogPick[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogFilterCat, setCatalogFilterCat] = useState<string>('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    category_id: categories[0]?.id ?? '',
    unit: 'day' as RentalUnit,
    base_price: '0',
    min_duration: '1',
    deposit_amount: '0',
    usage_terms: '',
    late_terms: '',
    penalty_terms: '',
  });

  // Request form (when item is not in catalog)
  const [reqForm, setReqForm] = useState({
    name_ar: '',
    name_en: '',
    category_id: categories[0]?.id ?? '',
    proposed_category_name_ar: '',
    brand: '',
    model: '',
    suggested_unit: 'day',
    suggested_price: '0',
    description_ar: '',
    notes: '',
  });
  const [reqSubmitting, setReqSubmitting] = useState(false);

  useEffect(() => {
    if (!form.category_id && categories[0]) setForm(f => ({ ...f, category_id: categories[0].id }));
  }, [categories, form.category_id]);

  // Load catalog when opening the panel
  useEffect(() => {
    if (!adding || catalog.length > 0) return;
    setCatalogLoading(true);
    void supabase
      .from('rental_equipment_catalog')
      .select('id,name_ar,name_en,brand,model,category_id,estimated_daily_price,currency,image_url,description_ar,description_en')
      .eq('is_active', true)
      .order('name_ar', { ascending: true })
      .limit(500)
      .then(({ data }) => {
        setCatalog((data ?? []) as CatalogPick[]);
        setCatalogLoading(false);
      });
  }, [adding, catalog.length]);

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    return catalog.filter(c => {
      if (!catalogFilterCat || c.category_id !== catalogFilterCat) return false;
      if (!q) return true;
      return (
        c.name_ar?.toLowerCase().includes(q) ||
        (c.name_en ?? '').toLowerCase().includes(q) ||
        (c.brand ?? '').toLowerCase().includes(q) ||
        (c.model ?? '').toLowerCase().includes(q)
      );
    }).slice(0, 60);
  }, [catalog, catalogQuery, catalogFilterCat]);

  const pickFromCatalog = (c: CatalogPick) => {
    setSelectedCatalogId(c.id);
    setImageUrl(c.image_url ?? null);
    setForm(f => ({
      ...f,
      name_ar: c.name_ar,
      name_en: c.name_en ?? '',
      category_id: c.category_id ?? f.category_id,
      base_price: String(c.estimated_daily_price ?? 0),
    }));
    setMode('manual');
  };

  const submit = async () => {
    if (!form.name_ar.trim() || !form.category_id) {
      toast.error(bi('الرجاء تعبئة الاسم والتصنيف','Name and category are required'));
      return;
    }
    setSubmitting(true);
    const { error } = await RentalItems.createItem({
      provider_business_id: businessId,
      category_id: form.category_id,
      name_ar: form.name_ar,
      name_en: form.name_en || undefined,
      unit: form.unit,
      base_price: Number(form.base_price) || 0,
      min_duration: Number(form.min_duration) || 1,
      deposit_amount: Number(form.deposit_amount) || 0,
      usage_terms: form.usage_terms || undefined,
      late_terms: form.late_terms || undefined,
      penalty_terms: form.penalty_terms || undefined,
      images: imageUrl ? [imageUrl] : undefined,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم إنشاء العنصر وبانتظار المراجعة','Item created — pending review'));
    setAdding(false);
    setSelectedCatalogId(null);
    setImageUrl(null);
    setMode('pick');
    setForm(f => ({ ...f, name_ar: '', name_en: '', base_price: '0' }));
    await onChange();
  };

  const submitRequest = async () => {
    if (!reqForm.name_ar.trim()) {
      toast.error(bi('الرجاء كتابة اسم المعدة','Equipment name is required'));
      return;
    }
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { toast.error(bi('يلزم تسجيل الدخول','Sign-in required')); return; }
    setReqSubmitting(true);
    const { error } = await supabase.from('rental_catalog_addition_requests').insert({
      requester_user_id: user.id,
      requester_business_id: businessId,
      category_id: reqForm.category_id || null,
      proposed_category_name_ar: reqForm.proposed_category_name_ar || null,
      name_ar: reqForm.name_ar,
      name_en: reqForm.name_en || null,
      description_ar: reqForm.description_ar || null,
      brand: reqForm.brand || null,
      model: reqForm.model || null,
      suggested_unit: reqForm.suggested_unit,
      suggested_price: Number(reqForm.suggested_price) || 0,
      notes: reqForm.notes || null,
    });
    setReqSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم إرسال طلب إضافة المعدة للمراجعة','Request submitted for admin review'));
    setReqForm({
      name_ar: '', name_en: '', category_id: categories[0]?.id ?? '',
      proposed_category_name_ar: '', brand: '', model: '',
      suggested_unit: 'day', suggested_price: '0', description_ar: '', notes: '',
    });
    setMode('pick');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground"><Bi ar="عناصر التأجير المرتبطة بمنشأتك" en="Rental items linked to your business" /></div>
        <Button onClick={() => setAdding(s => !s)} className="hover-lift">
          <Plus className="size-4 me-1" />
          <Bi ar={adding ? 'إلغاء' : 'إضافة عنصر'} en={adding ? 'Cancel' : 'Add item'} />
        </Button>
      </div>

      {adding && (
        <Card className="p-5 space-y-4">
          {/* Mode switcher */}
          <div className="flex flex-wrap gap-2 border-b pb-3">
            <Button size="sm" variant={mode === 'pick' ? 'default' : 'outline'} onClick={() => setMode('pick')}>
              <Search className="size-4 me-1" /><Bi ar="اختيار من الكتالوج" en="Pick from catalog" />
            </Button>
            <Button size="sm" variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')}>
              <Plus className="size-4 me-1" /><Bi ar="إدخال يدوي" en="Manual entry" />
            </Button>
            <Button size="sm" variant={mode === 'request' ? 'default' : 'outline'} onClick={() => setMode('request')}>
              <Sparkles className="size-4 me-1" /><Bi ar="طلب إضافة معدة جديدة" en="Request new equipment" />
            </Button>
          </div>

          {mode === 'pick' && (
            <div className="space-y-3">
              {/* Step 1: choose category first */}
              {!catalogFilterCat ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold"><Bi ar="١. اختر التصنيف أولًا" en="1. Choose a category first" /></div>
                  {catalogLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {categories.map(c => {
                        const count = catalog.filter(it => it.category_id === c.id).length;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCatalogFilterCat(c.id)}
                            className="text-start p-3 rounded-xl border border-border hover-lift hover:border-primary transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                <Package className="size-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate text-sm">{isRTL ? c.name_ar : c.name_en}</div>
                                <div className="text-xs text-muted-foreground tech-content">{count} {bi('عنصر','items')}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Breadcrumb + back */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <button type="button" onClick={() => { setCatalogFilterCat(''); setCatalogQuery(''); }} className="text-primary hover:underline">
                        <Bi ar="التصنيفات" en="Categories" />
                      </button>
                      <span className="mx-2 text-muted-foreground">›</span>
                      <span className="font-medium">
                        {(() => {
                          const c = categories.find(x => x.id === catalogFilterCat);
                          return c ? (isRTL ? c.name_ar : c.name_en) : '';
                        })()}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setCatalogFilterCat(''); setCatalogQuery(''); }}>
                      <Bi ar="تغيير التصنيف" en="Change category" />
                    </Button>
                  </div>
                  <div className="text-sm font-semibold"><Bi ar="٢. اختر المعدة من القائمة" en="2. Pick equipment" /></div>
                  <Input
                    dir="auto"
                    placeholder={bi('ابحث داخل هذا التصنيف…','Search within this category…')}
                    value={catalogQuery}
                    onChange={e => setCatalogQuery(e.target.value)}
                  />
                  {catalogLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
                  ) : filteredCatalog.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground space-y-3">
                  <div><Bi ar="لم نجد معدة مطابقة في الكتالوج." en="No matching equipment in the catalog." /></div>
                  <Button size="sm" variant="outline" onClick={() => setMode('request')}>
                    <Sparkles className="size-4 me-1" /><Bi ar="اطلب إضافتها للكتالوج" en="Request to add it" />
                  </Button>
                </Card>
                  ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-auto">
                  {filteredCatalog.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickFromCatalog(c)}
                      className={`text-start p-3 rounded-xl border hover-lift transition ${selectedCatalogId === c.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <div className="flex items-center gap-3">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="size-12 rounded-lg object-cover bg-muted" loading="lazy" />
                        ) : (
                          <div className="size-12 rounded-lg bg-muted flex items-center justify-center"><Package className="size-5 text-muted-foreground" /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</div>
                          <div className="text-xs text-muted-foreground truncate tech-content">
                            {[c.brand, c.model].filter(Boolean).join(' · ') || '—'}
                          </div>
                          <div className="text-xs text-muted-foreground tech-content mt-0.5">
                            ~ {c.estimated_daily_price ?? 0} {c.currency ?? 'SAR'} / {bi('يوم','day')}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <Bi ar="اختر معدة لتعبئة الحقول تلقائيًا، يمكنك تعديل السعر والشروط قبل الحفظ." en="Pick an item to auto-fill fields. You can edit price & terms before saving." />
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && (
          <>
          {selectedCatalogId && (
            <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-lg px-3 py-2">
              <Bi ar="تم تعبئة الحقول من الكتالوج. يمكنك التعديل ثم الحفظ." en="Fields pre-filled from catalog. Edit then save." />
            </div>
          )}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Bi ar="البيانات الأساسية" en="Basic info" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="اسم المعدة بالعربية *" en="Name (Arabic) *" /></Label>
                <Input dir="auto" placeholder={bi('مثال: مولد كهرباء 10 ك.و.أ','e.g. Generator 10 kVA')} value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="الاسم بالإنجليزية (اختياري)" en="Name (English, optional)" /></Label>
                <Input dir="auto" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="التصنيف *" en="Category *" /></Label>
                <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder={bi('اختر التصنيف','Choose category')} /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="وحدة التأجير" en="Rental unit" /></Label>
                <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v as RentalUnit })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RENTAL_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{isRTL ? u.ar : u.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Bi ar="التسعير" en="Pricing" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="السعر للوحدة" en="Price per unit" /></Label>
                <Input type="number" inputMode="decimal" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} className="tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="الحد الأدنى للمدة" en="Minimum duration" /></Label>
                <Input type="number" inputMode="numeric" value={form.min_duration} onChange={e => setForm({ ...form, min_duration: e.target.value })} className="tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="مبلغ التأمين" en="Deposit amount" /></Label>
                <Input type="number" inputMode="decimal" value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: e.target.value })} className="tech-content" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Bi ar="الشروط والأحكام" en="Terms & conditions" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="شروط الاستخدام" en="Usage terms" /></Label>
                <Input dir="auto" value={form.usage_terms} onChange={e => setForm({ ...form, usage_terms: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="شروط التأخير" en="Late terms" /></Label>
                <Input dir="auto" value={form.late_terms} onChange={e => setForm({ ...form, late_terms: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="الشروط الجزائية" en="Penalty terms" /></Label>
                <Input dir="auto" value={form.penalty_terms} onChange={e => setForm({ ...form, penalty_terms: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting} className="hover-lift">
              {submitting && <Loader2 className="size-4 animate-spin me-1" />}
              <Bi ar="حفظ وإرسال للمراجعة" en="Save & submit for review" />
            </Button>
          </div>
          </>
          )}

          {mode === 'request' && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Bi ar="املأ بيانات المعدة المطلوب إضافتها، وسيتم مراجعتها من الإدارة قبل إضافتها للكتالوج." en="Fill in the equipment details. An admin will review before adding it to the catalog." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs"><Bi ar="اسم المعدة بالعربية *" en="Name (Arabic) *" /></Label>
                  <Input dir="auto" value={reqForm.name_ar} onChange={e => setReqForm({ ...reqForm, name_ar: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs"><Bi ar="الاسم بالإنجليزية" en="Name (English)" /></Label>
                  <Input dir="auto" value={reqForm.name_en} onChange={e => setReqForm({ ...reqForm, name_en: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs"><Bi ar="التصنيف الأقرب" en="Closest category" /></Label>
                  <Select value={reqForm.category_id} onValueChange={v => setReqForm({ ...reqForm, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder={bi('اختر','Choose')} /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs"><Bi ar="أو اقترح تصنيفًا جديدًا" en="Or propose a new category" /></Label>
                  <Input dir="auto" value={reqForm.proposed_category_name_ar} onChange={e => setReqForm({ ...reqForm, proposed_category_name_ar: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs"><Bi ar="الماركة" en="Brand" /></Label>
                  <Input dir="auto" value={reqForm.brand} onChange={e => setReqForm({ ...reqForm, brand: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs"><Bi ar="الموديل" en="Model" /></Label>
                  <Input dir="auto" value={reqForm.model} onChange={e => setReqForm({ ...reqForm, model: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs"><Bi ar="الوحدة المقترحة" en="Suggested unit" /></Label>
                  <Select value={reqForm.suggested_unit} onValueChange={v => setReqForm({ ...reqForm, suggested_unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RENTAL_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{isRTL ? u.ar : u.en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs"><Bi ar="السعر المقترح" en="Suggested price" /></Label>
                  <Input type="number" inputMode="decimal" value={reqForm.suggested_price} onChange={e => setReqForm({ ...reqForm, suggested_price: e.target.value })} className="tech-content" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="وصف مختصر" en="Short description" /></Label>
                <Textarea dir="auto" rows={2} value={reqForm.description_ar} onChange={e => setReqForm({ ...reqForm, description_ar: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="ملاحظات للإدارة" en="Notes for admin" /></Label>
                <Textarea dir="auto" rows={2} value={reqForm.notes} onChange={e => setReqForm({ ...reqForm, notes: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button onClick={submitRequest} disabled={reqSubmitting} className="hover-lift">
                  {reqSubmitting && <Loader2 className="size-4 animate-spin me-1" />}
                  <Sparkles className="size-4 me-1" />
                  <Bi ar="إرسال طلب الإضافة" en="Submit request" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Bi ar="لا توجد عناصر تأجير بعد." en="No rental items yet." />
        </Card>
      ) : (
        <ItemsGrid items={items} categories={categories} businessId={businessId} onChange={onChange} />
      )}
    </div>
  );
};

/* ---------- Orders panel ---------- */

/* ---------- Items grid (with inline image manager) ---------- */
const ItemsGrid: React.FC<{
  items: RentalItem[];
  categories: RentalCategory[];
  businessId: string;
  onChange: () => Promise<void>;
}> = ({ items, categories, businessId, onChange }) => {
  const { isRTL } = useLanguage();
  const [editingImagesFor, setEditingImagesFor] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map(it => {
        const cat = categories.find(c => c.id === it.category_id);
        const stat = ITEM_STATUS_LABELS[it.status];
        const editing = editingImagesFor === it.id;
        return (
          <Card key={it.id} className="p-4 hover-lift">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{isRTL ? it.name_ar : (it.name_en || it.name_ar)}</div>
              <span className="text-xs tech-content text-muted-foreground">{it.ref_id}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {cat ? (isRTL ? cat.name_ar : cat.name_en) : '—'}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="tech-content">{it.base_price} {it.currency} / {RENTAL_UNITS.find(u => u.value === it.unit)?.[isRTL ? 'ar' : 'en']}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted">{isRTL ? stat.ar : stat.en}</span>
            </div>
            <div className="mt-3">
              <Button size="sm" variant="ghost" onClick={() => setEditingImagesFor(editing ? null : it.id)}>
                <Bi ar={editing ? 'إخفاء الصور' : 'إدارة الصور'} en={editing ? 'Hide images' : 'Manage images'} />
              </Button>
            </div>
            {editing && (
              <div className="mt-3">
                <RentalImageUploader
                  itemId={it.id}
                  providerId={businessId}
                  initialUrls={Array.isArray(it.images) ? it.images : []}
                  onSaved={() => { void onChange(); }}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

const OrdersPanel: React.FC<{
  orders: RentalOrder[];
  items: RentalItem[];
  onChanged?: () => void | Promise<void>;
}> = ({ orders, items, onChanged }) => {
  const { isRTL } = useLanguage();
  const [openId, setOpenId] = useState<string | null>(null);
  if (orders.length === 0) {
    return <Card className="p-8 text-center text-muted-foreground"><Bi ar="لا توجد طلبات في هذه الفئة." en="No orders in this bucket." /></Card>;
  }
  return (
    <div className="space-y-3">
      {orders.map(o => {
        const it = items.find(i => i.id === o.rental_item_id);
        const isOpen = openId === o.id;
        return (
          <Card key={o.id} className="p-4 hover-lift">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">
                    {it ? (isRTL ? it.name_ar : (it.name_en || it.name_ar)) : '—'}
                  </span>
                  <RentalStatusBadge status={o.status} />
                </div>
                <div className="text-xs text-muted-foreground tech-content mt-1">
                  {o.ref_id} · {o.start_date} → {o.end_date} · {o.total_days}d · {o.total_amount} {o.currency}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RentalDayCounter endDate={o.end_date} size="sm" />
                <Button size="sm" variant="ghost" onClick={() => setOpenId(isOpen ? null : o.id)}>
                  <Bi ar={isOpen ? 'إخفاء' : 'إجراءات'} en={isOpen ? 'Hide' : 'Actions'} />
                </Button>
              </div>
            </div>
            {isOpen && (
              <div className="mt-3">
                <RentalExtensionPanel order={o} asProvider onChanged={onChanged} />
                <div className="mt-3">
                  <RentalOrderAssetLinks rentalOrderId={o.id} canManage />
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardRentals;