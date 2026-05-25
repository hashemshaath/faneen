import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, Save, Phone, Mail, Globe, MapPin, ShieldCheck, Layers,
  FileText, Image as ImageIcon, Loader2, ExternalLink, AlertTriangle,
  User, Hash, Receipt, UserCog,
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerBusiness, updateBusinessById } from '@/modules/businesses';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ui/image-upload';
import { SectorPicker } from '@/components/onboarding/SectorPicker';
import type { SectorId } from '@/data/onboarding-sectors';

import type { BusinessRow } from '@/components/dashboard/business-edit/types';
import { BilingualField } from '@/components/dashboard/business-edit/BilingualField';
import { RepresentativesSection } from '@/components/dashboard/business-edit/RepresentativesSection';
import { AuditLogPanel } from '@/components/dashboard/business-edit/AuditLogPanel';
import { validateBusinessForm, issuesByKey, errorCount } from '@/components/dashboard/business-edit/validation';
import { ValidationBanner, FieldError } from '@/components/dashboard/business-edit/ValidationBanner';
import { LocationPicker, type ReverseGeocodeResult } from '@/components/dashboard/business-edit/LocationPicker';
import { BusinessBarcodeCard } from '@/components/business-profile/BusinessBarcodeCard';
import { UsernamePicker } from '@/components/common/UsernamePicker';
import { CrDocumentScanner } from '@/components/admin/CrDocumentScanner';

interface RefRow { id: string; name_ar: string; name_en: string }
interface CityRow extends RefRow { country_id: string }

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);
const sectionTitle = 'flex items-center gap-2 text-base font-semibold text-foreground';
const fieldLabel = 'text-xs font-medium text-muted-foreground';
const grid2 = 'grid gap-4 sm:grid-cols-2';

const statusToneMap: Record<string, string> = {
  approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  submitted: 'border-info/30 bg-info/10 text-info',
  under_review: 'border-info/30 bg-info/10 text-info',
  needs_changes: 'border-destructive/30 bg-destructive/10 text-destructive',
  rejected: 'border-destructive/30 bg-destructive/10 text-destructive',
  draft: 'border-warning/30 bg-warning/10 text-warning',
};

const DashboardBusinessEdit: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  usePageMeta({
    title: t(isRTL, 'تعديل بيانات المنشأة | قِطاعات', 'Edit Business Profile | Qitaat'),
    noindex: true,
  });

  const [form, setForm] = useState<BusinessRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const validationIssues = useMemo(() => (form ? validateBusinessForm(form) : []), [form]);
  const issueMap = useMemo(() => issuesByKey(validationIssues), [validationIssues]);
  const errors = errorCount(validationIssues);
  const hasErrors = errors > 0;

  const { data: business, isLoading, error } = useQuery({
    queryKey: ['business-edit', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BusinessRow | null> => {
      if (!user) return null;
      const { data, error } = await getOwnerBusiness<BusinessRow>({
        userId: user.id,
        select: '*',
        orderBy: { column: 'created_at', ascending: false },
        limit: 1,
      });
      if (error) throw error;
      return (data as BusinessRow | null) ?? null;
    },
  });

  useEffect(() => { if (business && !form) setForm(business); }, [business, form]);

  const { data: countries = [] } = useQuery({
    queryKey: ['ref-countries'],
    queryFn: async (): Promise<RefRow[]> => {
      const { data } = await supabase.from('countries').select('id, name_ar, name_en').eq('is_active', true).order('name_ar');
      return (data as RefRow[]) ?? [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['ref-cities', form?.country_id],
    enabled: !!form?.country_id,
    queryFn: async (): Promise<CityRow[]> => {
      const { data } = await supabase.from('cities').select('id, name_ar, name_en, country_id')
        .eq('is_active', true).eq('country_id', form!.country_id!).order('name_ar');
      return (data as CityRow[]) ?? [];
    },
  });

  const update = <K extends keyof BusinessRow>(key: K, value: BusinessRow[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  const handleMapPick = (lat: number, lng: number) => {
    setForm((prev) => (prev ? { ...prev, latitude: lat, longitude: lng } : prev));
    setDirty(true);
  };

  const handleAutofillAddress = (data: ReverseGeocodeResult) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        region: data.region_ar || prev.region,
        region_en: data.region_en || prev.region_en,
        district: data.district_ar || prev.district,
        district_en: data.district_en || prev.district_en,
        address: data.address_ar || prev.address,
        address_en: data.address_en || prev.address_en,
      };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form || !user) return;
    if (hasErrors) {
      // Allow partial saves but warn about format errors that still need
      // attention (invalid VAT, email, phone, …). We never block the user
      // from saving whatever valid data they've already entered.
      toast.warning(t(
        isRTL,
        'تم الحفظ مع وجود حقول تحتاج إلى مراجعة لاحقًا',
        'Saved — some fields still need review',
      ));
    }
    setSaving(true);
    try {
      const trim = (v: string | null) => (v?.trim() || null);
      const payload = {
        name_ar: trim(form.name_ar), name_en: trim(form.name_en),
        username: trim(form.username),
        logo_url: form.logo_url || null, cover_url: form.cover_url || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        short_description_ar: form.short_description_ar || null, short_description_en: form.short_description_en || null,
        phone: form.phone || null, mobile: form.mobile || null,
        customer_service_phone: form.customer_service_phone || null,
        email: form.email || null, website: form.website || null,
        contact_person: form.contact_person || null,
        country_id: form.country_id || null, city_id: form.city_id || null,
        region: form.region || null, region_en: form.region_en || null,
        district: form.district || null, district_en: form.district_en || null,
        address: form.address || null, address_en: form.address_en || null,
        street_name: form.street_name || null, street_name_en: form.street_name_en || null,
        building_number: form.building_number || null, additional_number: form.additional_number || null,
        latitude: form.latitude ?? null, longitude: form.longitude ?? null,
        national_id: form.national_id || null, unified_number: form.unified_number || null,
        vat_number: form.vat_number || null,
        account_manager_name: form.account_manager_name || null,
        account_manager_phone: form.account_manager_phone || null,
        account_manager_email: form.account_manager_email || null,
        account_manager_position: form.account_manager_position || null,
        sectors: form.sectors ?? [], sub_services: form.sub_services ?? [],
      };
      const { error: updateError } = await updateBusinessById({ id: form.id, values: payload });
      if (updateError) throw updateError;
      if (!hasErrors) {
        toast.success(t(isRTL, 'تم حفظ التعديلات بنجاح', 'Changes saved successfully'));
      }
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['business-edit', user.id] });
      qc.invalidateQueries({ queryKey: ['business-completion', user.id] });
      qc.invalidateQueries({ queryKey: ['business', form.username] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t(isRTL, `تعذّر الحفظ: ${message}`, `Save failed: ${message}`));
    } finally { setSaving(false); }
  };

  const completionPct = useMemo(() => {
    if (!form) return 0;
    const checks = [
      !!form.name_ar, !!form.logo_url, !!form.short_description_ar,
      !!form.description_ar, !!(form.phone || form.mobile), !!form.email,
      !!form.city_id, !!form.address, form.latitude != null && form.longitude != null,
      (form.sectors?.length ?? 0) > 0, (form.sub_services?.length ?? 0) > 0,
      !!(form.national_id || form.unified_number), !!form.vat_number,
      !!form.account_manager_name,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin me-2" />{t(isRTL, 'جارِ تحميل البيانات…', 'Loading…')}
        </div>
      </DashboardLayout>
    );
  }
  if (error) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl mx-auto border-destructive/30">
          <CardHeader><CardTitle className="text-destructive">{t(isRTL, 'تعذّر التحميل', 'Failed to load')}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  if (!business || !form) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />
              {t(isRTL, 'لا توجد منشأة مرتبطة بحسابك', 'No business linked to your account')}</CardTitle>
            <CardDescription>{t(isRTL, 'أكمل خطوات الإعداد أولاً.', 'Complete onboarding to create your business first.')}</CardDescription>
          </CardHeader>
          <CardContent><Button asChild><Link to="/onboarding">{t(isRTL, 'بدء الإعداد', 'Start onboarding')}</Link></Button></CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const status = (form.approval_status ?? 'draft') as keyof typeof statusToneMap;
  const statusTone = statusToneMap[status] ?? statusToneMap.draft;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-24">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t(isRTL, 'تعديل بيانات المنشأة', 'Edit Business Profile')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {t(isRTL, 'حدّث جميع بيانات منشأتك من مكان واحد — التعديلات تُنشر فور الحفظ.',
                'Update every detail of your business in one place — saved changes go live immediately.')}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" className={statusTone}><ShieldCheck className="w-3 h-3 me-1" />{status}</Badge>
              {form.ref_id && <Badge variant="outline" className="font-mono tech-content"><Hash className="w-3 h-3 me-1" />{form.ref_id}</Badge>}
              <Badge variant="outline">{t(isRTL, 'الجاهزية:', 'Readiness:')} <span className="tech-content ms-1">{completionPct}%</span></Badge>
              {form.username && (
                <Link to={`/${form.username}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1" target="_blank" rel="noreferrer">
                  {t(isRTL, 'عرض الصفحة العامة', 'View public page')}<ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5 self-start sm:self-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t(isRTL, 'حفظ التغييرات', 'Save changes')}
          </Button>
        </header>

        <ValidationBanner issues={validationIssues} isRTL={isRTL} />

        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><Building2 className="w-4 h-4 text-primary" />{t(isRTL, 'الهوية', 'Identity')}</CardTitle>
            <CardDescription>{t(isRTL, 'الاسم التجاري والشعار وصورة الغلاف.', 'Trade name, logo and cover image.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <BilingualField
              isRTL={isRTL}
              label={{ ar: 'اسم المنشأة *', en: 'Business name *' }}
              valueAr={form.name_ar ?? ''} valueEn={form.name_en ?? ''}
              onChangeAr={(v) => update('name_ar', v)} onChangeEn={(v) => update('name_en', v)}
              placeholderAr="مثال: شركة قطاعات الصناعية" placeholderEn="e.g. Qitaat Industrial Co."
            />
            <div>
              <UsernamePicker
                isRTL={isRTL}
                required
                label={t(isRTL, 'اسم المستخدم (الرابط العام)', 'Username (public URL)')}
                value={form.username ?? ''}
                onChange={(v) => update('username', v)}
                excludeUserId={user?.id ?? null}
                placeholder="my-business"
              />
            </div>
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الشعار', 'Logo')}</Label>
                <ImageUpload bucket="business-assets" folder={`logos/${form.id}`}
                  value={form.logo_url ?? undefined}
                  onChange={(url) => update('logo_url', url)}
                  onRemove={() => update('logo_url', null)}
                  aspectRatio="square" className="mt-1"
                  placeholder={t(isRTL, 'ارفع شعار المنشأة', 'Upload business logo')} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'صورة الغلاف', 'Cover image')}</Label>
                <ImageUpload bucket="business-assets" folder={`covers/${form.id}`}
                  value={form.cover_url ?? undefined}
                  onChange={(url) => update('cover_url', url)}
                  onRemove={() => update('cover_url', null)}
                  aspectRatio="video" className="mt-1"
                  placeholder={t(isRTL, 'ارفع صورة الغلاف', 'Upload cover image')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><FileText className="w-4 h-4 text-primary" />{t(isRTL, 'الوصف والنبذة', 'About & description')}</CardTitle>
            <CardDescription>{t(isRTL, 'وصف مختصر يظهر في نتائج البحث، ووصف كامل في صفحة المنشأة.', 'A short blurb for search cards and a full description for your profile.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BilingualField isRTL={isRTL} maxLength={200}
              label={{ ar: 'نبذة مختصرة', en: 'Short description' }}
              valueAr={form.short_description_ar ?? ''} valueEn={form.short_description_en ?? ''}
              onChangeAr={(v) => update('short_description_ar', v)} onChangeEn={(v) => update('short_description_en', v)} />
            <BilingualField isRTL={isRTL} multiline rows={6}
              label={{ ar: 'الوصف الكامل', en: 'Full description' }}
              valueAr={form.description_ar ?? ''} valueEn={form.description_en ?? ''}
              onChangeAr={(v) => update('description_ar', v)} onChangeEn={(v) => update('description_en', v)} />
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><Phone className="w-4 h-4 text-primary" />{t(isRTL, 'وسائل التواصل', 'Contact channels')}</CardTitle>
            <CardDescription>{t(isRTL, 'أرقام الاتصال والبريد والموقع الإلكتروني.', 'Phones, email, and website.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={grid2}>
              <div><Label className={fieldLabel}>{t(isRTL, 'الهاتف الثابت', 'Landline phone')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} placeholder="+966 11 000 0000" />
                <FieldError issue={issueMap.phone} isRTL={isRTL} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'الجوال', 'Mobile')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.mobile ?? ''} onChange={(e) => update('mobile', e.target.value)} placeholder="+966 5x xxx xxxx" />
                <FieldError issue={issueMap.mobile} isRTL={isRTL} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'هاتف خدمة العملاء', 'Customer service phone')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.customer_service_phone ?? ''} onChange={(e) => update('customer_service_phone', e.target.value)} />
                <FieldError issue={issueMap.customer_service_phone} isRTL={isRTL} /></div>
              <div><Label className={fieldLabel}><Mail className="w-3 h-3 inline me-1" />{t(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                <Input type="email" dir="ltr" className="mt-1" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
                <FieldError issue={issueMap.email} isRTL={isRTL} /></div>
              <div><Label className={fieldLabel}><Globe className="w-3 h-3 inline me-1" />{t(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
                <Input type="url" dir="ltr" className="mt-1" value={form.website ?? ''} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
                <FieldError issue={issueMap.website} isRTL={isRTL} /></div>
              <div><Label className={fieldLabel}><User className="w-3 h-3 inline me-1" />{t(isRTL, 'الشخص المسؤول للتواصل', 'Public contact person')}</Label>
                <Input dir="auto" className="mt-1" value={form.contact_person ?? ''} onChange={(e) => update('contact_person', e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Account Manager */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><UserCog className="w-4 h-4 text-primary" />{t(isRTL, 'بيانات مدير الحساب الرئيسي', 'Primary account manager')}</CardTitle>
            <CardDescription>{t(isRTL, 'الشخص المسؤول عن إدارة حسابكم لدى منصة قِطاعات والتواصل مع الفريق.', 'The person responsible for managing your Qitaat account and liaising with our team.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={grid2}>
              <div><Label className={fieldLabel}>{t(isRTL, 'الاسم الكامل', 'Full name')}</Label>
                <Input dir="auto" className="mt-1" value={form.account_manager_name ?? ''} onChange={(e) => update('account_manager_name', e.target.value)} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'المسمى الوظيفي', 'Job title')}</Label>
                <Input dir="auto" className="mt-1" value={form.account_manager_position ?? ''} onChange={(e) => update('account_manager_position', e.target.value)} placeholder={t(isRTL, 'مثال: مدير مبيعات', 'e.g. Sales Manager')} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'الجوال', 'Mobile')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.account_manager_phone ?? ''} onChange={(e) => update('account_manager_phone', e.target.value)} placeholder="+966 5x xxx xxxx" />
                <FieldError issue={issueMap.account_manager_phone} isRTL={isRTL} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                <Input type="email" dir="ltr" className="mt-1" value={form.account_manager_email ?? ''} onChange={(e) => update('account_manager_email', e.target.value)} />
                <FieldError issue={issueMap.account_manager_email} isRTL={isRTL} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><MapPin className="w-4 h-4 text-primary" />{t(isRTL, 'الموقع والعنوان', 'Location & address')}</CardTitle>
            <CardDescription>{t(isRTL, 'العنوان الوطني (عربي/إنجليزي) وإحداثيات الموقع لظهور منشأتك على الخريطة.', 'National address (Arabic/English) and coordinates so your business shows on the map.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الدولة', 'Country')}</Label>
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.country_id ?? ''}
                  onChange={(e) => { update('country_id', e.target.value || null); update('city_id', null); }}>
                  <option value="">{t(isRTL, 'اختر الدولة', 'Select country')}</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</option>)}
                </select>
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'المدينة', 'City')}</Label>
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  value={form.city_id ?? ''} disabled={!form.country_id}
                  onChange={(e) => update('city_id', e.target.value || null)}>
                  <option value="">{t(isRTL, 'اختر المدينة', 'Select city')}</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</option>)}
                </select>
              </div>
            </div>

            <BilingualField isRTL={isRTL}
              label={{ ar: 'المنطقة', en: 'Region' }}
              valueAr={form.region ?? ''} valueEn={form.region_en ?? ''}
              onChangeAr={(v) => update('region', v)} onChangeEn={(v) => update('region_en', v)}
              placeholderAr="مثال: منطقة الرياض" placeholderEn="e.g. Riyadh Region" />

            <BilingualField isRTL={isRTL}
              label={{ ar: 'الحي', en: 'District' }}
              valueAr={form.district ?? ''} valueEn={form.district_en ?? ''}
              onChangeAr={(v) => update('district', v)} onChangeEn={(v) => update('district_en', v)}
              placeholderAr="مثال: حي العليا" placeholderEn="e.g. Al Olaya" />

            <BilingualField isRTL={isRTL}
              label={{ ar: 'اسم الشارع', en: 'Street name' }}
              valueAr={form.street_name ?? ''} valueEn={form.street_name_en ?? ''}
              onChangeAr={(v) => update('street_name', v)} onChangeEn={(v) => update('street_name_en', v)} />

            <BilingualField isRTL={isRTL} multiline rows={2}
              label={{ ar: 'العنوان التفصيلي', en: 'Full address' }}
              valueAr={form.address ?? ''} valueEn={form.address_en ?? ''}
              onChangeAr={(v) => update('address', v)} onChangeEn={(v) => update('address_en', v)} />

            <div className={grid2}>
              <div><Label className={fieldLabel}>{t(isRTL, 'رقم المبنى', 'Building number')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.building_number ?? ''} onChange={(e) => update('building_number', e.target.value)} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'الرقم الإضافي', 'Additional number')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.additional_number ?? ''} onChange={(e) => update('additional_number', e.target.value)} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'خط العرض (Latitude)', 'Latitude')}</Label>
                <Input dir="ltr" type="number" step="0.00000001" className="mt-1 tech-content" value={form.latitude ?? ''} onChange={(e) => update('latitude', e.target.value === '' ? null : Number(e.target.value))} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'خط الطول (Longitude)', 'Longitude')}</Label>
                <Input dir="ltr" type="number" step="0.00000001" className="mt-1 tech-content" value={form.longitude ?? ''} onChange={(e) => update('longitude', e.target.value === '' ? null : Number(e.target.value))} /></div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className={fieldLabel}>
                  <MapPin className="w-3 h-3 inline me-1" />
                  {t(isRTL, 'حدد الموقع على الخريطة *', 'Pick location on the map *')}
                </Label>
                {issueMap.coordinates && (
                  <span className="text-xs text-destructive">{t(isRTL, 'مطلوب', 'Required')}</span>
                )}
              </div>
              <LocationPicker
                isRTL={isRTL}
                latitude={form.latitude ?? null}
                longitude={form.longitude ?? null}
                onChange={handleMapPick}
                onAutofill={handleAutofillAddress}
              />
              <FieldError issue={issueMap.coordinates} isRTL={isRTL} />
            </div>
          </CardContent>
        </Card>

        {/* Sectors */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><Layers className="w-4 h-4 text-primary" />{t(isRTL, 'القطاعات والخدمات', 'Sectors & services')}</CardTitle>
            <CardDescription>{t(isRTL, 'اختر القطاعات الصناعية وخدماتك الفرعية.', 'Pick the industrial sectors and sub-services.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <SectorPicker
              selectedSectors={(form.sectors ?? []) as SectorId[]}
              selectedSubServices={form.sub_services ?? []}
              onSectorsChange={(s) => update('sectors', s)}
              onSubServicesChange={(s) => update('sub_services', s)}
            />
          </CardContent>
        </Card>

        {/* Legal */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><ShieldCheck className="w-4 h-4 text-primary" />{t(isRTL, 'البيانات النظامية والضريبية', 'Legal & tax identifiers')}</CardTitle>
            <CardDescription>{t(isRTL, 'السجل التجاري والرقم الموحّد ورقم ضريبة القيمة المضافة لتفعيل التوثيق وإصدار الفواتير.', 'CR, unified national number, and VAT number to enable verification and invoicing.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label className={fieldLabel}>{t(isRTL, 'رقم السجل التجاري', 'Commercial Registration (CR)')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.national_id ?? ''} onChange={(e) => update('national_id', e.target.value)} placeholder="1010xxxxxx" maxLength={10} />
                <FieldError issue={issueMap.national_id} isRTL={isRTL} /></div>
              <div><Label className={fieldLabel}>{t(isRTL, 'الرقم الموحّد للمنشأة', 'Unified national number')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.unified_number ?? ''} onChange={(e) => update('unified_number', e.target.value)} placeholder="7000xxxxxx" maxLength={10} />
                <FieldError issue={issueMap.unified_number} isRTL={isRTL} /></div>
              <div><Label className={fieldLabel}><Receipt className="w-3 h-3 inline me-1" />{t(isRTL, 'الرقم الضريبي (VAT)', 'VAT number')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.vat_number ?? ''} onChange={(e) => update('vat_number', e.target.value)} placeholder="3xxxxxxxxxxxxx3" maxLength={15} />
                <FieldError issue={issueMap.vat_number} isRTL={isRTL} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Commercial Registration QR scanner */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}>
              <ShieldCheck className="w-4 h-4 text-primary" />
              {t(isRTL, 'استيراد بيانات السجل التجاري', 'Import from Commercial Registration')}
            </CardTitle>
            <CardDescription>
              {t(
                isRTL,
                'ارفع وثيقة السجل التجاري أو صورة الباركود (PDF / صورة) لتعبئة الحقول النظامية تلقائيًا.',
                'Upload your CR document or QR image (PDF / image) to auto-fill all legal fields.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrDocumentScanner
              businessId={form.id}
              defaults={{
                cr_document_url: form.cr_document_url ?? null,
                cr_document_uploaded_at: form.cr_document_uploaded_at ?? null,
                cr_scan_data: null,
                cr_scan_raw: null,
                national_id: form.national_id ?? null,
                unified_number: form.unified_number ?? null,
                vat_number: form.vat_number ?? null,
                cr_owner_name: form.cr_owner_name ?? null,
                cr_legal_entity: form.cr_legal_entity ?? null,
                cr_issue_date: form.cr_issue_date ?? null,
                cr_expiry_date: form.cr_expiry_date ?? null,
                name_ar: form.name_ar,
                name_en: form.name_en,
              }}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ['business-edit', user?.id] });
              }}
            />
          </CardContent>
        </Card>

        {/* Representatives */}
        <RepresentativesSection
          businessId={form.id}
          ownerUserId={form.user_id}
          isRTL={isRTL}
          businessNameAr={form.name_ar}
          businessNameEn={form.name_en}
        />

        {/* Audit log */}
        <AuditLogPanel businessId={form.id} isRTL={isRTL} />

        {/* Business barcode + 30x20 cm printable sticker */}
        <BusinessBarcodeCard
          businessId={form.id}
          businessName={isRTL ? form.name_ar : (form.name_en || form.name_ar)}
        />

        {/* System metadata */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t(isRTL, 'بيانات النظام', 'System metadata')}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-2"><span className="font-medium">{t(isRTL, 'اسم المستخدم:', 'Username:')}</span><span className="tech-content">{form.username}</span></div>
            <div className="flex items-center gap-2"><span className="font-medium">{t(isRTL, 'الباقة:', 'Membership tier:')}</span><span className="tech-content">{form.membership_tier ?? 'free'}</span></div>
            <div className="flex items-center gap-2"><span className="font-medium">{t(isRTL, 'موثّق:', 'Verified:')}</span>{form.is_verified ? '✓' : '—'}</div>
            <div className="flex items-center gap-2"><span className="font-medium">{t(isRTL, 'نشط:', 'Active:')}</span>{form.is_active ? '✓' : '—'}</div>
          </CardContent>
        </Card>

        <Separator />

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 backdrop-blur px-4 py-3 shadow-[var(--elev-2)]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {dirty
              ? (<><AlertTriangle className="w-3.5 h-3.5 text-warning" />{t(isRTL, 'لديك تغييرات غير محفوظة', 'You have unsaved changes')}</>)
              : (<><ImageIcon className="w-3.5 h-3.5" />{t(isRTL, 'لا توجد تغييرات معلّقة', 'No pending changes')}</>)}
          </div>
          <Button onClick={handleSave} disabled={saving || !dirty || hasErrors} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t(isRTL, 'حفظ التغييرات', 'Save changes')}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardBusinessEdit;

/**
 * Form is split into reusable units under components/dashboard/business-edit/:
 *   - types.ts                    Shared BusinessRow + StaffMember types
 *   - BilingualField.tsx          AR↔EN inputs with one-click AI translation
 *   - RepresentativesSection.tsx  Staff roster + role/permission editor
 */