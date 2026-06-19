import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, ogImageFor } from '@/lib/seo/structured-data';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2, User, Mail, Phone, FileText, MapPin, ShieldCheck,
 CheckCircle2, Plus, Loader2, Sparkles, Lock, Clock, Award, Users, TrendingUp,
  Store, AlertCircle, Link as LinkIcon, MessageCircle, Calendar, Globe, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { submitProviderLead } from '@/modules/providers';
import coverImage from '@/assets/provider-join-cover.jpg';
import {
  Field, SectionHeader, SpecialtiesPicker, TagInput, invalidInputClass,
  FileUploadField,
  type CategoryOption,
} from './providerJoin/_components';
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
  whatsapp: string;
  preferred_channel: ProviderLeadChannel;
  website: string;
  cr_number: string;
  unified_number: string;
  vat_number: string;
  establishment_year: string;
  main_activity: string;
  specialties: string[];
  brands: string[];
  brief: string;
  map_link: string;
  national_address: string;
  short_national_address: string;
  full_address: string;
  region: string;
  city: string;
  district: string;
  street_name: string;
  building_number: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  account_manager_name: string;
  account_manager_phone: string;
  account_manager_email: string;
  branches_count: number;
}

const EMPTY: FormState = {
  name_ar: '', name_en: '', contact_name: '', email: '', phone: '', whatsapp: '',
  preferred_channel: 'phone', website: '', cr_number: '', unified_number: '',
  vat_number: '', establishment_year: '', main_activity: '', specialties: [], brands: [], brief: '',
  map_link: '', national_address: '', short_national_address: '', full_address: '',
  region: '', city: '', district: '', street_name: '', building_number: '', postal_code: '',
  latitude: '', longitude: '',
  account_manager_name: '', account_manager_phone: '', account_manager_email: '',
  branches_count: 1,
};

