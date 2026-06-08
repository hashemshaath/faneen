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
import { Loader2, Plus, Package, CalendarClock, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  RentalCategories, RentalItems, RentalOrders,
  RENTAL_UNITS, ITEM_STATUS_LABELS,
} from '@/modules/rentals';
import type { RentalCategory, RentalItem, RentalOrder, RentalUnit } from '@/modules/rentals';
import { RentalStatusBadge } from '@/modules/rentals/components/RentalStatusBadge';
import { RentalDayCounter } from '@/modules/rentals/components/RentalDayCounter';
import { toast } from 'sonner';

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
          <TabsContent value="active" className="mt-4"><OrdersPanel orders={activeOrders} items={items} /></TabsContent>
          <TabsContent value="expiring" className="mt-4"><OrdersPanel orders={expiringOrders} items={items} /></TabsContent>
          <TabsContent value="overdue" className="mt-4"><OrdersPanel orders={overdueOrders} items={items} /></TabsContent>
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

  useEffect(() => {
    if (!form.category_id && categories[0]) setForm(f => ({ ...f, category_id: categories[0].id }));
  }, [categories, form.category_id]);

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
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم إنشاء العنصر وبانتظار المراجعة','Item created — pending review'));
    setAdding(false);
    setForm(f => ({ ...f, name_ar: '', name_en: '', base_price: '0' }));
    await onChange();
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input dir="auto" placeholder={bi('الاسم بالعربية','Name (Arabic)')} value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} />
            <Input dir="auto" placeholder={bi('الاسم بالإنجليزية (اختياري)','Name (English)')} value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
            <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder={bi('التصنيف','Category')} /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v as RentalUnit })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RENTAL_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{isRTL ? u.ar : u.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" inputMode="decimal" placeholder={bi('السعر','Price')} value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} className="tech-content" />
            <Input type="number" inputMode="numeric" placeholder={bi('الحد الأدنى للمدة','Min duration')} value={form.min_duration} onChange={e => setForm({ ...form, min_duration: e.target.value })} className="tech-content" />
            <Input type="number" inputMode="decimal" placeholder={bi('التأمين','Deposit')} value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: e.target.value })} className="tech-content" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input dir="auto" placeholder={bi('شروط الاستخدام','Usage terms')} value={form.usage_terms} onChange={e => setForm({ ...form, usage_terms: e.target.value })} />
            <Input dir="auto" placeholder={bi('شروط التأخير','Late terms')} value={form.late_terms} onChange={e => setForm({ ...form, late_terms: e.target.value })} />
            <Input dir="auto" placeholder={bi('الشروط الجزائية','Penalty terms')} value={form.penalty_terms} onChange={e => setForm({ ...form, penalty_terms: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting} className="hover-lift">
              {submitting && <Loader2 className="size-4 animate-spin me-1" />}
              <Bi ar="حفظ وإرسال للمراجعة" en="Save & submit for review" />
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Bi ar="لا توجد عناصر تأجير بعد." en="No rental items yet." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(it => {
            const cat = categories.find(c => c.id === it.category_id);
            const stat = ITEM_STATUS_LABELS[it.status];
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ---------- Orders panel ---------- */
const OrdersPanel: React.FC<{ orders: RentalOrder[]; items: RentalItem[] }> = ({ orders, items }) => {
  const { isRTL } = useLanguage();
  if (orders.length === 0) {
    return <Card className="p-8 text-center text-muted-foreground"><Bi ar="لا توجد طلبات في هذه الفئة." en="No orders in this bucket." /></Card>;
  }
  return (
    <div className="space-y-3">
      {orders.map(o => {
        const it = items.find(i => i.id === o.rental_item_id);
        return (
          <Card key={o.id} className="p-4 hover-lift flex items-center justify-between gap-3">
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
            <RentalDayCounter endDate={o.end_date} size="sm" />
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardRentals;