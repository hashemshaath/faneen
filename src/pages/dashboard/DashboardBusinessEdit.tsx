import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, Save, Phone, Mail, Globe, MapPin, ShieldCheck, Layers,
  FileText, Image as ImageIcon, Loader2, ExternalLink, AlertTriangle,
  User, Hash,
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ui/image-upload';
import { SectorPicker } from '@/components/onboarding/SectorPicker';
import type { SectorId } from '@/data/onboarding-sectors';

// ---------- Types ----------
interface BusinessRow {
  id: string;
  user_id: string;
  username: string;
  ref_id: string | null;
  approval_status: string | null;
  membership_tier: string | null;
  is_active: boolean;
  is_verified: boolean;
  onboarding_completion: number | null;

  // Identity
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  cover_url: string | null;
  description_ar: string | null;
  description_en: string | null;
  short_description_ar: string | null;
  short_description_en: string | null;

  // Contact
  phone: string | null;
  mobile: string | null;
  customer_service_phone: string | null;
  email: string | null;
  website: string | null;
  contact_person: string | null;

  // Location
  country_id: string | null;
  city_id: string | null;
  region: string | null;
  district: string | null;
  address: string | null;
  street_name: string | null;
  building_number: string | null;
  additional_number: string | null;
  latitude: number | null;
  longitude: number | null;

  // Legal
  national_id: string | null;
  unified_number: string | null;

  // Categorization
  sectors: string[] | null;
  sub_services: string[] | null;
  category_id: string | null;
}

interface RefRow { id: string; name_ar: string; name_en: string }
interface CityRow extends RefRow { country_id: string }

// ---------- Helpers ----------
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

// ---------- Component ----------
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

  // Fetch business
  const { data: business, isLoading, error } = useQuery({
    queryKey: ['business-edit', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BusinessRow | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as BusinessRow | null) ?? null;
    },
  });

  useEffect(() => {
    if (business && !form) setForm(business);
  }, [business, form]);

  // Reference data
  const { data: countries = [] } = useQuery({
    queryKey: ['ref-countries'],
    queryFn: async (): Promise<RefRow[]> => {
      const { data } = await supabase
        .from('countries')
        .select('id, name_ar, name_en')
        .eq('is_active', true)
        .order('name_ar');
      return (data as RefRow[]) ?? [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['ref-cities', form?.country_id],
    enabled: !!form?.country_id,
    queryFn: async (): Promise<CityRow[]> => {
      const { data } = await supabase
        .from('cities')
        .select('id, name_ar, name_en, country_id')
        .eq('is_active', true)
        .eq('country_id', form!.country_id!)
        .order('name_ar');
      return (data as CityRow[]) ?? [];
    },
  });

  // ---------- Field helpers ----------
  const update = <K extends keyof BusinessRow>(key: K, value: BusinessRow[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  // ---------- Save ----------
  const handleSave = async () => {
    if (!form || !user) return;
    setSaving(true);
    try {
      const payload = {
        name_ar: form.name_ar?.trim() || null,
        name_en: form.name_en?.trim() || null,
        logo_url: form.logo_url || null,
        cover_url: form.cover_url || null,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        short_description_ar: form.short_description_ar || null,
        short_description_en: form.short_description_en || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        customer_service_phone: form.customer_service_phone || null,
        email: form.email || null,
        website: form.website || null,
        contact_person: form.contact_person || null,
        country_id: form.country_id || null,
        city_id: form.city_id || null,
        region: form.region || null,
        district: form.district || null,
        address: form.address || null,
        street_name: form.street_name || null,
        building_number: form.building_number || null,
        additional_number: form.additional_number || null,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
        national_id: form.national_id || null,
        unified_number: form.unified_number || null,
        sectors: form.sectors ?? [],
        sub_services: form.sub_services ?? [],
      };

      // Required field guard
      if (!payload.name_ar) {
        toast.error(t(isRTL, 'اسم المنشأة (عربي) مطلوب', 'Business name (Arabic) is required'));
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('businesses')
        .update(payload)
        .eq('id', form.id);

      if (updateError) throw updateError;

      toast.success(t(isRTL, 'تم حفظ التعديلات بنجاح', 'Changes saved successfully'));
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['business-edit', user.id] });
      qc.invalidateQueries({ queryKey: ['business-completion', user.id] });
      qc.invalidateQueries({ queryKey: ['business', form.username] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t(isRTL, `تعذّر الحفظ: ${message}`, `Save failed: ${message}`));
    } finally {
      setSaving(false);
    }
  };

  const completionPct = useMemo(() => {
    if (!form) return 0;
    const checks = [
      !!form.name_ar, !!form.logo_url, !!form.short_description_ar,
      !!form.description_ar, !!(form.phone || form.mobile), !!form.email,
      !!form.city_id, !!form.address, form.latitude != null && form.longitude != null,
      (form.sectors?.length ?? 0) > 0, (form.sub_services?.length ?? 0) > 0,
      !!(form.national_id || form.unified_number),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  // ---------- Render states ----------
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin me-2" />
          {t(isRTL, 'جارِ تحميل البيانات…', 'Loading…')}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl mx-auto border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">{t(isRTL, 'تعذّر التحميل', 'Failed to load')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!business || !form) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t(isRTL, 'لا توجد منشأة مرتبطة بحسابك', 'No business linked to your account')}
            </CardTitle>
            <CardDescription>
              {t(isRTL, 'أكمل خطوات الإعداد أولاً لإنشاء منشأتك.', 'Complete onboarding to create your business first.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/onboarding">{t(isRTL, 'بدء الإعداد', 'Start onboarding')}</Link>
            </Button>
          </CardContent>
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
              {t(isRTL,
                'حدّث جميع بيانات منشأتك من مكان واحد — سيتم نشر التعديلات فور الحفظ.',
                'Update every detail of your business in one place — saved changes go live immediately.')}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" className={statusTone}>
                <ShieldCheck className="w-3 h-3 me-1" />
                {status}
              </Badge>
              {form.ref_id && (
                <Badge variant="outline" className="font-mono tech-content">
                  <Hash className="w-3 h-3 me-1" />{form.ref_id}
                </Badge>
              )}
              <Badge variant="outline">{t(isRTL, 'الجاهزية:', 'Readiness:')} {completionPct}%</Badge>
              {form.username && (
                <Link
                  to={`/${form.username}`}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  target="_blank" rel="noreferrer"
                >
                  {t(isRTL, 'عرض الصفحة العامة', 'View public page')}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5 self-start sm:self-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t(isRTL, 'حفظ التغييرات', 'Save changes')}
          </Button>
        </header>

        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><Building2 className="w-4 h-4 text-primary" />{t(isRTL, 'الهوية', 'Identity')}</CardTitle>
            <CardDescription>{t(isRTL, 'الاسم التجاري والشعار وصورة الغلاف.', 'Trade name, logo and cover image.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'اسم المنشأة (عربي) *', 'Business name (Arabic) *')}</Label>
                <Input dir="auto" value={form.name_ar ?? ''} onChange={(e) => update('name_ar', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'اسم المنشأة (إنجليزي)', 'Business name (English)')}</Label>
                <Input dir="auto" value={form.name_en ?? ''} onChange={(e) => update('name_en', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الشعار', 'Logo')}</Label>
                <ImageUpload
                  bucket="business-assets"
                  folder={`logos/${form.id}`}
                  value={form.logo_url ?? undefined}
                  onChange={(url) => update('logo_url', url)}
                  onRemove={() => update('logo_url', null)}
                  aspectRatio="square"
                  className="mt-1"
                  placeholder={t(isRTL, 'ارفع شعار المنشأة', 'Upload business logo')}
                />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'صورة الغلاف', 'Cover image')}</Label>
                <ImageUpload
                  bucket="business-assets"
                  folder={`covers/${form.id}`}
                  value={form.cover_url ?? undefined}
                  onChange={(url) => update('cover_url', url)}
                  onRemove={() => update('cover_url', null)}
                  aspectRatio="video"
                  className="mt-1"
                  placeholder={t(isRTL, 'ارفع صورة الغلاف', 'Upload cover image')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><FileText className="w-4 h-4 text-primary" />{t(isRTL, 'الوصف والنبذة', 'About & description')}</CardTitle>
            <CardDescription>{t(isRTL, 'وصف مختصر يظهر في نتائج البحث، ووصف كامل يظهر في صفحة المنشأة.', 'A short blurb for search cards and a full description for your profile.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'نبذة مختصرة (عربي)', 'Short description (Arabic)')}</Label>
                <Textarea dir="auto" value={form.short_description_ar ?? ''} maxLength={200}
                  onChange={(e) => update('short_description_ar', e.target.value)} className="mt-1 min-h-[70px]" />
                <p className="text-[11px] text-muted-foreground mt-1 tech-content">{(form.short_description_ar?.length ?? 0)}/200</p>
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'نبذة مختصرة (إنجليزي)', 'Short description (English)')}</Label>
                <Textarea dir="auto" value={form.short_description_en ?? ''} maxLength={200}
                  onChange={(e) => update('short_description_en', e.target.value)} className="mt-1 min-h-[70px]" />
                <p className="text-[11px] text-muted-foreground mt-1 tech-content">{(form.short_description_en?.length ?? 0)}/200</p>
              </div>
            </div>
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الوصف الكامل (عربي)', 'Full description (Arabic)')}</Label>
                <Textarea dir="auto" rows={6} value={form.description_ar ?? ''}
                  onChange={(e) => update('description_ar', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الوصف الكامل (إنجليزي)', 'Full description (English)')}</Label>
                <Textarea dir="auto" rows={6} value={form.description_en ?? ''}
                  onChange={(e) => update('description_en', e.target.value)} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><Phone className="w-4 h-4 text-primary" />{t(isRTL, 'وسائل التواصل', 'Contact channels')}</CardTitle>
            <CardDescription>{t(isRTL, 'أرقام الاتصال والبريد والموقع الإلكتروني والشخص المسؤول.', 'Phones, email, website, and primary contact person.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الهاتف الثابت', 'Landline phone')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} placeholder="+966 11 000 0000" />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الجوال', 'Mobile')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.mobile ?? ''} onChange={(e) => update('mobile', e.target.value)} placeholder="+966 5x xxx xxxx" />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'هاتف خدمة العملاء', 'Customer service phone')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.customer_service_phone ?? ''} onChange={(e) => update('customer_service_phone', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}><Mail className="w-3 h-3 inline me-1" />{t(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                <Input type="email" dir="ltr" className="mt-1" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}><Globe className="w-3 h-3 inline me-1" />{t(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
                <Input type="url" dir="ltr" className="mt-1" value={form.website ?? ''} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
              </div>
              <div>
                <Label className={fieldLabel}><User className="w-3 h-3 inline me-1" />{t(isRTL, 'الشخص المسؤول', 'Contact person')}</Label>
                <Input dir="auto" className="mt-1" value={form.contact_person ?? ''} onChange={(e) => update('contact_person', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><MapPin className="w-4 h-4 text-primary" />{t(isRTL, 'الموقع والعنوان', 'Location & address')}</CardTitle>
            <CardDescription>{t(isRTL, 'العنوان الوطني وإحداثيات الموقع لظهور منشأتك على الخريطة.', 'National address and coordinates so your business shows on the map.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الدولة', 'Country')}</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.country_id ?? ''}
                  onChange={(e) => { update('country_id', e.target.value || null); update('city_id', null); }}
                >
                  <option value="">{t(isRTL, 'اختر الدولة', 'Select country')}</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'المدينة', 'City')}</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  value={form.city_id ?? ''}
                  disabled={!form.country_id}
                  onChange={(e) => update('city_id', e.target.value || null)}
                >
                  <option value="">{t(isRTL, 'اختر المدينة', 'Select city')}</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'المنطقة', 'Region')}</Label>
                <Input dir="auto" className="mt-1" value={form.region ?? ''} onChange={(e) => update('region', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الحي', 'District')}</Label>
                <Input dir="auto" className="mt-1" value={form.district ?? ''} onChange={(e) => update('district', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'اسم الشارع', 'Street name')}</Label>
                <Input dir="auto" className="mt-1" value={form.street_name ?? ''} onChange={(e) => update('street_name', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'رقم المبنى', 'Building number')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.building_number ?? ''} onChange={(e) => update('building_number', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الرقم الإضافي', 'Additional number')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.additional_number ?? ''} onChange={(e) => update('additional_number', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'العنوان التفصيلي', 'Full address')}</Label>
                <Input dir="auto" className="mt-1" value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'خط العرض (Latitude)', 'Latitude')}</Label>
                <Input dir="ltr" type="number" step="0.00000001" className="mt-1 tech-content" value={form.latitude ?? ''} onChange={(e) => update('latitude', e.target.value === '' ? null : Number(e.target.value))} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'خط الطول (Longitude)', 'Longitude')}</Label>
                <Input dir="ltr" type="number" step="0.00000001" className="mt-1 tech-content" value={form.longitude ?? ''} onChange={(e) => update('longitude', e.target.value === '' ? null : Number(e.target.value))} />
              </div>
            </div>
            {form.latitude != null && form.longitude != null && (
              <a
                href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                target="_blank" rel="noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                {t(isRTL, 'فتح الموقع في خرائط Google', 'Open location in Google Maps')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* Sectors & services */}
        <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><Layers className="w-4 h-4 text-primary" />{t(isRTL, 'القطاعات والخدمات', 'Sectors & services')}</CardTitle>
            <CardDescription>{t(isRTL, 'اختر القطاعات الصناعية وخدماتك الفرعية لتظهر للعملاء المهتمين.', 'Pick the industrial sectors and sub-services so the right customers find you.')}</CardDescription>
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
            <CardTitle className={sectionTitle}><ShieldCheck className="w-4 h-4 text-primary" />{t(isRTL, 'البيانات النظامية', 'Legal identifiers')}</CardTitle>
            <CardDescription>{t(isRTL, 'الرقم الموحّد ورقم السجل التجاري لتفعيل التوثيق.', 'Unified number and commercial registration to enable verification.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={grid2}>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'رقم السجل التجاري', 'Commercial Registration (CR)')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.national_id ?? ''} onChange={(e) => update('national_id', e.target.value)} />
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'الرقم الموحّد للمنشأة', 'Unified national number')}</Label>
                <Input dir="ltr" className="mt-1 tech-content" value={form.unified_number ?? ''} onChange={(e) => update('unified_number', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Read-only metadata */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t(isRTL, 'بيانات النظام', 'System metadata')}</CardTitle>
          </CardHeader>
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
            {dirty ? (
              <><AlertTriangle className="w-3.5 h-3.5 text-warning" />{t(isRTL, 'لديك تغييرات غير محفوظة', 'You have unsaved changes')}</>
            ) : (
              <><ImageIcon className="w-3.5 h-3.5" />{t(isRTL, 'لا توجد تغييرات معلّقة', 'No pending changes')}</>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t(isRTL, 'حفظ التغييرات', 'Save changes')}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardBusinessEdit;