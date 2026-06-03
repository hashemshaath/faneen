import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, ogImageFor } from '@/lib/seo/structured-data';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2, User, Mail, Phone, Globe, FileText, MapPin, ShieldCheck,
  CheckCircle2, Plus, Trash2, Loader2, Sparkles, Lock, Clock, Award, Users, TrendingUp, FileCheck2,
  Search, X, Tag, Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { submitProviderLead } from '@/modules/providers';
import { listActiveCategories } from '@/modules/categories';
import coverImage from '@/assets/provider-join-cover.jpg';
import type {
  ProviderLeadChannel,
  ProviderLeadBranchInput,
} from '@/modules/providers/types';
import {
  PROVIDER_LEAD_DOC_MAX_BYTES,
  PROVIDER_LEAD_DOC_MIMES,
} from '@/modules/files/domain/providerLeadDocuments';

interface FormState {
  name_ar: string;
  name_en: string;
  contact_name: string;
  email: string;
  phone: string;
  preferred_channel: ProviderLeadChannel;
  website: string;
  cr_number: string;
  unified_number: string;
  vat_number: string;
  main_activity: string;
  specialties: string[];
  brands: string[];
  brief: string;
  map_link: string;
  national_address: string;
  city: string;
  branches_count: number;
}

const EMPTY: FormState = {
  name_ar: '', name_en: '', contact_name: '', email: '', phone: '',
  preferred_channel: 'phone', website: '', cr_number: '', unified_number: '',
  vat_number: '', main_activity: '', specialties: [], brands: [], brief: '',
  map_link: '', national_address: '', city: '', branches_count: 1,
};

interface CategoryOption {
  id: string;
  name_ar: string;
  name_en: string;
}

