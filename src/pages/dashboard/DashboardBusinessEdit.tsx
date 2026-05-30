import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, Save, Phone, Mail, Globe, MapPin, ShieldCheck, Layers,
  FileText, Image as ImageIcon, Loader2, ExternalLink, AlertTriangle,
  User, Hash, UserCog, CheckCircle2, Sparkles,
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerBusiness, updateBusinessById, listBusinessesByIds } from '@/modules/businesses';
import { nationalAddressLookup } from '@/modules/locations';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PermissionHint } from '@/components/workspace/PermissionGate';
import { usePermissionParity } from '@/hooks/usePermissionParity';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/image-upload';
import { SectorPicker } from '@/components/onboarding/SectorPicker';
import type { SectorId } from '@/data/onboarding-sectors';
import { PhoneField, parsePhoneValue, toE164 } from '@/components/forms/PhoneField';

import type { BusinessRow } from '@/components/dashboard/business-edit/types';
import { BilingualField } from '@/components/dashboard/business-edit/BilingualField';
import { RepresentativesSection } from '@/components/dashboard/business-edit/RepresentativesSection';
import { AuditLogPanel } from '@/components/dashboard/business-edit/AuditLogPanel';
import { BusinessInternalNotesCard } from '@/components/business/BusinessInternalNotesCard';
import { validateBusinessForm, issuesByKey, errorCount } from '@/components/dashboard/business-edit/validation';
import { ValidationBanner, FieldError } from '@/components/dashboard/business-edit/ValidationBanner';
import { FieldHint } from '@/components/dashboard/business-edit/FieldHint';
import { LocationPicker, type ReverseGeocodeResult } from '@/components/dashboard/business-edit/LocationPicker';
import { ProviderGrowthCard } from '@/components/growth/ProviderGrowthCard';
import { BusinessBarcodeCard } from '@/components/business-profile/BusinessBarcodeCard';
import { UsernamePicker } from '@/components/common/UsernamePicker';
import { CrDocumentScanner } from '@/components/admin/CrDocumentScanner';
import {
  SA_REGIONS,
  findRegionByLabel,
  findRegionForCity,
  getRegionById,
  type SaRegionId,
} from '@/data/sa-regions';

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

  // WORKSPACE-CONTEXT-4A: respect the active entity selection when it
  // refers to a business the user owns. RLS on `businesses.user_id`
  // remains authoritative; this only changes which owned row is loaded
  // for multi-business owners. Reset local form when entity changes.
  const { active_entity_id, entities } = useActiveWorkspace();
  const activeOwnerEntityId = useMemo(() => {
    if (!active_entity_id) return null;
    const e = entities.find((x) => x.entity_id === active_entity_id);
    return e && e.source === 'owner' ? e.entity_id : null;
  }, [active_entity_id, entities]);

  const { data: business, isLoading, error } = useQuery({
    queryKey: ['business-edit', user?.id, activeOwnerEntityId],
    enabled: !!user,
    queryFn: async (): Promise<BusinessRow | null> => {
      if (!user) return null;
      if (activeOwnerEntityId) {
        const { data, error } = await listBusinessesByIds<BusinessRow>({
          ids: [activeOwnerEntityId], select: '*',
        });
        if (error) throw error;
        return ((data ?? [])[0] as BusinessRow | undefined) ?? null;
      }
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

  // Reset form when the loaded business id changes (e.g. user switched
  // the active entity in the workspace switcher).
  useEffect(() => {
    if (!business) return;
    if (!form || form.id !== business.id) setForm(business);
  }, [business, form]);

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

  // ------------------------------------------------------------------
  // SA region <-> city helpers
  // ------------------------------------------------------------------
  const [regionId, setRegionId] = useState<SaRegionId | ''>('');
  // Once the form loads, infer the region id from the stored AR/EN label
  // or from the selected city, so the dropdown shows the current value.
  useEffect(() => {
    if (!form) return;
    if (regionId) return;
    const fromLabel = findRegionByLabel(form.region) ?? findRegionByLabel(form.region_en);
    if (fromLabel) { setRegionId(fromLabel); return; }
    if (form.city_id && cities.length) {
      const c = cities.find((x) => x.id === form.city_id);
      if (c) {
        const inferred = findRegionForCity(c.name_ar, c.name_en);
        if (inferred) setRegionId(inferred);
      }
    }
  }, [form, cities, regionId]);

  const filteredCities = useMemo<CityRow[]>(() => {
    if (!regionId) return cities;
    const matched = cities.filter((c) => findRegionForCity(c.name_ar, c.name_en) === regionId);
    // If our token map didn't match anything for this region, fall back to
    // the full list so the user is never stuck with an empty dropdown.
    return matched.length ? matched : cities;
  }, [cities, regionId]);

  const handleRegionChange = (id: SaRegionId | '') => {
    setRegionId(id);
    const region = getRegionById(id || null);
    setForm((prev) => prev ? {
      ...prev,
      region: region?.name_ar ?? null,
      region_en: region?.name_en ?? null,
      // Reset city if it no longer belongs to the new region
      city_id: prev.city_id && region && findRegionForCity(
        cities.find((c) => c.id === prev.city_id)?.name_ar,
        cities.find((c) => c.id === prev.city_id)?.name_en,
      ) !== region.id ? null : prev.city_id,
    } : prev);
    setDirty(true);
  };

  // ------------------------------------------------------------------
  // Saudi National Address — short-address autofill
  // ------------------------------------------------------------------
  const [shortAddress, setShortAddress] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);

  const handleShortAddressLookup = async () => {
    if (!shortAddress.trim()) return;
    setLookupBusy(true);
    try {
      const { data, error } = await nationalAddressLookup({ shortAddress: shortAddress.trim() });
      if (error) throw error;
      const res = data as {
        ok: boolean;
        message_ar?: string;
        message_en?: string;
        address?: {
          region_ar: string | null; region_en: string | null;
          city_ar: string | null;   city_en: string | null;
          district_ar: string | null; district_en: string | null;
          street_ar: string | null;   street_en: string | null;
          address_ar: string | null;  address_en: string | null;
          building_number: string | null; additional_number: string | null;
          post_code: string | null;
        };
      };
      if (!res.ok || !res.address) {
        toast.error(isRTL ? (res.message_ar ?? 'تعذّر جلب العنوان') : (res.message_en ?? 'Lookup failed'));
        return;
      }
      const a = res.address;
      setForm((prev) => prev ? {
        ...prev,
        region: a.region_ar ?? prev.region,
        region_en: a.region_en ?? prev.region_en,
        district: a.district_ar ?? prev.district,
        district_en: a.district_en ?? prev.district_en,
        street_name: a.street_ar ?? prev.street_name,
        street_name_en: a.street_en ?? prev.street_name_en,
        address: a.address_ar ?? prev.address,
        address_en: a.address_en ?? prev.address_en,
        building_number: a.building_number ?? prev.building_number,
        additional_number: a.additional_number ?? prev.additional_number,
      } : prev);
      setDirty(true);
      // Try to auto-select the region too
      const inferred = findRegionByLabel(a.region_ar) ?? findRegionByLabel(a.region_en);
      if (inferred) setRegionId(inferred);
      // Try to auto-select the city if a matching DB row exists
      if (a.city_ar || a.city_en) {
        const match = cities.find((c) =>
          (a.city_ar && c.name_ar?.includes(a.city_ar)) ||
          (a.city_en && c.name_en?.toLowerCase().includes(a.city_en.toLowerCase())),
        );
        if (match) setForm((prev) => prev ? { ...prev, city_id: match.id } : prev);
      }
      toast.success(isRTL ? 'تم جلب العنوان وتعبئة الحقول' : 'Address fetched and fields filled');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّر الاتصال بخدمة العنوان: ${message}` : `Address service error: ${message}`);
    } finally {
      setLookupBusy(false);
    }
  };

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

  // Per-tab missing/incomplete counters so the user can see at a glance
  // which sections still need attention without scrolling through everything.
  const tabMissing = useMemo(() => {
    if (!form) return { basic: 0, contact: 0, location: 0, sectors: 0, legal: 0 };
    return {
      basic:
        (!form.name_ar ? 1 : 0) +
        (!form.logo_url ? 1 : 0) +
        (!form.short_description_ar ? 1 : 0) +
        (!form.description_ar ? 1 : 0),
      contact:
        (!(form.phone || form.mobile) ? 1 : 0) +
        (!form.email ? 1 : 0) +
        (!form.account_manager_name ? 1 : 0),
      location:
        (!form.city_id ? 1 : 0) +
        (!form.address ? 1 : 0) +
        (form.latitude == null || form.longitude == null ? 1 : 0),
      sectors:
        ((form.sectors?.length ?? 0) === 0 ? 1 : 0) +
        ((form.sub_services?.length ?? 0) === 0 ? 1 : 0),
      legal:
        (!(form.national_id || form.unified_number) ? 1 : 0) +
        (!form.vat_number ? 1 : 0),
    };
  }, [form]);

  // WORKSPACE-RBAC-6E — shadow parity check (observability only, no enforcement).
  // Hook must run unconditionally before any early returns below.
  usePermissionParity('entity.manage');

  // Keyboard shortcut: Cmd/Ctrl+S to save while editing.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        if (!dirty || saving) return;
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving, form]);

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

  // Conic-gradient readiness ring — fluid visual signal alongside the % chip.
  const ringStyle: React.CSSProperties = {
    background: `conic-gradient(hsl(var(--primary)) ${completionPct * 3.6}deg, hsl(var(--muted)) 0deg)`,
  };

  const tabBadge = (n: number) =>
    n > 0 ? (
      <span className="ms-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-warning/15 text-warning text-[10px] font-bold px-1 tech-content">
        {n}
      </span>
    ) : (
      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
    );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-24 pt-4 scroll-mt-32">
        {/* Compact header — title + status + save. The big visuals
            (readiness ring, growth tips, validation summary) move to the
            secondary helper column so the form itself stays the priority. */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {t(isRTL, 'تعديل بيانات المنشأة', 'Edit Business Profile')}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className={statusTone}>
                <ShieldCheck className="w-3 h-3 me-1" />{status}
              </Badge>
              {form.ref_id && (
                <Badge variant="outline" className="font-mono tech-content">
                  <Hash className="w-3 h-3 me-1" />{form.ref_id}
                </Badge>
              )}
              {form.username && (
                <Link
                  to={`/${form.username}`}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(isRTL, 'عرض الصفحة العامة', 'View public page')}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
          <PermissionHint permission="entity.manage">
            <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5 self-start sm:self-auto shrink-0">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t(isRTL, 'حفظ التغييرات', 'Save changes')}
            </Button>
          </PermissionHint>
        </header>

        {/* Two-column layout: form (primary) + helper sidebar (secondary).
            On mobile, the helper collapses below the form. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ========== PRIMARY: form ========== */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6 min-w-0">
            {/* Inline, compact error summary — only when there are real errors.
                Soft suggestions move to the sidebar to avoid noise. */}
            {hasErrors && <ValidationBanner issues={validationIssues} isRTL={isRTL} />}

            <Tabs defaultValue="basic" className="w-full">
            <TabsList className="sticky top-16 z-20 w-full flex flex-wrap h-auto justify-start gap-1 bg-background/85 backdrop-blur border border-border/40 p-1.5 rounded-xl shadow-sm">
            <TabsTrigger value="basic" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />{t(isRTL, 'البيانات الأساسية', 'Basic Info')}{tabBadge(tabMissing.basic)}</TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5"><Phone className="w-3.5 h-3.5" />{t(isRTL, 'التواصل والمدير', 'Contact & Manager')}{tabBadge(tabMissing.contact)}</TabsTrigger>
            <TabsTrigger value="location" className="gap-1.5"><MapPin className="w-3.5 h-3.5" />{t(isRTL, 'الموقع', 'Location')}{tabBadge(tabMissing.location)}</TabsTrigger>
            <TabsTrigger value="sectors" className="gap-1.5"><Layers className="w-3.5 h-3.5" />{t(isRTL, 'القطاعات', 'Sectors')}{tabBadge(tabMissing.sectors)}</TabsTrigger>
            <TabsTrigger value="legal" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />{t(isRTL, 'البيانات النظامية', 'Legal & Tax')}{tabBadge(tabMissing.legal)}</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5"><User className="w-3.5 h-3.5" />{t(isRTL, 'المفوّضون', 'Representatives')}</TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5"><FileText className="w-3.5 h-3.5" />{t(isRTL, 'سجل ونظام', 'System & Audit')}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 mt-4">
            {/* Identity */}
            <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><Building2 className="w-4 h-4 text-primary" />{t(isRTL, 'بيانات المنشأة', 'Business Details')}</CardTitle>
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
            <FieldHint>
              {t(isRTL,
                'اكتب الاسم التجاري المسجَّل بالضبط كما يظهر في السجل التجاري. تجنّب الاختصارات أو الأسماء التسويقية.',
                'Use the exact registered trade name from your CR. Avoid abbreviations or marketing nicknames.')}
            </FieldHint>
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
              <FieldHint>
                {t(isRTL,
                  'حروف إنجليزية صغيرة وأرقام وشرطة فقط. سيظهر كرابط دائم: qitaat.com/your-name — لا يمكن تغييره كثيرًا.',
                  'Lowercase letters, numbers and hyphens only. Becomes your permanent URL: qitaat.com/your-name — avoid frequent changes.')}
              </FieldHint>
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
                <FieldHint>
                  {t(isRTL,
                    'مربع 512×512 بكسل على الأقل، خلفية واضحة، PNG أو WebP. تجنّب الصور المنسوخة من وسائل التواصل.',
                    'Square ≥ 512×512px, clean background, PNG or WebP. Avoid screenshots from social media.')}
                </FieldHint>
              </div>
              <div>
                <Label className={fieldLabel}>{t(isRTL, 'صورة الغلاف', 'Cover image')}</Label>
                <ImageUpload bucket="business-assets" folder={`covers/${form.id}`}
                  value={form.cover_url ?? undefined}
                  onChange={(url) => update('cover_url', url)}
                  onRemove={() => update('cover_url', null)}
                  aspectRatio="video" className="mt-1"
                  placeholder={t(isRTL, 'ارفع صورة الغلاف', 'Upload cover image')} />
                <FieldHint>
                  {t(isRTL,
                    'نسبة 16:9، يفضّل صورة لمصنعك أو معرضك. لا تضع رقم هاتف أو نصوص داخل الصورة.',
                    '16:9 ratio, ideally a photo of your workshop or showroom. Don\'t embed phone numbers or text in the image.')}
                </FieldHint>
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
            <FieldHint>
              {t(isRTL,
                'سطر واحد يظهر في نتائج البحث والبطاقات. ركّز على تخصصك (مثل: تصنيع وتركيب واجهات الألمنيوم).',
                'A single line shown in search results and cards. Lead with your specialty (e.g. Aluminum facade fabrication & installation).')}
            </FieldHint>
            <BilingualField isRTL={isRTL} multiline rows={6}
              label={{ ar: 'الوصف الكامل', en: 'Full description' }}
              valueAr={form.description_ar ?? ''} valueEn={form.description_en ?? ''}
              onChangeAr={(v) => update('description_ar', v)} onChangeEn={(v) => update('description_en', v)} />
            <FieldHint>
              {t(isRTL,
                'اشرح خبرتك وأهم المشاريع والقطاعات التي تخدمها. لا تكرّر اسم المنشأة ولا تضع روابط خارجية.',
                'Describe your expertise, flagship projects, and sectors served. Don\'t repeat your business name or paste external links.')}
            </FieldHint>
          </CardContent>
        </Card>

        {/* Contact */}
          </TabsContent>

          <TabsContent value="contact" className="space-y-6 mt-4">
            {/* Contact */}
            <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><Phone className="w-4 h-4 text-primary" />{t(isRTL, 'وسائل التواصل', 'Contact channels')}</CardTitle>
            <CardDescription>{t(isRTL, 'أرقام الاتصال والبريد والموقع الإلكتروني.', 'Phones, email, and website.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={grid2}>
              <div>
                <PhoneField value={parsePhoneValue(form.phone)} onChange={(v) => update('phone', toE164(v))} label={t(isRTL, 'الهاتف الثابت', 'Landline phone')} optional />
                <FieldError issue={issueMap.phone} isRTL={isRTL} />
              </div>
              <div>
                <PhoneField value={parsePhoneValue(form.mobile)} onChange={(v) => update('mobile', toE164(v))} label={t(isRTL, 'الجوال', 'Mobile')} optional />
                <FieldError issue={issueMap.mobile} isRTL={isRTL} />
                <FieldHint>
                  {t(isRTL,
                    'رقم نشط على واتساب يفضَّل. سيظهر في زر "تواصل" للعملاء.',
                    'Preferably WhatsApp-enabled. Shown to customers in the "Contact" button.')}
                </FieldHint>
              </div>
              <div>
                <PhoneField value={parsePhoneValue(form.customer_service_phone)} onChange={(v) => update('customer_service_phone', toE164(v))} label={t(isRTL, 'هاتف خدمة العملاء', 'Customer service phone')} optional />
                <FieldError issue={issueMap.customer_service_phone} isRTL={isRTL} />
              </div>
              <div><Label className={fieldLabel}><Mail className="w-3 h-3 inline me-1" />{t(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                <Input type="email" dir="ltr" className="mt-1" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
                <FieldError issue={issueMap.email} isRTL={isRTL} />
                <FieldHint>
                  {t(isRTL,
                    'بريد العمل العام (مثل info@yourcompany.com). تجنّب بريد شخصي على Gmail/Hotmail.',
                    'A public business email (e.g. info@yourcompany.com). Avoid personal Gmail/Hotmail addresses.')}
                </FieldHint>
              </div>
              <div><Label className={fieldLabel}><Globe className="w-3 h-3 inline me-1" />{t(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
                <Input type="url" dir="ltr" className="mt-1" value={form.website ?? ''} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
                <FieldError issue={issueMap.website} isRTL={isRTL} />
                <FieldHint>
                  {t(isRTL, 'اختياري — يبدأ بـ https:// ويعمل على متصفح حقيقي.', 'Optional — must start with https:// and load in a real browser.')}
                </FieldHint>
              </div>
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
              <div>
                <PhoneField value={parsePhoneValue(form.account_manager_phone)} onChange={(v) => update('account_manager_phone', toE164(v))} label={t(isRTL, 'الجوال', 'Mobile')} optional />
                <FieldError issue={issueMap.account_manager_phone} isRTL={isRTL} />
              </div>
              <div><Label className={fieldLabel}>{t(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                <Input type="email" dir="ltr" className="mt-1" value={form.account_manager_email ?? ''} onChange={(e) => update('account_manager_email', e.target.value)} />
                <FieldError issue={issueMap.account_manager_email} isRTL={isRTL} /></div>
            </div>
            <FieldHint>
              {t(isRTL,
                'هذه البيانات للتواصل الداخلي مع فريق قِطاعات فقط — لا تظهر للعملاء على الصفحة العامة.',
                'Used only for internal contact by the Qitaat team — not shown publicly on your profile.')}
            </FieldHint>
          </CardContent>
        </Card>

        {/* Location */}
          </TabsContent>

          <TabsContent value="location" className="space-y-6 mt-4">
            {/* Location */}
            <Card>
          <CardHeader>
            <CardTitle className={sectionTitle}><MapPin className="w-4 h-4 text-primary" />{t(isRTL, 'الموقع والعنوان', 'Location & address')}</CardTitle>
            <CardDescription>{t(isRTL, 'العنوان الوطني (عربي/إنجليزي) وإحداثيات الموقع لظهور منشأتك على الخريطة.', 'National address (Arabic/English) and coordinates so your business shows on the map.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Short Saudi National Address — type "RRRD2402" and auto-fill everything below */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <Label className="text-xs font-medium text-primary">
                {t(isRTL, 'العنوان الوطني المختصر', 'Short national address')}
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  dir="ltr"
                  className="tech-content uppercase"
                  placeholder="RRRD2402"
                  value={shortAddress}
                  onChange={(e) => setShortAddress(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleShortAddressLookup(); } }}
                  maxLength={8}
                />
                <Button type="button" onClick={handleShortAddressLookup} disabled={lookupBusy || shortAddress.trim().length < 8} className="gap-1.5">
                  {lookupBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {t(isRTL, 'تعبئة العنوان', 'Auto-fill address')}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t(
                  isRTL,
                  'أدخل العنوان الوطني المختصر (4 أحرف + 4 أرقام) من خطاب الواصل لتعبئة المنطقة والمدينة والحي والشارع تلقائيًا.',
                  'Enter your Saudi short national address (4 letters + 4 digits) from the WASEL letter to auto-fill region, city, district and street.',
                )}
              </p>
            </div>

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
                <Label className={fieldLabel}>{t(isRTL, 'المنطقة', 'Region')}</Label>
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={regionId}
                  onChange={(e) => handleRegionChange(e.target.value as SaRegionId | '')}>
                  <option value="">{t(isRTL, 'اختر المنطقة', 'Select region')}</option>
                  {SA_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>{isRTL ? r.name_ar : r.name_en}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className={fieldLabel}>{t(isRTL, 'المدينة', 'City')}</Label>
              <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                value={form.city_id ?? ''} disabled={!regionId}
                onChange={(e) => update('city_id', e.target.value || null)}>
                <option value="">
                  {!regionId
                    ? t(isRTL, 'اختر المنطقة أولاً', 'Select a region first')
                    : t(isRTL, 'اختر المدينة', 'Select city')}
                </option>
                {filteredCities.map((c) => <option key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</option>)}
              </select>
            </div>

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
          </TabsContent>

          <TabsContent value="sectors" className="space-y-6 mt-4">
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
          </TabsContent>

          <TabsContent value="legal" className="space-y-6 mt-4">
            {/* Commercial Registration QR scanner — single source of truth for CR/Unified/VAT */}
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
          </TabsContent>

          <TabsContent value="team" className="space-y-6 mt-4">
            {/* Representatives */}
            <RepresentativesSection
          businessId={form.id}
          ownerUserId={form.user_id}
          isRTL={isRTL}
          businessNameAr={form.name_ar}
          businessNameEn={form.name_en}
        />

        {/* Audit log */}
          </TabsContent>

          <TabsContent value="system" className="space-y-6 mt-4">
            {/* Audit log */}
            <AuditLogPanel businessId={form.id} isRTL={isRTL} />

            {/* BUSINESS-CORE-2 — Internal notes (RLS-gated to owner/manager/staff) */}
            <BusinessInternalNotesCard businessId={form.id} />

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

          </TabsContent>
        </Tabs>
          </div>

          {/* ========== SECONDARY: helper sidebar ========== */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-4 min-w-0">
            <div className="lg:sticky lg:top-16 space-y-4">
              {/* Readiness — small ring + progress, moved out of the hero */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={ringStyle}
                      aria-label={t(isRTL, `الجاهزية ${completionPct}%`, `Readiness ${completionPct}%`)}
                    >
                      <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center overflow-hidden">
                        {form.logo_url ? (
                          <img src={form.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {t(isRTL, 'اكتمال البيانات', 'Profile readiness')}
                        </span>
                        <span className="text-sm font-bold tech-content">{completionPct}%</span>
                      </div>
                      <div className="h-1.5 mt-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-500"
                          style={{ width: `${completionPct}%` }}
                          role="progressbar"
                          aria-valuenow={completionPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Soft validation suggestions (warnings only). Errors stay
                  inline in the main column where the fix happens. */}
              {!hasErrors && validationIssues.length > 0 && (
                <ValidationBanner issues={validationIssues} isRTL={isRTL} />
              )}

              {/* Growth & tips — secondary helper, not priority */}
              <ProviderGrowthCard business={form} />
            </div>
          </aside>
        </div>

        <Separator className="my-6" />

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 backdrop-blur px-4 py-3 shadow-[var(--elev-2)]">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {dirty
              ? (<><AlertTriangle className="w-3.5 h-3.5 text-warning" />{t(isRTL, 'لديك تغييرات غير محفوظة', 'You have unsaved changes')}</>)
              : (<><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{t(isRTL, 'كل التغييرات محفوظة', 'All changes saved')}</>)}
            <span className="hidden sm:inline opacity-60">·</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 h-5 rounded border border-border bg-muted/50 text-[10px] tech-content">
              {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'}+S
            </kbd>
          </div>
          <PermissionHint permission="entity.manage">
            <Button onClick={handleSave} disabled={saving || !dirty || hasErrors} className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t(isRTL, 'حفظ التغييرات', 'Save changes')}
            </Button>
          </PermissionHint>
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