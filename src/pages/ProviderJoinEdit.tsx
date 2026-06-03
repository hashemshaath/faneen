import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useNoIndex } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, User, Mail, Phone, FileText, MapPin, ShieldCheck,
  Loader2, KeyRound, Store, CheckCircle2, Save, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  lookupProviderLead,
  updateProviderLeadByRef,
  type ProviderLeadEditableData,
} from '@/modules/providers';
import { listActiveCategories } from '@/modules/categories';
import type { ProviderLeadBranchInput, ProviderLeadChannel } from '@/modules/providers/types';
import {
  Field, SectionHeader, SpecialtiesPicker, TagInput,
  type CategoryOption,
} from './providerJoin/_components';
import {
  PROVIDER_LEAD_DOC_MAX_BYTES,
  PROVIDER_LEAD_DOC_MIMES,
} from '@/modules/files/domain/providerLeadDocuments';

const ProviderJoinEdit: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [search] = useSearchParams();

  usePageMeta({
    title: t('تعديل طلب الانضمام | قِطاعات', 'Edit Join Request | Qitaat'),
    description: t('تعديل بيانات طلب الانضمام إلى قِطاعات.', 'Edit your Qitaat join request details.'),
  });
  useNoIndex();

  // ---- Lookup state ----
  const [reference, setReference] = useState(search.get('ref') ?? '');
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<ProviderLeadEditableData | null>(null);

  // ---- Edit state ----
  const [form, setForm] = useState<Partial<ProviderLeadEditableData> | null>(null);
  const [branches, setBranches] = useState<ProviderLeadBranchInput[]>([]);
  const [crFile, setCrFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    let alive = true;
    listActiveCategories<CategoryOption>({ select: 'id, name_ar, name_en' }).then(({ data }) => {
      if (alive && data) setCategories(data);
    });
    return () => { alive = false; };
  }, []);

  // Sync branches list with branches_count (extras only, primary = main contact)
  useEffect(() => {
    if (!form) return;
    const target = Math.max(1, Number(form.branches_count) || 1);
    setBranches((prev) => {
      const needed = Math.max(0, target - 1);
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
  }, [form?.branches_count]);

  const startTimeRef = useRef<number>(Date.now());

  const onLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim() || !credential.trim()) {
      toast.error(t('يرجى إدخال رقم الطلب والبريد أو الجوال', 'Please enter your reference and email or phone'));
      return;
    }
    if (Date.now() - startTimeRef.current < 800) return;

    setLoading(true);
    try {
      const res = await lookupProviderLead(reference, credential);
      if (!res.ok || !res.data) {
        const map: Record<string, string> = {
          not_found: t('لم نعثر على طلب مطابق، أو أن الطلب أصبح غير قابل للتعديل.', 'No matching request found, or it can no longer be edited.'),
          invalid_input: t('بيانات غير صحيحة', 'Invalid input'),
          unknown: t('تعذّر استرجاع الطلب. حاول لاحقاً.', 'Could not retrieve request. Try again later.'),
        };
        toast.error(map[res.errorCode ?? 'unknown']);
        return;
      }
      setLead(res.data);
      setForm(res.data);
      setBranches(res.data.branches ?? []);
    } finally {
      setLoading(false);
    }
  };

  const update = <K extends keyof ProviderLeadEditableData>(k: K, v: ProviderLeadEditableData[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

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

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !form) return;
    if (!form.name_ar?.trim() || !form.contact_name?.trim() || !form.email?.trim() || !form.phone?.trim()) {
      toast.error(t('يرجى تعبئة الحقول المطلوبة', 'Please fill required fields'));
      return;
    }

    setSaving(true);
    try {
      const res = await updateProviderLeadByRef(
        reference,
        credential,
        {
          name_ar: form.name_ar.trim(),
          name_en: form.name_en?.trim() || undefined,
          contact_name: form.contact_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          preferred_channel: form.preferred_channel as ProviderLeadChannel,
          website: form.website?.trim() || undefined,
          cr_number: form.cr_number?.trim() || undefined,
          unified_number: form.unified_number?.trim() || undefined,
          vat_number: form.vat_number?.trim() || undefined,
          main_activity: form.main_activity?.trim() || undefined,
          specialties: form.specialties ?? [],
          brands: form.brands ?? [],
          brief: form.brief?.trim() || undefined,
          map_link: form.map_link?.trim() || undefined,
          national_address: form.national_address?.trim() || undefined,
          city: form.city?.trim() || undefined,
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

      if (!res.ok) {
        const map: Record<string, string> = {
          not_found: t('انتهت صلاحية الجلسة. أعد إدخال بيانات التحقق.', 'Session expired. Re-enter your verification.'),
          invalid_email: t('البريد الإلكتروني غير صحيح', 'Invalid email'),
          invalid_phone: t('رقم الجوال غير صحيح', 'Invalid phone'),
          duplicate_request: t('توجد بيانات متعارضة مع طلب آخر قائم', 'Conflicts with another open request'),
          upload_failed: t('فشل رفع السجل التجاري', 'CR upload failed'),
          invalid_input: t('بيانات غير صحيحة', 'Invalid input'),
          unknown: t('تعذّر الحفظ. حاول مرة أخرى.', 'Could not save. Try again.'),
        };
        toast.error(map[res.errorCode ?? 'unknown']);
        if (res.errorCode === 'not_found') {
          setLead(null); setForm(null); setBranches([]);
        }
        return;
      }

      setSaved(true);
      toast.success(t('تم الحفظ بنجاح', 'Saved successfully'));
      // Refresh from server so the UI reflects normalized values
      const refreshed = await lookupProviderLead(reference, form.email!.trim());
      if (refreshed.ok && refreshed.data) {
        setLead(refreshed.data);
        setForm(refreshed.data);
        setBranches(refreshed.data.branches ?? []);
        setCredential(form.email!.trim());
      }
      setCrFile(null);
      setTimeout(() => setSaved(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // LOOKUP VIEW
  // ============================================================
  if (!lead || !form) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full rounded-2xl shadow-elegant">
            <CardContent className="p-7 sm:p-8 space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <KeyRound className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {t('تعديل بيانات طلبك', 'Edit your request')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'أدخل رقم الطلب الذي وصلك عند التسجيل مع البريد الإلكتروني أو رقم الجوال للتحقق.',
                    'Enter your reference code along with the email or phone you used to verify your identity.',
                  )}
                </p>
              </div>

              <form onSubmit={onLookup} className="space-y-4">
                <Field label={t('رقم الطلب *', 'Reference code *')}>
                  <Input
                    dir="ltr"
                    required
                    placeholder="PRV-1000001"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="h-12 rounded-xl tech-content uppercase"
                  />
                </Field>
                <Field label={t('البريد الإلكتروني أو الجوال *', 'Email or phone *')}>
                  <Input
                    dir="auto"
                    required
                    placeholder={t('name@example.com أو 05xxxxxxxx', 'name@example.com or 05xxxxxxxx')}
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </Field>
                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl hover-lift">
                  {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 me-2" />}
                  {t('متابعة', 'Continue')}
                </Button>
              </form>

              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                {t('ليس لديك طلب بعد؟', 'No request yet?')}{' '}
                <a href="/join/qitaat" className="text-primary font-medium hover:underline">
                  {t('سجّل منشأتك', 'Register your business')}
                </a>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================
  // EDIT VIEW
  // ============================================================
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
            <button
              type="button"
              onClick={() => { setLead(null); setForm(null); setBranches([]); setCredential(''); }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('عودة', 'Back')}
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {t('تعديل بيانات الطلب', 'Edit Request Details')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="tech-content font-mono">{lead.reference_code}</span>
                  {' · '}
                  <span dir="auto">{lead.name_ar}</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lead.status === 'needs_info' ? t('بانتظار معلومات إضافية', 'Needs more info')
                  : lead.status === 'under_review' ? t('قيد المراجعة', 'Under review')
                  : t('جديد', 'New')}
              </span>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 max-w-4xl">
          <form onSubmit={onSave} className="space-y-5 sm:space-y-6">
            {/* Section 1 — Establishment */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 sm:p-6 md:p-8 space-y-5">
                <SectionHeader icon={<Building2 className="w-5 h-5" />} title={t('بيانات المنشأة', 'Establishment Info')} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t('اسم المنشأة بالعربي *', 'Business name (Arabic) *')}>
                    <Input dir="auto" required value={form.name_ar ?? ''} onChange={(e) => update('name_ar', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('اسم المنشأة بالإنجليزي', 'Business name (English)')}>
                    <Input dir="auto" value={form.name_en ?? ''} onChange={(e) => update('name_en', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('السجل التجاري', 'Commercial Registration')}>
                    <Input dir="auto" value={form.cr_number ?? ''} onChange={(e) => update('cr_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('الرقم الموحد', 'Unified Number')}>
                    <Input dir="auto" value={form.unified_number ?? ''} onChange={(e) => update('unified_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('الرقم الضريبي', 'VAT Number')}>
                    <Input dir="auto" value={form.vat_number ?? ''} onChange={(e) => update('vat_number', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('الموقع الإلكتروني', 'Website')}>
                    <Input type="url" dir="ltr" placeholder="https://" value={form.website ?? ''} onChange={(e) => update('website', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                </div>
                <Field label={t('نبذة مختصرة عن المنشأة', 'Short description')}>
                  <Textarea dir="auto" rows={3} maxLength={2000} value={form.brief ?? ''} onChange={(e) => update('brief', e.target.value)} className="rounded-xl" />
                </Field>
              </CardContent>
            </Card>

            {/* Section 2 — Contact */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 sm:p-6 md:p-8 space-y-5">
                <SectionHeader icon={<User className="w-5 h-5" />} title={t('بيانات التواصل', 'Contact Person')} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t('اسم المسؤول *', 'Contact name *')}>
                    <Input dir="auto" required value={form.contact_name ?? ''} onChange={(e) => update('contact_name', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('البريد الإلكتروني *', 'Email *')}>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" required dir="ltr" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} className="h-12 rounded-xl ps-9 tech-content" />
                    </div>
                  </Field>
                  <Field label={t('رقم الجوال *', 'Phone *')}>
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="tel" required dir="ltr" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} className="h-12 rounded-xl ps-9 tech-content" />
                    </div>
                  </Field>
                  <Field label={t('وسيلة التواصل المفضلة', 'Preferred channel')}>
                    <select
                      value={form.preferred_channel ?? 'phone'}
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
                    <Input dir="auto" value={form.main_activity ?? ''} onChange={(e) => update('main_activity', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('المدينة', 'City')}>
                    <Input dir="auto" value={form.city ?? ''} onChange={(e) => update('city', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('الوكالات / العلامات التجارية', 'Brands / Agencies')}>
                    <TagInput
                      values={form.brands ?? []}
                      onChange={(v) => update('brands', v)}
                      placeholder={t('اكتب اسم العلامة ثم Enter', 'Type brand name and press Enter')}
                      dir="auto"
                    />
                  </Field>
                  <Field label={t('العنوان الوطني', 'National Address')}>
                    <Input dir="auto" value={form.national_address ?? ''} onChange={(e) => update('national_address', e.target.value)} className="h-12 rounded-xl tech-content" />
                  </Field>
                  <Field label={t('رابط الموقع على الخريطة', 'Map link')}>
                    <Input type="url" dir="ltr" placeholder="https://maps.google.com/..." value={form.map_link ?? ''} onChange={(e) => update('map_link', e.target.value)} className="h-12 rounded-xl" />
                  </Field>
                  <Field label={t('عدد الفروع', 'Branches count')}>
                    <Input type="number" min={1} dir="ltr" value={form.branches_count ?? 1} onChange={(e) => update('branches_count', Number(e.target.value) || 1)} className="h-12 rounded-xl tech-content" />
                  </Field>
                </div>

                <Field label={t('التخصصات والخدمات', 'Specialties & Services')}>
                  <SpecialtiesPicker
                    catalog={categories}
                    values={form.specialties ?? []}
                    onChange={(v) => update('specialties', v)}
                    isRTL={isRTL}
                  />
                </Field>

                <Field label={t('استبدال ملف السجل التجاري (اختياري)', 'Replace CR file (optional)')}>
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
                  {!crFile && lead.cr_file_path && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('يوجد ملف مرفوع مسبقاً — يُستبدل عند رفع جديد فقط.', 'A file is already attached — it will be replaced only if you upload a new one.')}
                    </p>
                  )}
                </Field>
              </CardContent>
            </Card>

            {/* Branches */}
            {(form.branches_count ?? 1) > 1 && (
              <Card className="rounded-2xl">
                <CardContent className="p-5 sm:p-6 md:p-8 space-y-5">
                  <SectionHeader icon={<Store className="w-5 h-5" />} title={t('بيانات الفروع الإضافية', 'Additional Branches')} />
                  <div className="space-y-3">
                    {branches.map((b, i) => (
                      <details key={i} open className="group rounded-xl border bg-card overflow-hidden">
                        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-4 hover:bg-muted/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold tech-content shrink-0">{i + 2}</span>
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
                          {b.branch_name && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </summary>
                        <div className="border-t p-4 bg-muted/10 space-y-3">
                          <div className="grid md:grid-cols-2 gap-3">
                            <Field label={t('اسم الفرع *', 'Branch name *')}>
                              <Input dir="auto" value={b.branch_name} onChange={(e) => updateBranch(i, 'branch_name', e.target.value)} className="h-11 rounded-lg" />
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
                              <Input dir="ltr" value={b.phone ?? ''} onChange={(e) => updateBranch(i, 'phone', e.target.value)} className="h-11 rounded-lg tech-content" />
                            </Field>
                            <Field label={t('رابط الموقع', 'Map link')}>
                              <Input dir="ltr" value={b.map_link ?? ''} onChange={(e) => updateBranch(i, 'map_link', e.target.value)} className="h-11 rounded-lg" />
                            </Field>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save */}
            <div className="sticky bottom-3 z-10 rounded-2xl border bg-background/95 backdrop-blur p-4 shadow-elegant flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {saved
                  ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" />{t('تم حفظ التغييرات', 'Changes saved')}</span>
                  : t('سيُعاد فتح طلبك للمراجعة بعد الحفظ.', 'Saving will re-open your request for review.')}
              </p>
              <Button type="submit" disabled={saving} size="lg" className="rounded-xl w-full sm:w-auto sm:min-w-[180px] h-12 hover-lift">
                {saving
                  ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t('جاري الحفظ...', 'Saving...')}</>
                  : <><Save className="w-4 h-4 me-2" />{t('حفظ التغييرات', 'Save changes')}</>}
              </Button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderJoinEdit;