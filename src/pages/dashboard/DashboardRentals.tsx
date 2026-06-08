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
import { Loader2, Plus, Package, CalendarClock, AlertTriangle, Search, Sparkles, ImagePlus, ClipboardCheck, Rocket, Lightbulb, BookOpen, ShieldCheck, Boxes, Pencil, Tag, Timer, ImageOff, X } from 'lucide-react';
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
import { ImageUploader, type UploadedImageRow } from '@/components/common/ImageUploader';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

/** Preset chips appended to free-text terms fields. */
const USAGE_PRESETS = [
  { ar: 'الاستخدام داخل الموقع فقط', en: 'On-site use only' },
  { ar: 'يلزم وجود فني مؤهل للتشغيل', en: 'Qualified operator required' },
  { ar: 'يُمنع الاستخدام تحت المطر', en: 'No outdoor use in rain' },
  { ar: 'يلزم وقود من المستأجر', en: 'Fuel provided by renter' },
  { ar: 'صيانة دورية على المستأجر', en: 'Renter handles routine maintenance' },
];
const LATE_PRESETS = [
  { ar: 'رسوم تأخير يومية بنفس سعر الإيجار', en: 'Daily late fee equals rental rate' },
  { ar: 'فترة سماح ٢٤ ساعة', en: '24-hour grace period' },
  { ar: 'إشعار خطي قبل التمديد', en: 'Written notice required before extension' },
];
const PENALTY_PRESETS = [
  { ar: 'خصم من مبلغ التأمين عند التلف', en: 'Damages deducted from deposit' },
  { ar: 'استبدال القطع المفقودة بسعر السوق', en: 'Lost parts replaced at market price' },
  { ar: 'غرامة سوء الاستخدام ٢٠٪ من قيمة العقد', en: 'Misuse penalty 20% of contract value' },
];

const CONDITION_OPTIONS = [
  { value: 'new',      ar: 'جديد',        en: 'New' },
  { value: 'like_new', ar: 'كالجديد',     en: 'Like new' },
  { value: 'good',     ar: 'جيد',         en: 'Good' },
  { value: 'medium',   ar: 'متوسط',       en: 'Medium' },
  { value: 'used',     ar: 'مستعمل',      en: 'Used' },
] as const;

const COUNTRY_OPTIONS = [
  { value: 'SA', ar: 'السعودية', en: 'Saudi Arabia' },
  { value: 'AE', ar: 'الإمارات', en: 'UAE' },
  { value: 'CN', ar: 'الصين',    en: 'China' },
  { value: 'DE', ar: 'ألمانيا',  en: 'Germany' },
  { value: 'US', ar: 'أمريكا',   en: 'USA' },
  { value: 'JP', ar: 'اليابان',  en: 'Japan' },
  { value: 'KR', ar: 'كوريا',    en: 'South Korea' },
  { value: 'IT', ar: 'إيطاليا',  en: 'Italy' },
  { value: 'TR', ar: 'تركيا',    en: 'Turkey' },
  { value: 'IN', ar: 'الهند',    en: 'India' },
  { value: 'GB', ar: 'بريطانيا', en: 'UK' },
  { value: 'FR', ar: 'فرنسا',    en: 'France' },
  { value: 'other', ar: 'أخرى',  en: 'Other' },
];

const ELECTRICAL_KEYWORDS = ['كهرب','مولد','محول','شاحن','بطار','مضخ','electric','power','generator','ups','charger','battery','pump','motor'];

/** Reusable terms field: free text + togglable preset chips. */
const TermsField: React.FC<{
  label: string;
  presets: ReadonlyArray<{ ar: string; en: string }>;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, presets, value, onChange }) => {
  const { isRTL } = useLanguage();
  const lines = value.split('\n').map(s => s.trim()).filter(Boolean);
  const togglePreset = (text: string) => {
    const exists = lines.includes(text);
    const next = exists ? lines.filter(l => l !== text) : [...lines, text];
    onChange(next.join('\n'));
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => {
          const text = isRTL ? p.ar : p.en;
          const active = lines.includes(text);
          return (
            <Badge
              key={text}
              variant={active ? 'default' : 'outline'}
              className="cursor-pointer hover-lift text-[11px]"
              onClick={() => togglePreset(text)}
            >
              {active ? '✓ ' : '+ '}{text}
            </Badge>
          );
        })}
      </div>
      <Textarea dir="auto" rows={2} value={value} onChange={e => onChange(e.target.value)}
        placeholder={isRTL ? 'اختر من المقترحات أو اكتب نصًا خاصًا…' : 'Pick presets or type custom text…'} />
    </div>
  );
};

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

        <RentalsIntroBanner itemsCount={items.length} />

        <Tabs defaultValue="items" className="w-full">
          <TabsList className="bg-muted/40 flex-wrap h-auto">
            <TabsTrigger value="items" className="gap-2">
              <Bi ar="الأصناف" en="My items" />
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{items.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              <Bi ar="عقود نشطة" en="Active orders" />
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{activeOrders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="expiring" className="gap-2">
              <Bi ar="قريبة الانتهاء" en="Expiring" />
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300">{expiringOrders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-2">
              <Bi ar="متجاوزة" en="Overdue" />
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-red-500/15 text-red-700 dark:text-red-300">{overdueOrders.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <div className="space-y-4">
              <RentalsTipsStrip />
              <ItemsPanel
              businessId={businessId}
              categories={categories}
              items={items}
              onChange={async () => {
                const r = await RentalItems.listProviderItems(businessId);
                setItems(r.data ?? []);
              }}
              />
            </div>
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

/* ---------- Intro banner + tips strip (RENTALS UX polish) ---------- */

const RentalsIntroBanner: React.FC<{ itemsCount: number }> = ({ itemsCount }) => {
  const isEmpty = itemsCount === 0;
  return (
    <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-emerald-500/[0.05] p-5 md:p-6">
      <div className="absolute -top-10 -end-10 size-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="relative flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
        <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Package className="size-6" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg md:text-xl font-semibold">
              <Bi ar="مركز التأجير الخاص بك" en="Your Rentals Center" />
            </h2>
            <Badge variant="outline" className="text-[10px] bg-background/60">
              <ShieldCheck className="size-3 me-1" />
              <Bi ar="مراجعة قبل النشر" en="Reviewed before publish" />
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <Bi
              ar="هنا تنشر معداتك للإيجار وتديرها للعملاء: أضف الصنف، حدد السعر والمدة والشروط، ثم انشر بعد الاعتماد. لإدارة ما تملكه داخليًا (الصيانة والمخزون) استخدم قسم الأصول والمعدات."
              en="Publish and manage equipment you rent out to clients: add an item, set price, duration and terms, then publish after approval. To track what you internally own (maintenance & inventory), use the Assets & Equipment section."
            />
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="/dashboard/assets"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              <Boxes className="size-3.5" />
              <Bi ar="الانتقال إلى الأصول والمعدات" en="Go to Assets & Equipment" />
            </a>
            <span className="text-muted-foreground/40">•</span>
            <a
              href="/rentals"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              <BookOpen className="size-3.5" />
              <Bi ar="معاينة الكتالوج العام" en="Preview public catalog" />
            </a>
          </div>
        </div>
        {isEmpty && (
          <div className="md:max-w-[260px] w-full rounded-xl border border-dashed border-primary/30 bg-background/60 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
              <Rocket className="size-3.5" />
              <Bi ar="ابدأ في 3 خطوات" en="Get started in 3 steps" />
            </div>
            <ol className="space-y-1.5 text-[12px] text-muted-foreground">
              <li className="flex gap-2"><span className="size-4 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">1</span><Bi ar="اختر التصنيف وأضف الصنف" en="Pick category & add item" /></li>
              <li className="flex gap-2"><span className="size-4 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">2</span><Bi ar="ارفع صور واضحة وحدد السعر والمدة" en="Upload clear photos, set price & duration" /></li>
              <li className="flex gap-2"><span className="size-4 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">3</span><Bi ar="أرسل للمراجعة ثم انشر" en="Submit for review, then publish" /></li>
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
};

const RENTAL_TIPS: ReadonlyArray<{ icon: React.ComponentType<{ className?: string }>; ar: string; en: string; tone: string }> = [
  { icon: ImagePlus,      ar: 'صور حقيقية وواضحة ترفع فرص التأجير 3 أضعاف',         en: 'Real, sharp photos triple your rental chances',        tone: 'text-sky-600 bg-sky-500/10' },
  { icon: ClipboardCheck, ar: 'حدد شروط الاستخدام والتأخير بدقة لحماية معداتك',     en: 'Define usage & late terms clearly to protect your gear', tone: 'text-emerald-600 bg-emerald-500/10' },
  { icon: CalendarClock,  ar: 'تابع التنبيهات قبل ٣ أيام من انتهاء العقد للتمديد',  en: 'Watch alerts 3 days before expiry to renew on time',   tone: 'text-amber-600 bg-amber-500/10' },
  { icon: Lightbulb,      ar: 'سعر تنافسي + حد أدنى مرن = طلبات أكثر',              en: 'Competitive price + flexible minimum = more orders',    tone: 'text-fuchsia-600 bg-fuchsia-500/10' },
];

const RentalsTipsStrip: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {RENTAL_TIPS.map((t, i) => (
      <Card key={i} className="p-3 hover-lift border-border/50">
        <div className="flex items-start gap-2.5">
          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${t.tone}`}>
            <t.icon className="size-4" />
          </div>
          <p className="text-[12.5px] leading-snug text-muted-foreground pt-0.5">
            <Bi ar={t.ar} en={t.en} />
          </p>
        </div>
      </Card>
    ))}
  </div>
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
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
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
    brand: '',
    country_of_manufacture: '',
    condition: '' as '' | 'new' | 'like_new' | 'good' | 'medium' | 'used',
    voltage: '',
    current_amp: '',
    wattage: '',
    power_hp: '',
    provider_note: '',
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

  // List toolbar state (search + status filter)
  const [listQuery, setListQuery] = useState('');
  const [listStatus, setListStatus] = useState<'all' | RentalItem['status']>('all');

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
    setCoverUrl(c.image_url ?? null);
    setForm(f => ({
      ...f,
      name_ar: c.name_ar,
      name_en: c.name_en ?? '',
      category_id: c.category_id ?? f.category_id,
      base_price: String(c.estimated_daily_price ?? 0),
      brand: c.brand ?? f.brand,
    }));
    setMode('manual');
  };

  const submit = async () => {
    if (!form.name_ar.trim() || !form.category_id) {
      toast.error(bi('الرجاء تعبئة الاسم والتصنيف','Name and category are required'));
      return;
    }
    setSubmitting(true);
    const specs: Record<string, string> = {};
    const electricalErrors: string[] = [];
    const numericCheck = (label: string, raw: string) => {
      if (!raw) return;
      // Allow plain number; for power_hp allow trailing unit like "10 kVA"
      const numeric = parseFloat(raw);
      if (Number.isNaN(numeric) || numeric < 0) electricalErrors.push(label);
    };
    numericCheck(bi('الجهد','Voltage'), form.voltage);
    numericCheck(bi('التيار','Current'), form.current_amp);
    numericCheck(bi('الواط','Wattage'), form.wattage);
    if (form.voltage)     specs.voltage = form.voltage;
    if (form.current_amp) specs.current_amp = form.current_amp;
    if (form.wattage)     specs.wattage = form.wattage;
    if (form.power_hp)    specs.power_hp = form.power_hp;
    if (form.provider_note.trim()) specs.provider_note = form.provider_note.trim();
    if (electricalErrors.length) {
      setSubmitting(false);
      toast.error(bi('قيمة غير صحيحة في: ','Invalid numeric value in: ') + electricalErrors.join(', '));
      return;
    }
    const priceNum = Number(form.base_price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setSubmitting(false);
      toast.error(bi('السعر غير صحيح','Invalid price'));
      return;
    }
    const allImages = [coverUrl, ...galleryUrls].filter((u): u is string => Boolean(u));
    if (allImages.length > 6) {
      setSubmitting(false);
      toast.error(bi('الحد الأقصى صورة غلاف + ٥ صور إضافية','Limit: 1 cover + 5 additional images'));
      return;
    }
    const { error } = await RentalItems.createItem({
      provider_business_id: businessId,
      category_id: form.category_id,
      name_ar: form.name_ar,
      name_en: form.name_en || undefined,
      unit: form.unit,
      base_price: priceNum,
      min_duration: Number(form.min_duration) || 1,
      deposit_amount: Number(form.deposit_amount) || 0,
      usage_terms: form.usage_terms || undefined,
      late_terms: form.late_terms || undefined,
      penalty_terms: form.penalty_terms || undefined,
      images: allImages.length ? allImages : undefined,
      cover_image_url: coverUrl ?? undefined,
      brand: form.brand || undefined,
      country_of_manufacture: form.country_of_manufacture || undefined,
      condition: form.condition || undefined,
      specs: Object.keys(specs).length ? specs : undefined,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم إنشاء العنصر وبانتظار المراجعة','Item created — pending review'));
    setAdding(false);
    setSelectedCatalogId(null);
    setCoverUrl(null);
    setGalleryUrls([]);
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
      <ItemsToolbar
        total={items.length}
        adding={adding}
        onToggleAdd={() => setAdding(s => !s)}
        query={listQuery}
        onQueryChange={setListQuery}
        statusFilter={listStatus}
        onStatusChange={setListStatus}
      />

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
                <Input
                  dir="auto"
                  placeholder={bi('مثال: مولد كهرباء 10 ك.و.أ','e.g. Generator 10 kVA')}
                  value={form.name_ar}
                  readOnly={!!selectedCatalogId}
                  onChange={e => setForm({ ...form, name_ar: e.target.value })}
                  className={selectedCatalogId ? 'bg-muted cursor-not-allowed' : ''}
                  title={selectedCatalogId ? bi('الاسم العربي ثابت من الكتالوج الرسمي. يمكنك إضافة ملاحظة أدناه.','Arabic name is locked from the official catalog. Add a note below if needed.') : undefined}
                />
                {selectedCatalogId && (
                  <p className="text-[11px] text-muted-foreground">
                    <Bi
                      ar="اسم المعدة بالعربية مثبّت من الكتالوج الرسمي ولا يمكن تعديله. أضف ملاحظتك أدناه."
                      en="Arabic name is fixed from the official catalog. Add your note below."
                    />
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="الاسم بالإنجليزية (اختياري)" en="Name (English, optional)" /></Label>
                <Input dir="auto" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="التصنيف *" en="Category *" /></Label>
                {(() => {
                  const cat = categories.find(c => c.id === form.category_id);
                  return (
                    <div
                      className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground cursor-not-allowed"
                      title={bi('التصنيف مثبّت من اختيارك في الخطوة السابقة','Category is locked from your earlier selection')}
                    >
                      {cat ? (isRTL ? cat.name_ar : (cat.name_en || cat.name_ar)) : bi('—','—')}
                    </div>
                  );
                })()}
                <p className="text-[11px] text-muted-foreground">
                  <Bi
                    ar="التصنيف ثابت بناءً على اختيارك في الخطوة السابقة."
                    en="Category is fixed based on your earlier selection."
                  />
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                <Bi ar="ملاحظة مزود الخدمة على الاسم (اختياري)" en="Provider note on the name (optional)" />
              </Label>
              <Textarea
                dir="auto"
                rows={2}
                placeholder={bi('مثال: نفس الجهاز ولكن باللون الأصفر / موديل ٢٠٢٤','e.g. Same equipment but yellow / 2024 model')}
                value={form.provider_note}
                onChange={e => setForm({ ...form, provider_note: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                <Bi
                  ar="استخدم هذه الخانة لإضافة أي توضيح بشأن المعدة بدون تغيير اسمها الرسمي."
                  en="Use this field to clarify details without changing the official name."
                />
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Bi ar="التسعير" en="Pricing" />
            </div>
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              <Bi
                ar="جميع الأسعار المُدخلة هنا بدون قيمة الضريبة (١٥٪). تُحتسب الضريبة تلقائيًا عند إصدار الفاتورة."
                en="All prices entered here are excluding VAT (15%). VAT is added automatically at invoicing."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="وحدة التأجير" en="Rental unit" /></Label>
                <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v as RentalUnit })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RENTAL_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{isRTL ? u.ar : u.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="السعر للوحدة (بدون ضريبة) *" en="Price per unit (excl. VAT) *" /></Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  value={form.base_price}
                  onChange={e => {
                    // Allow digits and a single dot only — keeps price freely editable even after catalog pick
                    const v = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
                    setForm({ ...form, base_price: v });
                  }}
                  className="tech-content"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="الحد الأدنى للمدة" en="Minimum duration" /></Label>
                <Input type="text" inputMode="numeric" dir="ltr"
                  value={form.min_duration}
                  onChange={e => setForm({ ...form, min_duration: e.target.value.replace(/\D/g,'') })}
                  className="tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="مبلغ التأمين" en="Deposit amount" /></Label>
                <Input type="text" inputMode="decimal" dir="ltr"
                  value={form.deposit_amount}
                  onChange={e => {
                    const v = e.target.value.replace(/[^\d.]/g,'').replace(/(\..*)\./g,'$1');
                    setForm({ ...form, deposit_amount: v });
                  }}
                  className="tech-content" />
              </div>
            </div>
          </div>

          {/* Identification: brand / country / condition */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Bi ar="التعريف والحالة" en="Identification & condition" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="الماركة / البراند" en="Brand" /></Label>
                <Input dir="auto" placeholder={bi('مثال: Caterpillar','e.g. Caterpillar')} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="بلد الصنع" en="Country of manufacture" /></Label>
                <Select value={form.country_of_manufacture} onValueChange={v => setForm({ ...form, country_of_manufacture: v })}>
                  <SelectTrigger><SelectValue placeholder={bi('اختر البلد','Select country')} /></SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs"><Bi ar="حالة المعدة" en="Condition" /></Label>
                <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v as typeof form.condition })}>
                  <SelectTrigger><SelectValue placeholder={bi('اختر الحالة','Select condition')} /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Electrical specs — conditional on category/name keywords */}
          {(() => {
            const cat = categories.find(c => c.id === form.category_id);
            const haystack = `${cat?.name_ar ?? ''} ${cat?.name_en ?? ''} ${form.name_ar} ${form.name_en}`.toLowerCase();
            const showElectrical = ELECTRICAL_KEYWORDS.some(k => haystack.includes(k));
            if (!showElectrical) return null;
            return (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Bi ar="المواصفات الكهربائية" en="Electrical specs" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs"><Bi ar="الجهد (فولت)" en="Voltage (V)" /></Label>
                    <Input type="text" inputMode="decimal" placeholder="220" value={form.voltage} onChange={e => setForm({ ...form, voltage: e.target.value })} className="tech-content" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs"><Bi ar="التيار (أمبير)" en="Current (A)" /></Label>
                    <Input type="text" inputMode="decimal" placeholder="10" value={form.current_amp} onChange={e => setForm({ ...form, current_amp: e.target.value })} className="tech-content" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs"><Bi ar="القدرة (واط)" en="Wattage (W)" /></Label>
                    <Input type="text" inputMode="decimal" placeholder="1500" value={form.wattage} onChange={e => setForm({ ...form, wattage: e.target.value })} className="tech-content" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs"><Bi ar="القوة (HP/kVA)" en="Power (HP/kVA)" /></Label>
                    <Input type="text" inputMode="decimal" placeholder="10 kVA" value={form.power_hp} onChange={e => setForm({ ...form, power_hp: e.target.value })} className="tech-content" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Images: cover + gallery */}
          {businessId && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Bi ar="الصور" en="Images" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs"><Bi ar="صورة الغلاف (رئيسية)" en="Cover image (main)" /></Label>
                  {coverUrl ? (
                    <div className="relative">
                      <img src={coverUrl} alt="cover" className="w-full h-40 rounded-lg object-cover border" />
                      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setCoverUrl(null)}>
                        <Bi ar="تغيير الغلاف" en="Replace cover" />
                      </Button>
                    </div>
                  ) : (
                    <ImageUploader providerId={businessId} maxImages={1}
                      onChange={(rows: UploadedImageRow[]) => setCoverUrl(rows[0]?.url_large ?? null)} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs"><Bi ar="صور إضافية (حتى ٥ صور)" en="Additional images (up to 5)" /></Label>
                  <ImageUploader providerId={businessId} maxImages={5}
                    onChange={(rows: UploadedImageRow[]) => setGalleryUrls(rows.map(r => r.url_large))} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Bi ar="الشروط والأحكام" en="Terms & conditions" />
            </div>
            <TermsField
              label={bi('شروط الاستخدام','Usage terms')}
              presets={USAGE_PRESETS}
              value={form.usage_terms}
              onChange={v => setForm({ ...form, usage_terms: v })}
            />
            <TermsField
              label={bi('شروط التأخير','Late terms')}
              presets={LATE_PRESETS}
              value={form.late_terms}
              onChange={v => setForm({ ...form, late_terms: v })}
            />
            <TermsField
              label={bi('الشروط الجزائية','Penalty terms')}
              presets={PENALTY_PRESETS}
              value={form.penalty_terms}
              onChange={v => setForm({ ...form, penalty_terms: v })}
            />
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
        <ItemsEmptyState onAdd={() => setAdding(true)} />
      ) : (
        (() => {
          const q = listQuery.trim().toLowerCase();
          const filtered = items.filter(it => {
            if (listStatus !== 'all' && it.status !== listStatus) return false;
            if (!q) return true;
            return (
              it.name_ar?.toLowerCase().includes(q) ||
              (it.name_en ?? '').toLowerCase().includes(q) ||
              (it.brand ?? '').toLowerCase().includes(q) ||
              it.ref_id?.toLowerCase().includes(q)
            );
          });
          if (filtered.length === 0) {
            return (
              <Card className="p-8 text-center text-muted-foreground border-dashed">
                <Search className="size-6 mx-auto mb-2 opacity-60" />
                <Bi ar="لا توجد أصناف مطابقة للبحث/التصفية." en="No items match your search/filter." />
              </Card>
            );
          }
          return <ItemsGrid items={filtered} categories={categories} businessId={businessId} onChange={onChange} />;
        })()
      )}
    </div>
  );
};

/* ---------- Orders panel ---------- */

/* ---------- Items toolbar + empty state (professional, mobile-first) ---------- */

const ITEM_STATUS_FILTERS: ReadonlyArray<{ value: 'all' | RentalItem['status']; ar: string; en: string; tone?: string }> = [
  { value: 'all',            ar: 'الكل',         en: 'All' },
  { value: 'approved',       ar: 'منشورة',       en: 'Published',     tone: 'data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-700 dark:data-[active=true]:text-emerald-300' },
  { value: 'pending_review', ar: 'قيد المراجعة', en: 'Pending',       tone: 'data-[active=true]:bg-amber-500/15 data-[active=true]:text-amber-700 dark:data-[active=true]:text-amber-300' },
  { value: 'rejected',       ar: 'مرفوضة',       en: 'Rejected',      tone: 'data-[active=true]:bg-red-500/15 data-[active=true]:text-red-700 dark:data-[active=true]:text-red-300' },
  { value: 'draft',          ar: 'مسودة',        en: 'Draft' },
  { value: 'archived',       ar: 'مؤرشفة',       en: 'Archived' },
];

const ItemsToolbar: React.FC<{
  total: number;
  adding: boolean;
  onToggleAdd: () => void;
  query: string;
  onQueryChange: (v: string) => void;
  statusFilter: 'all' | RentalItem['status'];
  onStatusChange: (v: 'all' | RentalItem['status']) => void;
}> = ({ total, adding, onToggleAdd, query, onQueryChange, statusFilter, onStatusChange }) => {
  const bi = useBi();
  return (
    <Card className="p-3 md:p-4 border-border/60">
      <div className="flex flex-col gap-3">
        {/* Row 1: title + counter + CTA */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                <Bi ar="أصناف التأجير" en="Rental items" />
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="tech-content">{total}</span>{' '}
                <Bi ar="صنف مرتبط بمنشأتك" en="items linked to your business" />
              </div>
            </div>
          </div>
          <Button
            onClick={onToggleAdd}
            variant={adding ? 'outline' : 'default'}
            className="hover-lift shrink-0 h-10 px-3 md:px-4"
          >
            {adding ? <X className="size-4 me-1" /> : <Plus className="size-4 me-1" />}
            <span className="hidden xs:inline">
              <Bi ar={adding ? 'إلغاء الإضافة' : 'إضافة صنف'} en={adding ? 'Cancel' : 'Add item'} />
            </span>
            <span className="xs:hidden">
              <Bi ar={adding ? 'إلغاء' : 'إضافة'} en={adding ? 'Cancel' : 'Add'} />
            </span>
          </Button>
        </div>

        {total > 0 && (
          <>
            {/* Row 2: search */}
            <div className="relative">
              <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
              <Input
                dir="auto"
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder={bi('ابحث بالاسم، الماركة، أو المعرّف…', 'Search by name, brand, or ID…')}
                className="ps-9 h-10"
              />
            </div>

            {/* Row 3: status pills */}
            <div className="flex flex-wrap gap-1.5 -mx-0.5">
              {ITEM_STATUS_FILTERS.map(f => {
                const active = statusFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    data-active={active}
                    onClick={() => onStatusChange(f.value)}
                    className={`px-2.5 h-7 rounded-full text-[11.5px] font-medium border transition ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : `border-border bg-background hover:bg-muted ${f.tone ?? ''}`
                    }`}
                  >
                    <Bi ar={f.ar} en={f.en} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

const ItemsEmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <Card className="p-8 md:p-10 text-center border-dashed bg-gradient-to-br from-primary/[0.04] to-transparent">
    <div className="mx-auto size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
      <Package className="size-7" />
    </div>
    <h3 className="text-base md:text-lg font-semibold mb-1.5">
      <Bi ar="ابدأ بإضافة أول صنف للتأجير" en="Add your first rental item" />
    </h3>
    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
      <Bi
        ar="اختر من كتالوج المعدات الجاهز، أو أدخل البيانات يدويًا. سنراجع الصنف ثم ينشر للعملاء مباشرة."
        en="Pick from the ready equipment catalog or enter details manually. We review then publish to customers."
      />
    </p>
    <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
      <Button onClick={onAdd} className="hover-lift h-10">
        <Plus className="size-4 me-1" />
        <Bi ar="إضافة صنف الآن" en="Add item now" />
      </Button>
      <a
        href="/rentals"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium text-primary hover:bg-primary/5"
      >
        <BookOpen className="size-4" />
        <Bi ar="استكشف الكتالوج العام" en="Browse public catalog" />
      </a>
    </div>
  </Card>
);

/* ---------- Items grid (with inline image manager) ---------- */
const ItemsGrid: React.FC<{
  items: RentalItem[];
  categories: RentalCategory[];
  businessId: string;
  onChange: () => Promise<void>;
}> = ({ items, categories, businessId, onChange }) => {
  const { isRTL } = useLanguage();
  const [editingFor, setEditingFor] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
      {items.map(it => {
        const cat = categories.find(c => c.id === it.category_id);
        const stat = ITEM_STATUS_LABELS[it.status];
        const editing = editingFor === it.id;
        const cover = it.cover_image_url || (Array.isArray(it.images) && it.images[0]) || null;
        const unitLabel = RENTAL_UNITS.find(u => u.value === it.unit)?.[isRTL ? 'ar' : 'en'];
        const statusTone =
          it.status === 'approved' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' :
          it.status === 'pending_review' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20' :
          it.status === 'rejected' ? 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20' :
          'bg-muted text-muted-foreground border-border';
        return (
          <Card key={it.id} className="overflow-hidden hover-lift flex flex-col border-border/60">
            {/* Cover */}
            <div className="relative w-full aspect-[16/10] bg-muted/60 overflow-hidden">
              {cover ? (
                <img
                  src={cover}
                  alt={isRTL ? it.name_ar : (it.name_en || it.name_ar)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-1">
                  <ImageOff className="size-7" />
                  <span className="text-[11px]"><Bi ar="بدون صورة" en="No image" /></span>
                </div>
              )}
              <span className={`absolute top-2 end-2 text-[10.5px] font-medium px-2 py-0.5 rounded-full border backdrop-blur-sm ${statusTone}`}>
                {isRTL ? stat.ar : stat.en}
              </span>
              {cat && (
                <span className="absolute bottom-2 start-2 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-background/85 backdrop-blur-sm border border-border/60 inline-flex items-center gap-1">
                  <Tag className="size-3" />
                  {isRTL ? cat.name_ar : cat.name_en}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-3.5 md:p-4 flex-1 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-[14.5px] leading-tight line-clamp-2 min-w-0">
                  {isRTL ? it.name_ar : (it.name_en || it.name_ar)}
                </div>
                <span className="text-[10px] tech-content text-muted-foreground shrink-0 rounded-md bg-muted px-1.5 py-0.5">
                  {it.ref_id}
                </span>
              </div>

              {it.brand && (
                <div className="text-[11.5px] text-muted-foreground -mt-1">
                  {it.brand}
                </div>
              )}

              {/* Price + duration */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
                <div className="rounded-lg bg-primary/5 border border-primary/10 px-2.5 py-1.5">
                  <div className="text-[10px] text-muted-foreground"><Bi ar="السعر / الوحدة" en="Price / unit" /></div>
                  <div className="text-[13px] font-semibold text-primary tech-content leading-tight">
                    {it.base_price} <span className="text-[10px] font-normal opacity-80">{it.currency}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">/ {unitLabel} · <Bi ar="بدون ض" en="excl. VAT" /></div>
                </div>
                <div className="rounded-lg bg-muted/60 border border-border/60 px-2.5 py-1.5">
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Timer className="size-3" /><Bi ar="الحد الأدنى" en="Min duration" />
                  </div>
                  <div className="text-[13px] font-semibold tech-content leading-tight">
                    {it.min_duration} <span className="text-[10px] font-normal opacity-80">{unitLabel}</span>
                  </div>
                  {it.deposit_amount > 0 && (
                    <div className="text-[10px] text-muted-foreground"><Bi ar="تأمين" en="Deposit" />: <span className="tech-content">{it.deposit_amount}</span></div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant={editing ? 'default' : 'outline'}
                  onClick={() => setEditingFor(editing ? null : it.id)}
                  className="flex-1 h-9"
                >
                  {editing ? <X className="size-3.5 me-1" /> : <Pencil className="size-3.5 me-1" />}
                  <Bi ar={editing ? 'إغلاق' : 'تعديل'} en={editing ? 'Close' : 'Edit'} />
                </Button>
                {it.is_published && it.seo_slug && (
                  <a
                    href={`/rentals/${it.seo_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-md text-xs font-medium border border-border hover:bg-muted"
                  >
                    <BookOpen className="size-3.5" />
                    <Bi ar="عرض" en="View" />
                  </a>
                )}
              </div>
            </div>

            {editing && (
              <div className="px-3.5 md:px-4 pb-4 -mt-1">
                <RentalItemEditForm
                  item={it}
                  categories={categories}
                  businessId={businessId}
                  onSaved={async () => { await onChange(); }}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

/* ---------- Inline edit form for an existing rental item ---------- */
const RentalItemEditForm: React.FC<{
  item: RentalItem;
  categories: RentalCategory[];
  businessId: string;
  onSaved: () => Promise<void> | void;
}> = ({ item, categories, businessId, onSaved }) => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  const initialImages = Array.isArray(item.images) ? (item.images as string[]) : [];
  const initialCover = item.cover_image_url ?? initialImages[0] ?? null;
  const initialGallery = initialImages.filter(u => u !== initialCover).slice(0, 5);
  const initialSpecs = (item.specs ?? {}) as Record<string, string>;

  const [saving, setSaving] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCover);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialGallery);
  const [form, setForm] = useState({
    name_ar: item.name_ar,
    name_en: item.name_en ?? '',
    category_id: item.category_id,
    unit: item.unit,
    base_price: String(item.base_price ?? 0),
    min_duration: String(item.min_duration ?? 1),
    deposit_amount: String(item.deposit_amount ?? 0),
    usage_terms: item.usage_terms ?? '',
    late_terms: item.late_terms ?? '',
    penalty_terms: item.penalty_terms ?? '',
    brand: item.brand ?? '',
    country_of_manufacture: item.country_of_manufacture ?? '',
    condition: (item.condition ?? '') as '' | 'new' | 'like_new' | 'good' | 'medium' | 'used',
    voltage: initialSpecs.voltage ?? '',
    current_amp: initialSpecs.current_amp ?? '',
    wattage: initialSpecs.wattage ?? '',
    power_hp: initialSpecs.power_hp ?? '',
    provider_note: initialSpecs.provider_note ?? '',
  });

  const cat = categories.find(c => c.id === form.category_id);
  const haystack = `${cat?.name_ar ?? ''} ${cat?.name_en ?? ''} ${form.name_ar} ${form.name_en}`.toLowerCase();
  const showElectrical = ELECTRICAL_KEYWORDS.some(k => haystack.includes(k));

  const handleSave = async () => {
    const priceNum = Number(form.base_price);
    if (!Number.isFinite(priceNum) || priceNum < 0) { toast.error(bi('السعر غير صحيح','Invalid price')); return; }
    const specs: Record<string, string> = {};
    if (showElectrical) {
      const numCheck = (raw: string, label: string) => {
        if (!raw) return true;
        const n = parseFloat(raw);
        if (Number.isNaN(n) || n < 0) { toast.error(bi('قيمة غير صحيحة: ','Invalid value: ') + label); return false; }
        return true;
      };
      if (!numCheck(form.voltage, bi('الجهد','Voltage'))) return;
      if (!numCheck(form.current_amp, bi('التيار','Current'))) return;
      if (!numCheck(form.wattage, bi('الواط','Wattage'))) return;
      if (form.voltage)     specs.voltage = form.voltage;
      if (form.current_amp) specs.current_amp = form.current_amp;
      if (form.wattage)     specs.wattage = form.wattage;
      if (form.power_hp)    specs.power_hp = form.power_hp;
    }
    if (form.provider_note.trim()) specs.provider_note = form.provider_note.trim();
    const allImages = [coverUrl, ...galleryUrls].filter((u): u is string => Boolean(u));
    if (allImages.length > 6) { toast.error(bi('الحد الأقصى صورة غلاف + ٥ صور إضافية','Limit: 1 cover + 5 additional images')); return; }
    setSaving(true);
    const { error } = await RentalItems.updateItem(item.id, {
      name_ar: form.name_ar,
      name_en: form.name_en || undefined,
      category_id: form.category_id,
      unit: form.unit,
      base_price: priceNum,
      min_duration: Number(form.min_duration) || 1,
      deposit_amount: Number(form.deposit_amount) || 0,
      usage_terms: form.usage_terms || undefined,
      late_terms: form.late_terms || undefined,
      penalty_terms: form.penalty_terms || undefined,
      brand: form.brand || undefined,
      country_of_manufacture: form.country_of_manufacture || undefined,
      condition: form.condition || undefined,
      cover_image_url: coverUrl ?? undefined,
      images: allImages,
      specs,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم حفظ التعديلات','Changes saved'));
    await onSaved();
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="اسم المعدة بالعربية *" en="Name (Arabic) *" /></Label>
          <Input
            dir="auto"
            value={form.name_ar}
            readOnly
            className="bg-muted cursor-not-allowed"
            title={bi('الاسم العربي ثابت من الكتالوج الرسمي. أضف ملاحظة أدناه.','Arabic name is locked from the official catalog. Add a note below.')}
          />
          <p className="text-[11px] text-muted-foreground">
            <Bi
              ar="لا يمكن لمزود الخدمة تعديل الاسم العربي. استخدم ملاحظة المزود أدناه."
              en="Providers cannot edit the Arabic name. Use the provider note below."
            />
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="الاسم بالإنجليزية" en="Name (English)" /></Label>
          <Input dir="auto" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="التصنيف *" en="Category *" /></Label>
          <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          <Bi ar="ملاحظة مزود الخدمة (اختياري)" en="Provider note (optional)" />
        </Label>
        <Textarea
          dir="auto"
          rows={2}
          placeholder={bi('أي توضيح بشأن المعدة دون تغيير الاسم الرسمي','Any clarification about the equipment without changing the official name')}
          value={form.provider_note}
          onChange={e => setForm({ ...form, provider_note: e.target.value })}
        />
      </div>

      <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        <Bi ar="السعر بدون قيمة الضريبة (١٥٪) — تُحتسب عند الفوترة." en="Price is excluding VAT (15%) — added at invoicing." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="وحدة التأجير" en="Rental unit" /></Label>
          <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v as RentalUnit })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RENTAL_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{isRTL ? u.ar : u.en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="السعر للوحدة (بدون ضريبة) *" en="Price per unit (excl. VAT) *" /></Label>
          <Input type="text" inputMode="decimal" dir="ltr"
            value={form.base_price}
            onChange={e => {
              const v = e.target.value.replace(/[^\d.]/g,'').replace(/(\..*)\./g,'$1');
              setForm({ ...form, base_price: v });
            }}
            className="tech-content" placeholder="0.00" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="الحد الأدنى للمدة" en="Minimum duration" /></Label>
          <Input type="text" inputMode="numeric" dir="ltr"
            value={form.min_duration}
            onChange={e => setForm({ ...form, min_duration: e.target.value.replace(/\D/g,'') })}
            className="tech-content" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="مبلغ التأمين" en="Deposit amount" /></Label>
          <Input type="text" inputMode="decimal" dir="ltr"
            value={form.deposit_amount}
            onChange={e => {
              const v = e.target.value.replace(/[^\d.]/g,'').replace(/(\..*)\./g,'$1');
              setForm({ ...form, deposit_amount: v });
            }}
            className="tech-content" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="الماركة" en="Brand" /></Label>
          <Input dir="auto" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="بلد الصنع" en="Country" /></Label>
          <Select value={form.country_of_manufacture} onValueChange={v => setForm({ ...form, country_of_manufacture: v })}>
            <SelectTrigger><SelectValue placeholder={bi('اختر','Choose')} /></SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="الحالة" en="Condition" /></Label>
          <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v as typeof form.condition })}>
            <SelectTrigger><SelectValue placeholder={bi('اختر','Choose')} /></SelectTrigger>
            <SelectContent>
              {CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showElectrical && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Bi ar="المواصفات الكهربائية" en="Electrical specs" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs"><Bi ar="الجهد (V)" en="Voltage (V)" /></Label>
              <Input type="text" inputMode="decimal" dir="ltr" value={form.voltage} onChange={e => setForm({ ...form, voltage: e.target.value.replace(/[^\d.]/g,'') })} className="tech-content" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><Bi ar="التيار (A)" en="Current (A)" /></Label>
              <Input type="text" inputMode="decimal" dir="ltr" value={form.current_amp} onChange={e => setForm({ ...form, current_amp: e.target.value.replace(/[^\d.]/g,'') })} className="tech-content" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><Bi ar="الواط (W)" en="Wattage (W)" /></Label>
              <Input type="text" inputMode="decimal" dir="ltr" value={form.wattage} onChange={e => setForm({ ...form, wattage: e.target.value.replace(/[^\d.]/g,'') })} className="tech-content" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><Bi ar="القوة (HP/kVA)" en="Power (HP/kVA)" /></Label>
              <Input type="text" inputMode="decimal" dir="ltr" value={form.power_hp} onChange={e => setForm({ ...form, power_hp: e.target.value })} className="tech-content" />
            </div>
          </div>
        </div>
      )}

      {/* Images */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Bi ar="الصور (غلاف + حتى ٥ إضافية)" en="Images (cover + up to 5 additional)" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs"><Bi ar="صورة الغلاف" en="Cover" /></Label>
            {coverUrl ? (
              <div>
                <img src={coverUrl} alt="cover" className="w-full h-36 rounded-lg object-cover border" />
                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setCoverUrl(null)}>
                  <Bi ar="تغيير الغلاف" en="Replace cover" />
                </Button>
              </div>
            ) : (
              <ImageUploader providerId={businessId} maxImages={1}
                onChange={(rows: UploadedImageRow[]) => setCoverUrl(rows[0]?.url_large ?? null)} />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs"><Bi ar="صور إضافية" en="Additional images" /></Label>
            {galleryUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {galleryUrls.map((u, idx) => (
                  <div key={u} className="relative group">
                    <img src={u} alt="" className="w-full h-20 object-cover rounded-md border" />
                    <button type="button"
                      onClick={() => setGalleryUrls(galleryUrls.filter((_, i) => i !== idx))}
                      className="absolute top-1 end-1 bg-destructive text-destructive-foreground text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100">
                      <Bi ar="حذف" en="Remove" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {galleryUrls.length < 5 ? (
              <ImageUploader providerId={businessId} maxImages={5 - galleryUrls.length}
                onChange={(rows: UploadedImageRow[]) => {
                  const next = [...galleryUrls, ...rows.map(r => r.url_large)].slice(0, 5);
                  setGalleryUrls(next);
                }} />
            ) : (
              <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-md px-2 py-1.5">
                <Bi ar="تم بلوغ الحد الأقصى (٥ صور). احذف صورة لإضافة أخرى." en="Limit reached (5 images). Remove one to add another." />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Bi ar="الشروط والأحكام" en="Terms & conditions" />
        </div>
        <TermsField label={bi('شروط الاستخدام','Usage terms')} presets={USAGE_PRESETS}
          value={form.usage_terms} onChange={v => setForm({ ...form, usage_terms: v })} />
        <TermsField label={bi('شروط التأخير','Late terms')} presets={LATE_PRESETS}
          value={form.late_terms} onChange={v => setForm({ ...form, late_terms: v })} />
        <TermsField label={bi('الشروط الجزائية','Penalty terms')} presets={PENALTY_PRESETS}
          value={form.penalty_terms} onChange={v => setForm({ ...form, penalty_terms: v })} />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="hover-lift">
          {saving && <Loader2 className="size-4 animate-spin me-1" />}
          <Bi ar="حفظ التعديلات" en="Save changes" />
        </Button>
      </div>
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