const ProviderJoin: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [branches, setBranches] = useState<ProviderLeadBranchInput[]>([]);
  const [crFile, setCrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Load category catalog for the specialties picker
  useEffect(() => {
    let alive = true;
    listActiveCategories<CategoryOption>({ select: 'id, name_ar, name_en' }).then(({ data }) => {
      if (alive && data) setCategories(data);
    });
    return () => { alive = false; };
  }, []);

  // Keep branches list in sync with branches_count
  useEffect(() => {
    const target = Math.max(1, Number(form.branches_count) || 1);
    setBranches((prev) => {
      const needed = Math.max(0, target - 1); // primary branch is the main contact
      if (prev.length === needed) return prev;
      if (prev.length < needed) {
        return [
          ...prev,
          ...Array.from({ length: needed - prev.length }, () => ({
            branch_name: '', city: '', address: '', map_link: '', phone: '',
          })),
        ];
      }
      return prev.slice(0, needed);
    });
  }, [form.branches_count]);

  usePageMeta({
    title: t('انضم إلى قِطاعات | تسجيل المنشآت', 'Join Qitaat | Provider Registration'),
    description: t(
      'سجّل منشأتك في قِطاعات — المنصة الصناعية الأولى للألمنيوم والزجاج والخشب والحديد.',
      'Register your business on Qitaat — the leading industrial directory for Aluminum, Glass, Wood, and Steel providers.',
    ),
    canonical: 'https://qitaat.com/join/qitaat',
    ogTitle: t('انضم إلى قِطاعات', 'Join Qitaat'),
    ogDescription: t('قدّم طلب الانضمام إلى منصة قِطاعات.', 'Submit your join request to Qitaat.'),
    ogImage: ogImageFor('contact'),
  });

  useMultiJsonLd(useMemo(() => {
    const crumbs = buildBreadcrumbList([
      { name: language === 'ar' ? 'انضم إلى قطاعات' : 'Join Qitaat', url: '/join/qitaat' },
    ]);
    return crumbs ? [crumbs] : null;
  }, [language]));

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addBranch = () =>
    setBranches((b) => [...b, { branch_name: '', city: '', address: '', map_link: '', phone: '' }]);
  const removeBranch = (i: number) =>
    setBranches((b) => b.filter((_, idx) => idx !== i));
  const updateBranch = (i: number, k: keyof ProviderLeadBranchInput, v: string) =>
    setBranches((b) => b.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setCrFile(null); return; }
    if (f.size > PROVIDER_LEAD_DOC_MAX_BYTES) {
      toast.error(t('حجم الملف يتجاوز 5 ميغابايت', 'File exceeds 5 MB'));
      e.target.value = '';
      return;
    }
    if (!(PROVIDER_LEAD_DOC_MIMES as readonly string[]).includes(f.type)) {
      toast.error(t('نوع الملف غير مدعوم. PDF أو JPG أو PNG فقط.', 'Unsupported file type. PDF/JPG/PNG only.'));
      e.target.value = '';
      return;
    }
    setCrFile(f);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot + form-time check
    if (honeypotRef.current?.value) return;
    if (Date.now() - startTimeRef.current < 1500) {
      toast.error(t('تعذّر التحقق من الطلب', 'Could not verify request'));
      return;
    }

    if (!form.name_ar.trim() || !form.contact_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error(t('يرجى تعبئة الحقول المطلوبة', 'Please fill required fields'));
      return;
    }

    setLoading(true);
    try {
      const result = await submitProviderLead(
        {
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || undefined,
          contact_name: form.contact_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          preferred_channel: form.preferred_channel,
          website: form.website.trim() || undefined,
          cr_number: form.cr_number.trim() || undefined,
          unified_number: form.unified_number.trim() || undefined,
          vat_number: form.vat_number.trim() || undefined,
          main_activity: form.main_activity.trim() || undefined,
          specialties: form.specialties.map((s) => s.trim()).filter(Boolean),
          brands: form.brands.map((s) => s.trim()).filter(Boolean),
          brief: form.brief.trim() || undefined,
          map_link: form.map_link.trim() || undefined,
          national_address: form.national_address.trim() || undefined,
          city: form.city.trim() || undefined,
          branches_count: Math.max(1, Number(form.branches_count) || 1),
          branches: branches
            .filter((b) => b.branch_name.trim().length > 0)
            .map((b) => ({
              branch_name: b.branch_name.trim(),
              city: b.city?.trim() || undefined,
              address: b.address?.trim() || undefined,
              map_link: b.map_link?.trim() || undefined,
              phone: b.phone?.trim() || undefined,
            })),
        },
        crFile,
      );

      if (!result.ok) {
        const map: Record<string, string> = {
          invalid_email: t('البريد الإلكتروني غير صحيح', 'Invalid email'),
          invalid_phone: t('رقم الجوال غير صحيح', 'Invalid phone'),
          duplicate_request: t('يوجد طلب قائم بنفس البيانات قيد المراجعة', 'A pending request with the same details already exists'),
          rate_limited: t('عدد كبير من المحاولات. حاول لاحقاً.', 'Too many attempts. Try again later.'),
          upload_failed: t('فشل رفع السجل التجاري', 'CR upload failed'),
          unknown: t('تعذّر إرسال الطلب. حاول مرة أخرى.', 'Could not submit. Please try again.'),
        };
        toast.error(map[result.errorCode ?? 'unknown']);
        return;
      }
      setSuccess(result.data!.reference_code);
    } catch {
      toast.error(t('حدث خطأ غير متوقع', 'Unexpected error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="max-w-xl w-full rounded-2xl shadow-elegant">
            <CardContent className="p-10 text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold">
                {t('تم استلام طلبكم بنجاح', 'Your request was received')}
              </h1>
              <p className="text-muted-foreground">
                {t(
                  'سعادتنا بثقتكم بقطاعات، تم استلام طلبكم وسيتم مراجعته وإرسال تأكيد التسجيل خلال فترة قصيرة.',
                  "Thank you for trusting Qitaat. We've received your request and will review it shortly.",
                )}
              </p>
              <div className="rounded-xl border bg-muted/40 px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  {t('الرقم المرجعي', 'Reference')}
                </div>
                <div className="font-mono text-lg tech-content">{success}</div>
              </div>
              <Button onClick={() => { setSuccess(null); setForm(EMPTY); setBranches([]); setCrFile(null); }} variant="outline" className="rounded-xl">
                {t('تقديم طلب جديد', 'Submit another request')}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero with cover image */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0">
            <img
              src={coverImage}
              alt=""
              aria-hidden="true"
              width={1920}
              height={1080}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/95" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.25),transparent_60%)]" />
          </div>
          <div className="relative container mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 max-w-5xl text-center text-white">
            <Badge variant="secondary" className="mb-5 rounded-full bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/15">
              <Sparkles className="w-3.5 h-3.5 me-1.5" />
              {t('انضم إلى أكبر منصة صناعية في المملكة', 'The leading industrial directory in Saudi Arabia')}
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              {t('سجّل منشأتك في قِطاعات', 'Register your business on Qitaat')}
            </h1>
            <p className="mt-5 text-white/80 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              {t(
                'وصول لعملاء محتملين، عرض احترافي لمنشأتك، وأدوات إدارة متكاملة. التسجيل مجاني ولا يتطلب إنشاء حساب.',
                'Reach more clients, showcase your business professionally, and access powerful tools. Free registration — no account required.',
              )}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" />{t('بياناتكم محمية ومشفّرة', 'Encrypted & secure')}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-sky-300" />{t('مراجعة خلال 24-48 ساعة', '24–48h review')}</span>
              <span className="inline-flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-300" />{t('فريق متخصص', 'Specialized team')}</span>
            </div>

            {/* Stats strip */}
            <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto">
              {[
                { icon: <Users className="w-5 h-5" />, value: '+12K', label: t('عميل شهرياً', 'Monthly clients') },
                { icon: <Building2 className="w-5 h-5" />, value: '+800', label: t('منشأة مسجلة', 'Registered businesses') },
                { icon: <TrendingUp className="w-5 h-5" />, value: '4×', label: t('متوسط نمو الطلبات', 'Avg. lead growth') },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm px-3 py-4 sm:p-5">
                  <div className="flex items-center justify-center text-white/70 mb-1.5">{s.icon}</div>
                  <div className="text-xl sm:text-2xl font-bold tech-content">{s.value}</div>
                  <div className="text-[11px] sm:text-xs text-white/70 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process steps */}
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-5xl">
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                { n: '1', icon: <FileCheck2 className="w-5 h-5" />, title: t('املأ الطلب', 'Fill the form'), desc: t('بيانات المنشأة والتواصل والنشاط — أقل من 3 دقائق.', 'Business, contact and activity info — under 3 minutes.') },
                { n: '2', icon: <ShieldCheck className="w-5 h-5" />, title: t('مراجعة الفريق', 'Team review'), desc: t('نراجع البيانات والسجل التجاري للتحقق.', 'We verify your data and CR documents.') },
                { n: '3', icon: <Award className="w-5 h-5" />, title: t('تفعيل الحساب', 'Activation'), desc: t('نرسل تأكيداً برابط تفعيل الملف وإدارته.', 'Confirmation email with activation & management link.') },
              ].map((s, i) => (
                <div key={i} className="relative rounded-2xl border bg-card p-5 hover-lift">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{s.icon}</span>
                    <span className="text-xs font-mono text-muted-foreground tech-content">STEP {s.n}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-4xl">
          <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6" noValidate>
            {/* Honeypot — hidden from real users */}
            <input
              ref={honeypotRef}
              type="text"
              name="company_url_hp"
              tabIndex={-1}
              autoComplete="off"
              className="absolute opacity-0 pointer-events-none -z-10 h-0 w-0"
              aria-hidden="true"
            />

            {/* Section 1 — Establishment */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 sm:p-6 md:p-8 space-y-5">
                <SectionHeader icon={<Building2 className="w-5 h-5" />} title={t('بيانات المنشأة', 'Establishment Info')} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t('اسم المنشأة بالعربي *', 'Business name (Arabic) *')}>
                    <Input dir="auto" required value={form.name_ar} onChange={(e) => update('name_ar', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('اسم المنشأة بالإنجليزي', 'Business name (English)')}>
                    <Input dir="auto" value={form.name_en} onChange={(e) => update('name_en', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('السجل التجاري', 'Commercial Registration')}>
                    <Input dir="auto" value={form.cr_number} onChange={(e) => update('cr_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('الرقم الموحد', 'Unified Number')}>
                    <Input dir="auto" value={form.unified_number} onChange={(e) => update('unified_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('الرقم الضريبي', 'VAT Number')}>
                    <Input dir="auto" value={form.vat_number} onChange={(e) => update('vat_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('الموقع الإلكتروني', 'Website')}>
                    <Input type="url" dir="auto" placeholder="https://" value={form.website} onChange={(e) => update('website', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                </div>
                <Field label={t('نبذة مختصرة عن المنشأة', 'Short description')}>
                  <Textarea dir="auto" rows={3} maxLength={2000} value={form.brief} onChange={(e) => update('brief', e.target.value)} className="rounded-xl" />
                </Field>
              </CardContent>
            </Card>

            {/* Section 2 — Contact */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 sm:p-6 md:p-8 space-y-5">
                <SectionHeader icon={<User className="w-5 h-5" />} title={t('بيانات التواصل', 'Contact Person')} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t('اسم المسؤول *', 'Contact name *')}>
                    <Input dir="auto" required value={form.contact_name} onChange={(e) => update('contact_name', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('البريد الإلكتروني *', 'Email *')}>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" required dir="ltr" value={form.email} onChange={(e) => update('email', e.target.value)} className="h-12 rounded-xl ps-9 tech-content" />
                    </div>
                  </Field>
                  <Field label={t('رقم الجوال *', 'Phone *')}>
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="tel" required dir="ltr" placeholder="05xxxxxxxx" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="h-12 rounded-xl ps-9 tech-content" />
                    </div>
                  </Field>
                  <Field label={t('وسيلة التواصل المفضلة', 'Preferred channel')}>
                    <select
                      value={form.preferred_channel}
                      onChange={(e) => update('preferred_channel', e.target.value as ProviderLeadChannel)}
                      className="h-12 w-full rounded-xl border border-input bg-background px-3"
                    >
                      <option value="phone">{t('اتصال', 'Phone')}</option>
                      <option value="whatsapp">{t('واتساب', 'WhatsApp')}</option>
                      <option value="email">{t('بريد إلكتروني', 'Email')}</option>
                    </select>
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Section 3 — Activity & Location */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 sm:p-6 md:p-8 space-y-5">
                <SectionHeader icon={<MapPin className="w-5 h-5" />} title={t('النشاط والموقع', 'Activity & Location')} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t('النشاط الرئيسي', 'Main activity')}>
                    <Input dir="auto" value={form.main_activity} onChange={(e) => update('main_activity', e.target.value)} className="h-12 rounded-xl" placeholder={t('مثال: ألمنيوم، زجاج، حديد', 'e.g. Aluminum, Glass, Steel')} />
                  </Field>
                  <Field label={t('المدينة', 'City')}>
                    <Input dir="auto" value={form.city} onChange={(e) => update('city', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('الوكالات / العلامات التجارية', 'Brands / Agencies')}>
                    <TagInput
                      values={form.brands}
                      onChange={(v) => update('brands', v)}
                      placeholder={t('اكتب اسم العلامة ثم Enter', 'Type brand name and press Enter')}
                      dir="auto"
                    />
                  </Field>
                  <Field label={t('العنوان الوطني', 'National Address')}>
                    <Input dir="auto" value={form.national_address} onChange={(e) => update('national_address', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('رابط الموقع على الخريطة', 'Map link')}>
                    <Input type="url" dir="ltr" placeholder="https://maps.google.com/..." value={form.map_link} onChange={(e) => update('map_link', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('عدد الفروع', 'Branches count')}>
                    <Input type="number" min={1} dir="ltr" value={form.branches_count} onChange={(e) => update('branches_count', Number(e.target.value) || 1)} className="h-12 rounded-xl tech-content" />
                  </Field>
                </div>

                {/* Specialties — linked to existing catalog */}
                <Field
                  label={t('التخصصات والخدمات', 'Specialties & Services')}
                >
                  <SpecialtiesPicker
                    catalog={categories}
                    values={form.specialties}
                    onChange={(v) => update('specialties', v)}
                    isRTL={isRTL}
                  />
                </Field>

                <Field label={t('صورة أو ملف السجل التجاري (PDF/JPG/PNG، حد 5MB)', 'Commercial Registration file (PDF/JPG/PNG, 5MB max)')}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,application/pdf"
                      onChange={onFileChange}
                      className="block w-full text-sm file:me-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
                    />
                  </div>
                  {crFile && (
                    <p className="text-xs text-muted-foreground mt-2 tech-content">
                      {crFile.name} · {(crFile.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                </Field>
              </CardContent>
            </Card>

            {/* Branches */}
            {form.branches_count > 1 && (
              <Card className="rounded-2xl">
                <CardContent className="p-5 sm:p-6 md:p-8 space-y-5">
                  <SectionHeader
                    icon={<Store className="w-5 h-5" />}
                    title={t('بيانات الفروع الإضافية', 'Additional Branches')}
                  />
                  <p className="text-xs text-muted-foreground -mt-2">
                    {t(
                      `الفرع الرئيسي يستخدم بيانات التواصل أعلاه. أضف بيانات ${form.branches_count - 1} فرع إضافي.`,
                      `The main branch uses the contact info above. Provide details for ${form.branches_count - 1} additional branch${form.branches_count - 1 > 1 ? 'es' : ''}.`,
                    )}
                  </p>
                  <div className="space-y-3">
                    {branches.map((b, i) => (
                      <details
                        key={i}
                        open={i === 0 || !b.branch_name}
                        className="group rounded-xl border bg-card overflow-hidden transition-all hover:border-primary/40"
                      >
                        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-4 hover:bg-muted/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold tech-content shrink-0">
                              {i + 2}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">
                                {b.branch_name || t(`فرع ${i + 2} — لم يُسمَّ بعد`, `Branch ${i + 2} — unnamed`)}
                              </div>
                              {(b.city || b.address) && (
                                <div className="text-xs text-muted-foreground truncate mt-0.5">
                                  {[b.city, b.address].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {b.branch_name ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : t('غير مكتمل', 'Incomplete')}
                          </span>
                        </summary>
                        <div className="border-t p-4 bg-muted/10 space-y-3">
                          <div className="grid md:grid-cols-2 gap-3">
                            <Field label={t('اسم الفرع *', 'Branch name *')}>
                              <Input dir="auto" placeholder={t('مثال: فرع الرياض', 'e.g. Riyadh Branch')} value={b.branch_name} onChange={(e) => updateBranch(i, 'branch_name', e.target.value)} className="h-11 rounded-lg" />
                            </Field>
                            <Field label={t('المدينة', 'City')}>
                              <Input dir="auto" value={b.city ?? ''} onChange={(e) => updateBranch(i, 'city', e.target.value)} className="h-11 rounded-lg" />
                            </Field>
                            <div className="md:col-span-2">
                              <Field label={t('العنوان', 'Address')}>
                                <Input dir="auto" value={b.address ?? ''} onChange={(e) => updateBranch(i, 'address', e.target.value)} className="h-11 rounded-lg" />
                              </Field>
                            </div>
                            <Field label={t('رقم التواصل', 'Phone')}>
                              <div className="relative">
                                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input dir="ltr" placeholder="05xxxxxxxx" value={b.phone ?? ''} onChange={(e) => updateBranch(i, 'phone', e.target.value)} className="h-11 rounded-lg ps-9 tech-content" />
                              </div>
                            </Field>
                            <Field label={t('رابط الموقع على الخريطة', 'Map link')}>
                              <Input dir="ltr" placeholder="https://maps.google.com/..." value={b.map_link ?? ''} onChange={(e) => updateBranch(i, 'map_link', e.target.value)} className="h-11 rounded-lg" />
                            </Field>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            {/* Trust strip */}
            <div className="rounded-2xl border bg-muted/30 p-5 sm:p-6 grid sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{t('خصوصية تامة', 'Full privacy')}</div>
                  <p className="text-muted-foreground text-xs mt-0.5">{t('بياناتكم لا تُشارك مع طرف ثالث.', 'Your data is never shared with third parties.')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{t('توثيق احترافي', 'Verified process')}</div>
                  <p className="text-muted-foreground text-xs mt-0.5">{t('مراجعة يدوية من فريق متخصص.', 'Manual review by our specialized team.')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{t('استجابة سريعة', 'Fast response')}</div>
                  <p className="text-muted-foreground text-xs mt-0.5">{t('رد رسمي خلال 24-48 ساعة عمل.', 'Official reply within 24–48 business hours.')}</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground text-center sm:text-start">
                {t('بإرسال الطلب فإنك توافق على سياسة الخصوصية والشروط.', 'By submitting, you agree to our Privacy Policy and Terms.')}
              </p>
              <Button type="submit" disabled={loading} size="lg" className="rounded-xl w-full sm:w-auto sm:min-w-[200px] h-12 hover-lift shadow-elegant">
                {loading ? (
                  <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t('جاري الإرسال...', 'Sending...')}</>
                ) : (
                  t('إرسال طلب الانضمام', 'Submit join request')
                )}
              </Button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 pb-2 border-b">
    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</span>
    <h2 className="text-lg font-semibold">{title}</h2>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    {children}
  </div>
);

export default ProviderJoin;