const ProviderJoin: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [branches, setBranches] = useState<ProviderLeadBranchInput[]>([]);
  const [crFile, setCrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Real platform stats from the database (same RPC used on the public landing)
  const { data: stats } = useQuery({
    queryKey: ['provider_join_home_stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_home_stats');
      return data as { businessCount: number; reviewCount: number; projectCount: number; satisfaction: number } | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const fmt = (n: number | undefined) => {
    const v = Number(n ?? 0);
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K+`;
    if (v >= 100) return `${Math.floor(v / 10) * 10}+`;
    return `${v}`;
  };

  // Load category catalog for the specialties picker (taxonomy-only).
  // Uses taxonomy_categories filtered to entries flagged for provider
  // registration. The legacy `categories` table is no longer consulted here.
  useEffect(() => {
    let alive = true;
    supabase
      .from('taxonomy_categories')
      .select('id, name_ar, name_en')
      .eq('is_active', true)
      .eq('is_public', true)
      .eq('is_archived', false)
      .eq('show_in_registration', true)
      .order('sort_order', { ascending: true })
      .order('name_ar', { ascending: true })
      .then(({ data }) => {
        if (alive && data) {
          setCategories(
            data.map((c) => ({
              id: c.id,
              name_ar: c.name_ar,
              name_en: c.name_en ?? c.name_ar,
            })),
          );
        }
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
            whatsapp: '', email: '', website: '',
            region: '', district: '', street_name: '', building_number: '', postal_code: '',
            short_national_address: '', national_address: '',
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

  // Clear an individual error as the user types
  const clearError = (k: string) =>
    setErrors((e) => (e[k] ? Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)) : e));

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    update(k, v);
    clearError(k as string);
    if (submitError) setSubmitError(null);
  };

  const updateBranch = (i: number, k: keyof ProviderLeadBranchInput, v: string) =>
    setBranches((b) => b.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setCrFile(null); return; }
    if (f.size > PROVIDER_LEAD_DOC_MAX_BYTES) {
      const msg = t('حجم الملف يتجاوز 5 ميغابايت', 'File exceeds 5 MB');
      setErrors((er) => ({ ...er, cr_file: msg }));
      toast.error(msg);
      e.target.value = '';
      return;
    }
    if (!(PROVIDER_LEAD_DOC_MIMES as readonly string[]).includes(f.type)) {
      const msg = t('نوع الملف غير مدعوم. PDF أو JPG أو PNG فقط.', 'Unsupported file type. PDF/JPG/PNG only.');
      setErrors((er) => ({ ...er, cr_file: msg }));
      toast.error(msg);
      e.target.value = '';
      return;
    }
    clearError('cr_file');
    setCrFile(f);
  };

  // Lightweight client-side validators
  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const isSaudiPhone = (v: string) => /^(?:\+?966|0)?5\d{8}$/.test(v.replace(/[\s-]/g, ''));
  const isUrl = (v: string) => {
    if (!v) return true;
    try { new URL(v.startsWith('http') ? v : `https://${v}`); return true; } catch { return false; }
  };

  const validate = (): Record<string, string> => {
    const er: Record<string, string> = {};
    if (!form.name_ar.trim()) er.name_ar = t('يرجى إدخال اسم المنشأة بالعربية', 'Please enter the business name in Arabic');
    else if (form.name_ar.trim().length < 2) er.name_ar = t('الاسم قصير جداً', 'Name is too short');
    if (!form.contact_name.trim()) er.contact_name = t('يرجى إدخال اسم المسؤول', 'Please enter the contact name');
    if (!form.email.trim()) er.email = t('يرجى إدخال البريد الإلكتروني', 'Please enter your email');
    else if (!isEmail(form.email)) er.email = t('صيغة البريد الإلكتروني غير صحيحة', 'Invalid email format');
    if (!form.phone.trim()) er.phone = t('يرجى إدخال رقم الجوال', 'Please enter your phone number');
    else if (!isSaudiPhone(form.phone)) er.phone = t('رقم الجوال غير صحيح. مثال: 05XXXXXXXX', 'Invalid phone. Example: 05XXXXXXXX');
    if (form.website && !isUrl(form.website)) er.website = t('رابط الموقع غير صحيح', 'Invalid website URL');
    if (form.map_link && !isUrl(form.map_link)) er.map_link = t('رابط الخريطة غير صحيح', 'Invalid map URL');
    if (form.whatsapp && !isSaudiPhone(form.whatsapp)) er.whatsapp = t('رقم الواتساب غير صحيح', 'Invalid WhatsApp number');
    if (form.account_manager_email && !isEmail(form.account_manager_email)) er.account_manager_email = t('بريد مدير الحساب غير صحيح', 'Invalid account manager email');
    if (form.account_manager_phone && !isSaudiPhone(form.account_manager_phone)) er.account_manager_phone = t('جوال مدير الحساب غير صحيح', 'Invalid account manager phone');
    if (form.short_national_address && !/^[A-Za-z]{4}\d{4}$/.test(form.short_national_address.trim())) {
      er.short_national_address = t('العنوان الوطني يجب أن يكون 4 أحرف + 4 أرقام', 'National address must be 4 letters + 4 digits');
    }
    if (form.postal_code && !/^\d{5}$/.test(form.postal_code.trim())) er.postal_code = t('الرمز البريدي 5 أرقام', 'Postal code must be 5 digits');
    if (form.establishment_year) {
      const y = Number(form.establishment_year);
      const cy = new Date().getFullYear();
      if (!Number.isInteger(y) || y < 1900 || y > cy) er.establishment_year = t('سنة تأسيس غير صحيحة', 'Invalid establishment year');
    }
    branches.forEach((b, i) => {
      if (b.email && !isEmail(b.email)) er[`branch_${i}_email`] = t('بريد الفرع غير صحيح', 'Invalid branch email');
      if (b.phone && !isSaudiPhone(b.phone)) er[`branch_${i}_phone`] = t('جوال الفرع غير صحيح', 'Invalid branch phone');
      if (b.whatsapp && !isSaudiPhone(b.whatsapp)) er[`branch_${i}_whatsapp`] = t('واتساب الفرع غير صحيح', 'Invalid branch WhatsApp');
      if (b.website && !isUrl(b.website)) er[`branch_${i}_website`] = t('رابط موقع الفرع غير صحيح', 'Invalid branch website');
      if (b.map_link && !isUrl(b.map_link)) er[`branch_${i}_map`] = t('رابط خريطة الفرع غير صحيح', 'Invalid branch map link');
    });
    if (form.branches_count < 1) er.branches_count = t('عدد الفروع يجب أن يكون 1 أو أكثر', 'Branches must be 1 or more');
    // Validate extra branches: at minimum require a branch name
    branches.forEach((b, i) => {
      if (!b.branch_name.trim()) er[`branch_${i}_name`] = t(`أدخل اسم الفرع ${i + 2}`, `Enter the name of branch ${i + 2}`);
    });
    return er;
  };

  const focusFirstError = (er: Record<string, string>) => {
    const first = Object.keys(er)[0];
    if (!first) return;
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>(`[data-error-key="${first}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el.querySelector('input, select, textarea, button') as HTMLElement | null)?.focus();
      } else {
        alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot + form-time check
    if (honeypotRef.current?.value) return;
    if (Date.now() - startTimeRef.current < 1500) {
      const msg = t('تعذّر التحقق من الطلب. حاول مرة أخرى بعد لحظات.', 'Could not verify request. Please try again in a moment.');
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    const er = validate();
    setErrors(er);
    if (Object.keys(er).length > 0) {
      const msg = t(
        `يوجد ${Object.keys(er).length} حقل بحاجة إلى مراجعة. تم تمييزها بالأحمر.`,
        `${Object.keys(er).length} field${Object.keys(er).length > 1 ? 's need' : ' needs'} attention. Highlighted in red below.`,
      );
      setSubmitError(msg);
      focusFirstError(er);
      return;
    }
    setSubmitError(null);

    setLoading(true);
    try {
      const result = await submitProviderLead(
        {
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || undefined,
          contact_name: form.contact_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim() || undefined,
          preferred_channel: form.preferred_channel,
          website: form.website.trim() || undefined,
          cr_number: form.cr_number.trim() || undefined,
          unified_number: form.unified_number.trim() || undefined,
          vat_number: form.vat_number.trim() || undefined,
          establishment_year: form.establishment_year ? Number(form.establishment_year) : undefined,
          main_activity: form.main_activity.trim() || undefined,
          specialties: form.specialties.map((s) => s.trim()).filter(Boolean),
          brands: form.brands.map((s) => s.trim()).filter(Boolean),
          brief: form.brief.trim() || undefined,
          map_link: form.map_link.trim() || undefined,
          national_address: form.national_address.trim() || undefined,
          short_national_address: form.short_national_address.trim() || undefined,
          full_address: form.full_address.trim() || undefined,
          region: form.region.trim() || undefined,
          city: form.city.trim() || undefined,
          district: form.district.trim() || undefined,
          street_name: form.street_name.trim() || undefined,
          building_number: form.building_number.trim() || undefined,
          postal_code: form.postal_code.trim() || undefined,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
          account_manager_name: form.account_manager_name.trim() || undefined,
          account_manager_phone: form.account_manager_phone.trim() || undefined,
          account_manager_email: form.account_manager_email.trim() || undefined,
          branches_count: Math.max(1, Number(form.branches_count) || 1),
          branches: branches
            .filter((b) => b.branch_name.trim().length > 0)
            .map((b) => ({
              branch_name: b.branch_name.trim(),
              city: b.city?.trim() || undefined,
              address: b.address?.trim() || undefined,
              map_link: b.map_link?.trim() || undefined,
              phone: b.phone?.trim() || undefined,
              whatsapp: b.whatsapp?.trim() || undefined,
              email: b.email?.trim() || undefined,
              website: b.website?.trim() || undefined,
              region: b.region?.trim() || undefined,
              district: b.district?.trim() || undefined,
              street_name: b.street_name?.trim() || undefined,
              building_number: b.building_number?.trim() || undefined,
              postal_code: b.postal_code?.trim() || undefined,
              short_national_address: b.short_national_address?.trim() || undefined,
              national_address: b.national_address?.trim() || undefined,
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
        const msg = map[result.errorCode ?? 'unknown'];
        // Map server-side codes to inline field errors when possible
        if (result.errorCode === 'invalid_email') setErrors((e) => ({ ...e, email: msg }));
        if (result.errorCode === 'invalid_phone') setErrors((e) => ({ ...e, phone: msg }));
        setSubmitError(msg);
        toast.error(msg);
        requestAnimationFrame(() => alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        return;
      }
      setSuccess(result.data!.reference_code);
    } catch {
      const msg = t('حدث خطأ غير متوقع. حاول مرة أخرى.', 'Unexpected error. Please try again.');
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
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
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-start">
                <p className="text-sm font-medium mb-1">
                  {t('تحتاج تعديل البيانات لاحقاً؟', 'Need to update your details later?')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'يمكنك تعديل طلبك في أي وقت قبل المراجعة عبر رقم الطلب والبريد أو الجوال.',
                    'Edit your request anytime before review using your reference code and email or phone.',
                  )}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild className="rounded-xl">
                  <a href={`/join/qitaat/edit?ref=${encodeURIComponent(success)}`}>
                    {t('تعديل بياناتي', 'Edit my request')}
                  </a>
                </Button>
                <Button onClick={() => { setSuccess(null); setForm(EMPTY); setBranches([]); setCrFile(null); }} variant="outline" className="rounded-xl">
                  {t('تقديم طلب جديد', 'Submit another request')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
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
            loading="lazy" decoding="async"/>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/95" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.25),transparent_60%)]" />
          </div>
          <div className="relative container mx-auto px-4 sm:px-6 pt-16 pb-6 sm:py-20 md:py-24 max-w-5xl text-center text-white">
            <div className="mb-3 sm:mb-5 flex justify-center">
              <Badge variant="secondary" className="rounded-full bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/15 text-[11px] sm:text-xs px-3 py-1.5 inline-flex items-center max-w-full whitespace-normal sm:whitespace-nowrap leading-snug text-center">
                <Sparkles className="w-3.5 h-3.5 me-1.5 shrink-0" />
                <span>{t('انضم إلى أكبر منصة صناعية في المملكة', 'The leading industrial directory in Saudi Arabia')}</span>
              </Badge>
            </div>
            <h1 className="text-[24px] leading-[32px] sm:text-4xl md:text-6xl font-bold tracking-tight">
              {t('سجّل منشأتك في قِطاعات', 'Register your business on Qitaat')}
            </h1>
            <p className="mt-3 sm:mt-5 text-white/80 text-[13px] leading-[20px] sm:text-lg md:text-xl max-w-2xl mx-auto sm:leading-relaxed">
              {t(
                'وصول لعملاء محتملين، عرض احترافي لمنشأتك، وأدوات إدارة متكاملة. التسجيل مجاني ولا يتطلب إنشاء حساب.',
                'Reach more clients, showcase your business professionally, and access powerful tools. Free registration — no account required.',
              )}
            </p>
            <div className="mt-4 sm:mt-7 flex flex-wrap justify-center gap-x-3 sm:gap-x-5 gap-y-1.5 text-[11px] sm:text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />{t('بياناتكم محمية ومشفّرة', 'Encrypted & secure')}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />{t('مراجعة خلال 24-48 ساعة', '24–48h review')}</span>
              <span className="inline-flex items-center gap-1.5"><Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />{t('فريق متخصص', 'Specialized team')}</span>
            </div>

            {/* Stats strip */}
            <div className="mt-5 sm:mt-10 grid grid-cols-3 gap-2 sm:gap-6 max-w-2xl mx-auto">
              {[
                { icon: <Building2 className="w-5 h-5" />, value: fmt(stats?.businessCount), label: t('منشأة مسجّلة', 'Registered businesses') },
                { icon: <TrendingUp className="w-5 h-5" />, value: fmt(stats?.projectCount), label: t('مشروع منشور', 'Published projects') },
                { icon: <Users className="w-5 h-5" />, value: fmt(stats?.reviewCount), label: t('تقييم موثّق', 'Verified reviews') },
              ].map((s, i) => (
                <div key={i} className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm px-2 py-2.5 sm:p-5">
                  <div className="flex items-center justify-center text-white/70 mb-0.5 sm:mb-1.5 [&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-5 sm:[&_svg]:h-5">{s.icon}</div>
                  <div className="text-base sm:text-2xl font-bold tech-content leading-tight">{s.value}</div>
                  <div className="text-[10px] sm:text-xs text-white/70 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="container mx-auto px-4 sm:px-6 pt-5 pb-28 sm:py-14 max-w-4xl">
          {/* Form header (logo removed — already shown in navbar) */}
          <div className="mb-3 sm:mb-8 text-center">
            <div className="text-[11px] uppercase tracking-wider sm:tracking-normal sm:normal-case sm:text-sm text-muted-foreground">{t('منصة قِطاعات الصناعية', 'Qitaat Industrial Platform')}</div>
            <h2 className="text-[18px] sm:text-xl font-semibold mt-1 tracking-tight">
              {t('نموذج طلب الانضمام', 'Join Request Form')}
            </h2>
          </div>

          <form ref={formRef} onSubmit={onSubmit} className="space-y-3 sm:space-y-6" noValidate aria-describedby={submitError ? 'pj-form-alert' : undefined}>
            {/* Inline alert banner — replaces toast-only feedback */}
            {submitError && (
              <div
                ref={alertRef}
                id="pj-form-alert"
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive p-3 sm:p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0" />
                <div className="text-[13px] sm:text-sm">
                  <div className="font-semibold mb-0.5">{t('تعذّر إرسال الطلب', 'Could not submit')}</div>
                  <p className="text-destructive/90">{submitError}</p>
                </div>
              </div>
            )}

            {/* Helpful tip banner — guides users while filling */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 text-foreground p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0 text-primary" />
              <div className="text-[13px] sm:text-sm">
                <div className="font-medium mb-0.5">{t('نصائح لإكمال الطلب بسرعة', 'Tips to complete faster')}</div>
                <ul className="text-muted-foreground text-[12px] leading-[18px] space-y-0.5 list-disc ps-4">
                  <li>{t('الحقول التي تحمل علامة * إلزامية فقط، والباقي اختياري.', 'Only fields marked * are required — the rest are optional.')}</li>
                  <li>{t('ارفق صورة واضحة للسجل التجاري لتسريع المراجعة.', 'Attach a clear CR document to speed up the review.')}</li>
                  <li>{t('اختر تخصصاتك من قائمة الخدمات لربط ملفك بنتائج البحث.', 'Pick specialties from the catalog to link your profile to search results.')}</li>
                </ul>
              </div>
            </div>

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
              <CardContent className="p-4 sm:p-6 md:p-8 space-y-4">
                <SectionHeader icon={<Building2 className="w-5 h-5" />} title={t('بيانات المنشأة', 'Establishment Info')} />
                <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                  <div data-error-key="name_ar">
                    <Field label={t('اسم المنشأة بالعربي', 'Business name (Arabic)')} required error={errors.name_ar} hint={t('الاسم الرسمي كما هو في السجل التجاري.', 'Official name as written in the CR.')}>
                      <Input dir="auto" required value={form.name_ar} onChange={(e) => setField('name_ar', e.target.value)} className={`h-12 rounded-xl ${invalidInputClass(!!errors.name_ar)}`} aria-invalid={!!errors.name_ar} />
                    </Field>
                  </div>
                  <Field label={t('اسم المنشأة بالإنجليزي', 'Business name (English)')} hint={t('اختياري — يستخدم في النسخة الإنجليزية من الملف.', 'Optional — used in the English profile.')}>
                    <Input dir="auto" value={form.name_en} onChange={(e) => setField('name_en', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('السجل التجاري', 'Commercial Registration')} hint={t('رقم السجل (10 خانات عادةً).', 'CR number (usually 10 digits).')}>
                    <Input dir="auto" value={form.cr_number} onChange={(e) => setField('cr_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('الرقم الموحد', 'Unified Number')} hint={t('الرقم الموحد للمنشأة من وزارة التجارة.', 'Unified Commercial Number issued by MoC.')}>
                    <Input dir="auto" value={form.unified_number} onChange={(e) => setField('unified_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('الرقم الضريبي', 'VAT Number')} hint={t('15 رقم تبدأ بـ 3 وتنتهي بـ 3.', '15 digits starting & ending with 3.')}>
                    <Input dir="auto" value={form.vat_number} onChange={(e) => setField('vat_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <div data-error-key="website">
                    <Field label={t('الموقع الإلكتروني', 'Website')} error={errors.website} hint={t('مثال: https://example.com', 'e.g. https://example.com')}>
                      <div className="relative">
                        <LinkIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="url" dir="ltr" placeholder="https://" value={form.website} onChange={(e) => setField('website', e.target.value)} className={`h-12 rounded-xl ps-9 ${invalidInputClass(!!errors.website)}`} aria-invalid={!!errors.website} />
                      </div>
                    </Field>
                  </div>
                  <div data-error-key="establishment_year">
                    <Field label={t('سنة التأسيس', 'Established year')} error={errors.establishment_year} hint={t('سنة بدء النشاط التجاري.', 'Year the business started.')}>
                      <div className="relative">
                        <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} dir="ltr" placeholder="2015" value={form.establishment_year} onChange={(e) => setField('establishment_year', e.target.value)} className={`h-12 rounded-xl ps-9 tech-content ${invalidInputClass(!!errors.establishment_year)}`} aria-invalid={!!errors.establishment_year} />
                      </div>
                    </Field>
                  </div>
                </div>
                <Field label={t('نبذة مختصرة عن المنشأة', 'Short description')}>
                  <Textarea dir="auto" rows={3} maxLength={2000} value={form.brief} onChange={(e) => setField('brief', e.target.value)} className="rounded-xl min-h-[88px] text-[14px]" />
                </Field>
                <p className="text-[11px] text-muted-foreground -mt-2 text-end tech-content">{form.brief.length}/2000</p>
              </CardContent>
            </Card>

            {/* Section 2 — Contact */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-6 md:p-8 space-y-4">
                <SectionHeader icon={<User className="w-5 h-5" />} title={t('بيانات التواصل', 'Contact Person')} />
                <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                  <div data-error-key="contact_name">
                    <Field label={t('اسم المسؤول', 'Contact name')} required error={errors.contact_name} hint={t('الشخص الذي سنتواصل معه لمتابعة الطلب.', 'The person we will contact about your request.')}>
                      <Input dir="auto" required value={form.contact_name} onChange={(e) => setField('contact_name', e.target.value)} className={`h-12 rounded-xl ${invalidInputClass(!!errors.contact_name)}`} aria-invalid={!!errors.contact_name} />
                    </Field>
                  </div>
                  <div data-error-key="email">
                    <Field label={t('البريد الإلكتروني', 'Email')} required error={errors.email} hint={t('سنرسل إليه رقم الطلب ورابط التعديل.', 'We will send your reference code and edit link here.')}>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" required dir="ltr" placeholder="name@example.com" value={form.email} onChange={(e) => setField('email', e.target.value)} className={`h-12 rounded-xl ps-9 tech-content ${invalidInputClass(!!errors.email)}`} aria-invalid={!!errors.email} />
                      </div>
                    </Field>
                  </div>
                  <div data-error-key="phone">
                    <Field label={t('رقم الجوال', 'Phone')} required error={errors.phone} hint={t('رقم سعودي يبدأ بـ 05.', 'Saudi number starting with 05.')}>
                      <div className="relative">
                        <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="tel" required dir="ltr" placeholder="05xxxxxxxx" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={`h-12 rounded-xl ps-9 tech-content ${invalidInputClass(!!errors.phone)}`} aria-invalid={!!errors.phone} />
                      </div>
                    </Field>
                  </div>
                  <div data-error-key="whatsapp">
                    <Field label={t('رقم الواتساب', 'WhatsApp')} error={errors.whatsapp} hint={t('اتركه فارغاً إن كان نفس رقم الجوال.', 'Leave blank if same as phone.')}>
                      <div className="relative">
                        <MessageCircle className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                        <Input type="tel" dir="ltr" placeholder="05xxxxxxxx" value={form.whatsapp} onChange={(e) => setField('whatsapp', e.target.value)} className={`h-12 rounded-xl ps-9 tech-content ${invalidInputClass(!!errors.whatsapp)}`} aria-invalid={!!errors.whatsapp} />
                      </div>
                    </Field>
                  </div>
                  <Field label={t('وسيلة التواصل المفضلة', 'Preferred channel')} hint={t('سنبدأ التواصل عبر هذه القناة.', 'We will reach out through this channel first.')}>
                    <select
                      value={form.preferred_channel}
                      onChange={(e) => setField('preferred_channel', e.target.value as ProviderLeadChannel)}
                      className="h-12 w-full rounded-xl border border-input bg-background px-3 text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="phone">{t('اتصال', 'Phone')}</option>
                      <option value="whatsapp">{t('واتساب', 'WhatsApp')}</option>
                      <option value="email">{t('بريد إلكتروني', 'Email')}</option>
                    </select>
                  </Field>
                </div>

                {/* Account manager (optional) */}
                <div className="pt-2 border-t">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" />
                    {t('مدير الحساب (اختياري)', 'Account manager (optional)')}
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
                    <Field label={t('الاسم', 'Name')}>
                      <Input dir="auto" value={form.account_manager_name} onChange={(e) => setField('account_manager_name', e.target.value)} className="h-12 rounded-xl" />
                    </Field>
                    <div data-error-key="account_manager_phone">
                      <Field label={t('الجوال', 'Phone')} error={errors.account_manager_phone}>
                        <Input type="tel" dir="ltr" placeholder="05xxxxxxxx" value={form.account_manager_phone} onChange={(e) => setField('account_manager_phone', e.target.value)} className={`h-12 rounded-xl tech-content ${invalidInputClass(!!errors.account_manager_phone)}`} aria-invalid={!!errors.account_manager_phone} />
                      </Field>
                    </div>
                    <div data-error-key="account_manager_email">
                      <Field label={t('البريد', 'Email')} error={errors.account_manager_email}>
                        <Input type="email" dir="ltr" placeholder="name@example.com" value={form.account_manager_email} onChange={(e) => setField('account_manager_email', e.target.value)} className={`h-12 rounded-xl tech-content ${invalidInputClass(!!errors.account_manager_email)}`} aria-invalid={!!errors.account_manager_email} />
                      </Field>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3 — Activity & Location */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-6 md:p-8 space-y-4">
                <SectionHeader icon={<MapPin className="w-5 h-5" />} title={t('النشاط والموقع', 'Activity & Location')} />
                <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                  <Field label={t('النشاط الرئيسي', 'Main activity')} hint={t('القطاع الذي تعملون فيه أساساً.', 'Your primary industrial sector.')}>
                    <Input dir="auto" value={form.main_activity} onChange={(e) => setField('main_activity', e.target.value)} className="h-12 rounded-xl" placeholder={t('مثال: ألمنيوم، زجاج، حديد', 'e.g. Aluminum, Glass, Steel')} />
                  </Field>
                  <Field label={t('الوكالات / العلامات التجارية', 'Brands / Agencies')} hint={t('اضغط Enter بعد كل علامة.', 'Press Enter after each brand.')}>
                    <TagInput
                      values={form.brands}
                      onChange={(v) => setField('brands', v)}
                      placeholder={t('اكتب اسم العلامة ثم Enter', 'Type brand name and press Enter')}
                      dir="auto"
                    />
                  </Field>
                  <div data-error-key="branches_count">
                    <Field label={t('عدد الفروع', 'Branches count')} error={errors.branches_count} hint={t('شامل الفرع الرئيسي.', 'Including the main branch.')}>
                      <Input type="number" min={1} dir="ltr" value={form.branches_count} onChange={(e) => setField('branches_count', Number(e.target.value) || 1)} className={`h-12 rounded-xl tech-content ${invalidInputClass(!!errors.branches_count)}`} aria-invalid={!!errors.branches_count} />
                    </Field>
                  </div>
                </div>

                {/* Address — head office */}
                <div className="pt-2 border-t space-y-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {t('عنوان المقر الرئيسي', 'Head office address')}
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
                    <Field label={t('المنطقة', 'Region')}>
                      <Input dir="auto" value={form.region} onChange={(e) => setField('region', e.target.value)} className="h-12 rounded-xl" placeholder={t('مثال: الرياض', 'e.g. Riyadh')} />
                    </Field>
                    <Field label={t('المدينة', 'City')}>
                      <Input dir="auto" value={form.city} onChange={(e) => setField('city', e.target.value)} className="h-12 rounded-xl" />
                    </Field>
                    <Field label={t('الحي', 'District')}>
                      <Input dir="auto" value={form.district} onChange={(e) => setField('district', e.target.value)} className="h-12 rounded-xl" />
                    </Field>
                    <Field label={t('اسم الشارع', 'Street name')}>
                      <Input dir="auto" value={form.street_name} onChange={(e) => setField('street_name', e.target.value)} className="h-12 rounded-xl" />
                    </Field>
                    <Field label={t('رقم المبنى', 'Building number')}>
                      <Input dir="ltr" value={form.building_number} onChange={(e) => setField('building_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                    </Field>
                    <div data-error-key="postal_code">
                      <Field label={t('الرمز البريدي', 'Postal code')} error={errors.postal_code}>
                        <Input dir="ltr" inputMode="numeric" maxLength={5} value={form.postal_code} onChange={(e) => setField('postal_code', e.target.value)} className={`h-12 rounded-xl tech-content ${invalidInputClass(!!errors.postal_code)}`} aria-invalid={!!errors.postal_code} />
                      </Field>
                    </div>
                    <div data-error-key="short_national_address" className="md:col-span-1">
                      <Field label={t('العنوان الوطني المختصر', 'Short national address')} error={errors.short_national_address} hint={t('4 أحرف + 4 أرقام (مثل RIYD1234).', '4 letters + 4 digits (e.g. RIYD1234).')}>
                        <Input dir="ltr" maxLength={8} value={form.short_national_address} onChange={(e) => setField('short_national_address', e.target.value.toUpperCase())} className={`h-12 rounded-xl tech-content uppercase ${invalidInputClass(!!errors.short_national_address)}`} aria-invalid={!!errors.short_national_address} />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label={t('العنوان الوطني الكامل', 'Full national address')} hint={t('الشارع، الحي، المدينة، الرمز البريدي.', 'Street, district, city, postal code.')}>
                        <Input dir="auto" value={form.national_address} onChange={(e) => setField('national_address', e.target.value)} className="h-12 rounded-xl" />
                      </Field>
                    </div>
                    <div className="md:col-span-3">
                      <Field label={t('العنوان التفصيلي', 'Full address')}>
                        <Textarea dir="auto" rows={2} value={form.full_address} onChange={(e) => setField('full_address', e.target.value)} className="rounded-xl min-h-[64px] text-[14px]" />
                      </Field>
                    </div>
                    <div data-error-key="map_link" className="md:col-span-3">
                      <Field label={t('رابط الموقع على الخريطة', 'Map link')} error={errors.map_link} hint={t('انسخ الرابط من Google Maps.', 'Copy the link from Google Maps.')}>
                        <div className="relative">
                          <Globe className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="url" dir="ltr" placeholder="https://maps.google.com/..." value={form.map_link} onChange={(e) => setField('map_link', e.target.value)} className={`h-12 rounded-xl ps-9 ${invalidInputClass(!!errors.map_link)}`} aria-invalid={!!errors.map_link} />
                        </div>
                      </Field>
                    </div>
                    <Field label={t('خط العرض (Latitude)', 'Latitude')}>
                      <Input dir="ltr" inputMode="decimal" placeholder="24.7136" value={form.latitude} onChange={(e) => setField('latitude', e.target.value)} className="h-12 rounded-xl tech-content" />
                    </Field>
                    <Field label={t('خط الطول (Longitude)', 'Longitude')}>
                      <Input dir="ltr" inputMode="decimal" placeholder="46.6753" value={form.longitude} onChange={(e) => setField('longitude', e.target.value)} className="h-12 rounded-xl tech-content" />
                    </Field>
                  </div>
                </div>

                {/* Specialties — linked to existing catalog */}
                <Field
                  label={t('التخصصات والخدمات', 'Specialties & Services')}
                  hint={t('اختر من الكتالوج أو أضف تخصصاتك الخاصة.', 'Pick from the catalog or add your own.')}
                >
                  <SpecialtiesPicker
                    catalog={categories}
                    values={form.specialties}
                    onChange={(v) => setField('specialties', v)}
                    isRTL={isRTL}
                  />
                </Field>

                <div data-error-key="cr_file">
                  <Field
                    label={t('صورة أو ملف السجل التجاري', 'Commercial Registration file')}
                    error={errors.cr_file}
                    hint={t('PDF أو JPG أو PNG — الحد الأقصى 5 ميغابايت.', 'PDF, JPG or PNG — 5 MB max.')}
                  >
                    <FileUploadField
                      file={crFile}
                      accept=".pdf,image/jpeg,image/png,application/pdf"
                      onChange={onFileChange}
                      buttonLabel={t('اختيار ملف', 'Choose file')}
                      emptyLabel={t('لم يتم اختيار أي ملف', 'No file chosen')}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Branches */}
            {form.branches_count > 1 && (
              <Card className="rounded-2xl">
                <CardContent className="p-4 sm:p-6 md:p-8 space-y-4">
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
                        data-error-key={`branch_${i}_name`}
                        open={i === 0 || !b.branch_name}
                        className={`group rounded-xl border bg-card overflow-hidden transition-all hover:border-primary/40 ${errors[`branch_${i}_name`] ? 'border-destructive/60' : ''}`}
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
                            <Field label={t('اسم الفرع', 'Branch name')} required error={errors[`branch_${i}_name`]}>
                              <Input
                                dir="auto"
                                placeholder={t('مثال: فرع الرياض', 'e.g. Riyadh Branch')}
                                value={b.branch_name}
                                onChange={(e) => { updateBranch(i, 'branch_name', e.target.value); clearError(`branch_${i}_name`); }}
                                className={`h-12 rounded-xl ${invalidInputClass(!!errors[`branch_${i}_name`])}`}
                                aria-invalid={!!errors[`branch_${i}_name`]}
                              />
                            </Field>
                            <Field label={t('المنطقة', 'Region')}>
                              <Input dir="auto" value={b.region ?? ''} onChange={(e) => updateBranch(i, 'region', e.target.value)} className="h-12 rounded-xl" />
                            </Field>
                            <Field label={t('المدينة', 'City')}>
                              <Input dir="auto" value={b.city ?? ''} onChange={(e) => updateBranch(i, 'city', e.target.value)} className="h-12 rounded-xl" />
                            </Field>
                            <Field label={t('الحي', 'District')}>
                              <Input dir="auto" value={b.district ?? ''} onChange={(e) => updateBranch(i, 'district', e.target.value)} className="h-12 rounded-xl" />
                            </Field>
                            <Field label={t('اسم الشارع', 'Street name')}>
                              <Input dir="auto" value={b.street_name ?? ''} onChange={(e) => updateBranch(i, 'street_name', e.target.value)} className="h-12 rounded-xl" />
                            </Field>
                            <Field label={t('رقم المبنى', 'Building number')}>
                              <Input dir="ltr" value={b.building_number ?? ''} onChange={(e) => updateBranch(i, 'building_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                            </Field>
                            <Field label={t('الرمز البريدي', 'Postal code')}>
                              <Input dir="ltr" inputMode="numeric" maxLength={5} value={b.postal_code ?? ''} onChange={(e) => updateBranch(i, 'postal_code', e.target.value)} className="h-12 rounded-xl tech-content" />
                            </Field>
                            <Field label={t('العنوان الوطني المختصر', 'Short national address')}>
                              <Input dir="ltr" maxLength={8} value={b.short_national_address ?? ''} onChange={(e) => updateBranch(i, 'short_national_address', e.target.value.toUpperCase())} className="h-12 rounded-xl tech-content uppercase" />
                            </Field>
                            <div className="md:col-span-2">
                              <Field label={t('العنوان التفصيلي', 'Address')}>
                                <Input dir="auto" value={b.address ?? ''} onChange={(e) => updateBranch(i, 'address', e.target.value)} className="h-12 rounded-xl" />
                              </Field>
                            </div>
                            <div className="md:col-span-2">
                              <Field label={t('العنوان الوطني الكامل', 'Full national address')}>
                                <Input dir="auto" value={b.national_address ?? ''} onChange={(e) => updateBranch(i, 'national_address', e.target.value)} className="h-12 rounded-xl" />
                              </Field>
                            </div>
                            <div data-error-key={`branch_${i}_phone`}>
                            <Field label={t('رقم التواصل', 'Phone')} error={errors[`branch_${i}_phone`]}>
                              <div className="relative">
                                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input dir="ltr" placeholder="05xxxxxxxx" value={b.phone ?? ''} onChange={(e) => { updateBranch(i, 'phone', e.target.value); clearError(`branch_${i}_phone`); }} className={`h-12 rounded-xl ps-9 tech-content ${invalidInputClass(!!errors[`branch_${i}_phone`])}`} aria-invalid={!!errors[`branch_${i}_phone`]} />
                              </div>
                            </Field>
                            </div>
                            <div data-error-key={`branch_${i}_whatsapp`}>
                            <Field label={t('واتساب', 'WhatsApp')} error={errors[`branch_${i}_whatsapp`]}>
                              <div className="relative">
                                <MessageCircle className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                                <Input dir="ltr" placeholder="05xxxxxxxx" value={b.whatsapp ?? ''} onChange={(e) => { updateBranch(i, 'whatsapp', e.target.value); clearError(`branch_${i}_whatsapp`); }} className={`h-12 rounded-xl ps-9 tech-content ${invalidInputClass(!!errors[`branch_${i}_whatsapp`])}`} aria-invalid={!!errors[`branch_${i}_whatsapp`]} />
                              </div>
                            </Field>
                            </div>
                            <div data-error-key={`branch_${i}_email`}>
                            <Field label={t('البريد الإلكتروني', 'Email')} error={errors[`branch_${i}_email`]}>
                              <div className="relative">
                                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type="email" dir="ltr" placeholder="branch@example.com" value={b.email ?? ''} onChange={(e) => { updateBranch(i, 'email', e.target.value); clearError(`branch_${i}_email`); }} className={`h-12 rounded-xl ps-9 tech-content ${invalidInputClass(!!errors[`branch_${i}_email`])}`} aria-invalid={!!errors[`branch_${i}_email`]} />
                              </div>
                            </Field>
                            </div>
                            <div data-error-key={`branch_${i}_website`}>
                            <Field label={t('الموقع الإلكتروني', 'Website')} error={errors[`branch_${i}_website`]}>
                              <div className="relative">
                                <LinkIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type="url" dir="ltr" placeholder="https://" value={b.website ?? ''} onChange={(e) => { updateBranch(i, 'website', e.target.value); clearError(`branch_${i}_website`); }} className={`h-12 rounded-xl ps-9 ${invalidInputClass(!!errors[`branch_${i}_website`])}`} aria-invalid={!!errors[`branch_${i}_website`]} />
                              </div>
                            </Field>
                            </div>
                            <div data-error-key={`branch_${i}_map`} className="md:col-span-2">
                            <Field label={t('رابط الموقع على الخريطة', 'Map link')} error={errors[`branch_${i}_map`]}>
                              <Input dir="ltr" placeholder="https://maps.google.com/..." value={b.map_link ?? ''} onChange={(e) => { updateBranch(i, 'map_link', e.target.value); clearError(`branch_${i}_map`); }} className={`h-12 rounded-xl ${invalidInputClass(!!errors[`branch_${i}_map`])}`} aria-invalid={!!errors[`branch_${i}_map`]} />
                            </Field>
                            </div>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            {/* Trust strip — hidden on mobile to reduce density (chips already shown in hero) */}
            <div className="hidden sm:grid rounded-2xl border bg-muted/30 p-5 sm:p-6 sm:grid-cols-3 gap-4 text-sm">
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

            {/* Submit (desktop / tablet) */}
            <div className="hidden sm:flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground text-center sm:text-start">
                {t('بإرسال الطلب فإنك توافق على ', 'By submitting, you agree to our ')}
                <a href="/privacy" className="underline hover:text-primary">{t('سياسة الخصوصية', 'Privacy Policy')}</a>
                {t(' و', ' and ')}
                <a href="/terms" className="underline hover:text-primary">{t('الشروط', 'Terms')}</a>
                {t('.', '.')}
              </p>
              <Button type="submit" disabled={loading} size="lg" className="rounded-xl w-full sm:w-auto sm:min-w-[200px] h-12 hover-lift shadow-elegant">
                {loading ? (
                  <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t('جاري الإرسال...', 'Sending...')}</>
                ) : (
                  t('إرسال طلب الانضمام', 'Submit join request')
                )}
              </Button>
            </div>

            {/* Mobile: legal note inline (compact) */}
            <p className="sm:hidden text-[11px] leading-[16px] text-muted-foreground text-center pt-1 pb-2">
              {t('بإرسال الطلب فإنك توافق على ', 'By submitting, you agree to our ')}
              <a href="/privacy" className="underline">{t('سياسة الخصوصية', 'Privacy Policy')}</a>
              {t(' و', ' and ')}
              <a href="/terms" className="underline">{t('الشروط', 'Terms')}</a>
              {t('.', '.')}
            </p>

            {/* Mobile sticky bottom action bar */}
            <div
              className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="container mx-auto max-w-4xl px-4 py-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-[14px] font-semibold shadow-elegant"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t('جاري الإرسال...', 'Sending...')}</>
                  ) : (
                    t('إرسال طلب الانضمام', 'Submit join request')
                  )}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderJoin;