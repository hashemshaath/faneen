import { pickBi } from '@/components/common/Bilingual';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive, Building2, Check, Eye, Filter, Globe2, Inbox, Link2,
  RefreshCw, ShieldCheck, Tag as TagIcon, X,
} from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ContentAdminPageShell,
  ContentFiltersBar,
  ContentStatsStrip,
  DirectoryStatusBadge,
  VerificationStatusBadge,
  type ContentStatItem,
} from '@/components/admin/content';
import type { AdminFilterPill } from '@/components/admin/AdminFiltersBar';
import {
  BrandDetailsDrawer,
  buildBrandDetailsDrawerProps,
} from '@/components/admin/content/brands';
// Phase 4: category hints now come from `taxonomy_categories` directly.
import { supabase } from '@/integrations/supabase/client';

import {
  adminListBrands, adminApproveBrand, adminRejectBrand, adminArchiveBrand,
  adminListBrandLinkSummaries, listSectorsLite,
  brandStatusLabel, verificationLabel, pick,
  type AdminBrandLinkSummary, type Brand, type BrandStatus,
} from '@/modules/brands';

const ALL = '__all__';
const STATUS_FILTERS: Array<BrandStatus | 'all'> = ['all', 'approved', 'pending', 'in_review', 'rejected', 'archived'];
const PROVIDER_FILTERS = ['all', 'with_providers', 'without_providers', 'with_sectors', 'without_sectors'] as const;
const VERIFICATION_FILTERS = ['all', 'official', 'verified', 'unverified'] as const;

type ProviderFilter = typeof PROVIDER_FILTERS[number];
type VerificationFilter = typeof VERIFICATION_FILTERS[number];

const STATUS_PILL_TONE: Record<BrandStatus | 'all', AdminFilterPill['tone']> = {
  all: 'default',
  approved: 'success',
  pending: 'warning',
  in_review: 'info',
  rejected: 'destructive',
  archived: 'default',
  draft: 'default',
  merged: 'default',
};

const STATUS_BADGE_TONE: Record<BrandStatus, 'success' | 'warning' | 'info' | 'destructive' | 'muted'> = {
  approved: 'success',
  pending: 'warning',
  in_review: 'info',
  rejected: 'destructive',
  archived: 'muted',
  draft: 'muted',
  merged: 'muted',
};

interface CategoryLite {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string | null;
  parent_id: string | null;
}

interface SectorLite {
  id: string;
  name_ar: string;
  name_en: string | null;
  icon: string | null;
  is_active: boolean;
}

const EMPTY_BRANDS: Brand[] = [];
const EMPTY_SECTORS: SectorLite[] = [];
const EMPTY_CATEGORIES: CategoryLite[] = [];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const AdminBrands: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const locale = pickBi(isRTL, 'ar', 'en');
  usePageMeta({ title: pickBi(isRTL, 'سجل العلامات التجارية — إدارة', 'Brands Registry — Admin'), noindex: true });
  const qc = useQueryClient();

  const [status, setStatus] = useState<BrandStatus | 'all'>('all');
  const [sectorId, setSectorId] = useState<string>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [verification, setVerification] = useState<VerificationFilter>('all');
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [q, setQ] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewBrand = useMemo(() => allBrands.find((b) => b.id === previewId) ?? null, [allBrands, previewId]);

  const brandsQuery = useQuery({
    queryKey: ['admin-brands', q],
    queryFn: () => adminListBrands({ status: 'all', q: q.trim() || undefined }),
    staleTime: 20_000,
  });
  const allBrands = brandsQuery.data ?? EMPTY_BRANDS;

  const sectorsQuery = useQuery({
    queryKey: ['admin-brand-sectors-lite'],
    queryFn: listSectorsLite,
    staleTime: 5 * 60_000,
  });
  const sectors = sectorsQuery.data ?? EMPTY_SECTORS;

  const categoriesQuery = useQuery({
    queryKey: ['admin-brand-category-reference'],
    queryFn: async () => {
      // Taxonomy-only source — replaces the legacy `categories` query.
      const { data, error } = await supabase
        .from('taxonomy_categories')
        .select('id, name_ar, name_en, slug, parent_id')
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });
      if (error) throw error instanceof Error ? error : new Error(String(error));
      return (data ?? []) as CategoryLite[];
    },
    staleTime: 5 * 60_000,
  });
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;

  const summariesQuery = useQuery({
    queryKey: ['admin-brand-link-summaries', allBrands.map((b) => b.id).join(',')],
    queryFn: () => adminListBrandLinkSummaries(allBrands.map((b) => b.id)),
    enabled: allBrands.length > 0,
    staleTime: 20_000,
  });
  const summaryMap = useMemo(() => new Map((summariesQuery.data ?? []).map((s) => [s.brand_id, s])), [summariesQuery.data]);

  const sectorMap = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);

  const categoryHints = useMemo(() => {
    const bySlug = new Map(categories.filter((c) => c.slug).map((c) => [c.slug as string, c]));
    return sectors.reduce<Record<string, CategoryLite[]>>((acc, sector) => {
      const direct = bySlug.get(sector.id);
      const loose = categories.filter((c) => {
        const ar = `${c.name_ar} ${sector.name_ar}`.toLowerCase();
        const en = `${c.name_en ?? ''} ${sector.name_en ?? ''}`.toLowerCase();
        return c.slug === sector.id || ar.includes(sector.name_ar.toLowerCase()) || en.includes((sector.name_en ?? '').toLowerCase());
      });
      const resolved = direct ? [direct, ...loose.filter((c) => c.id !== direct.id)] : loose;
      acc[sector.id] = resolved.slice(0, 3);
      return acc;
    }, {});
  }, [categories, sectors]);

  const countries = useMemo(() => {
    const out = new Map<string, string>();
    for (const brand of allBrands) {
      if (!brand.country_of_origin_code) continue;
      out.set(
        brand.country_of_origin_code,
        (locale === 'ar' ? brand.country_of_origin_name_ar : brand.country_of_origin_name_en) || brand.country_of_origin_code,
      );
    }
    return Array.from(out.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allBrands, locale]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    allBrands.forEach((b) => { out[b.status] = (out[b.status] ?? 0) + 1; });
    return out;
  }, [allBrands]);

  const brands = useMemo(() => {
    return allBrands.filter((brand) => {
      const summary = summaryMap.get(brand.id);
      const linkedSectorIds = summary?.sector_ids ?? [];
      const hasProviderLinks = (summary?.business_count ?? 0) > 0 || (summary?.service_count ?? 0) > 0;
      const hasSectorLinks = linkedSectorIds.length > 0;

      if (status !== 'all' && brand.status !== status) return false;
      if (sectorId !== ALL && brand.sector_id !== sectorId && !linkedSectorIds.includes(sectorId)) return false;
      if (country !== ALL && brand.country_of_origin_code !== country) return false;
      if (verification === 'official' && brand.verification_status !== 'official') return false;
      if (verification === 'verified' && !brand.is_verified && brand.verification_status !== 'verified') return false;
      if (verification === 'unverified' && (brand.is_verified || brand.verification_status !== 'unverified')) return false;
      if (providerFilter === 'with_providers' && !hasProviderLinks) return false;
      if (providerFilter === 'without_providers' && hasProviderLinks) return false;
      if (providerFilter === 'with_sectors' && !hasSectorLinks) return false;
      if (providerFilter === 'without_sectors' && hasSectorLinks) return false;
      return true;
    });
  }, [allBrands, country, providerFilter, sectorId, status, summaryMap, verification]);

  const stats = useMemo(() => {
    let approved = 0;
    let verified = 0;
    let withSectors = 0;
    let withProviders = 0;
    for (const brand of allBrands) {
      const summary = summaryMap.get(brand.id);
      if (brand.status === 'approved') approved += 1;
      if (brand.is_verified || brand.verification_status === 'official' || brand.verification_status === 'verified') verified += 1;
      if ((summary?.sector_ids.length ?? 0) > 0) withSectors += 1;
      if ((summary?.business_count ?? 0) > 0 || (summary?.service_count ?? 0) > 0) withProviders += 1;
    }
    return { total: allBrands.length, approved, verified, withSectors, withProviders };
  }, [allBrands, summaryMap]);

  const resetFilters = () => {
    setStatus('all');
    setSectorId(ALL);
    setCountry(ALL);
    setVerification('all');
    setProviderFilter('all');
    setQ('');
  };
  const canReset =
    status !== 'all' || sectorId !== ALL || country !== ALL ||
    verification !== 'all' || providerFilter !== 'all' || q.trim() !== '';

  const approve = useMutation({
    mutationFn: (id: string) => adminApproveBrand(id),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم اعتماد العلامة', 'Brand approved')); qc.invalidateQueries({ queryKey: ['admin-brands'] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const reject = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => adminRejectBrand(vars.id, vars.reason),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم الرفض', 'Rejected')); setRejecting(null); setReason(''); qc.invalidateQueries({ queryKey: ['admin-brands'] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const archive = useMutation({
    mutationFn: (id: string) => adminArchiveBrand(id),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تمت الأرشفة', 'Archived')); qc.invalidateQueries({ queryKey: ['admin-brands'] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const statusPills: AdminFilterPill[] = STATUS_FILTERS.map((s) => ({
    key: s,
    label: s === 'all'
      ? pickBi(isRTL, 'الكل', 'All')
      : pick(brandStatusLabel[s as BrandStatus], locale),
    count: s === 'all' ? allBrands.length : counts[s as string],
    tone: STATUS_PILL_TONE[s],
  }));

  const statItems: ContentStatItem[] = [
    { key: 'total', label: pickBi(isRTL, 'إجمالي العلامات', 'Total brands'), value: stats.total, icon: TagIcon, tone: 'primary' },
    { key: 'approved', label: pickBi(isRTL, 'معتمدة', 'Approved'), value: stats.approved, icon: Check, tone: 'success' },
    { key: 'verified', label: pickBi(isRTL, 'موثقة', 'Verified'), value: stats.verified, icon: ShieldCheck, tone: 'info' },
    { key: 'providers', label: pickBi(isRTL, 'مرتبطة بمزودين', 'Provider-linked'), value: stats.withProviders, icon: Link2, tone: stats.withProviders === 0 ? 'muted' : 'accent' },
  ];

  const sectorOptions = [
    { value: ALL, label: pickBi(isRTL, 'كل القطاعات', 'All sectors') },
    ...sectors.map((sector) => ({
      value: sector.id,
      label: locale === 'ar' ? sector.name_ar : (sector.name_en ?? sector.name_ar),
    })),
  ];

  const filtersRightSlot = (
    <>
      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger className="h-11 w-40 rounded-xl bg-background/60"><SelectValue placeholder={pickBi(isRTL, 'بلد المنشأ', 'Origin')} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{pickBi(isRTL, 'كل البلدان', 'All origins')}</SelectItem>
          {countries.map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={verification} onValueChange={(value) => setVerification(value as VerificationFilter)}>
        <SelectTrigger className="h-11 w-40 rounded-xl bg-background/60"><SelectValue placeholder={pickBi(isRTL, 'التوثيق', 'Verification')} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{pickBi(isRTL, 'كل حالات التوثيق', 'All verification')}</SelectItem>
          <SelectItem value="official">{pickBi(isRTL, 'رسمية', 'Official')}</SelectItem>
          <SelectItem value="verified">{pickBi(isRTL, 'موثقة', 'Verified')}</SelectItem>
          <SelectItem value="unverified">{pickBi(isRTL, 'غير موثقة', 'Unverified')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={providerFilter} onValueChange={(value) => setProviderFilter(value as ProviderFilter)}>
        <SelectTrigger className="h-11 w-40 rounded-xl bg-background/60"><SelectValue placeholder={pickBi(isRTL, 'الربط', 'Linking')} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{pickBi(isRTL, 'كل حالات الربط', 'All links')}</SelectItem>
          <SelectItem value="with_providers">{pickBi(isRTL, 'مرتبطة بمزودين', 'With providers')}</SelectItem>
          <SelectItem value="without_providers">{pickBi(isRTL, 'بدون مزودين', 'Without providers')}</SelectItem>
          <SelectItem value="with_sectors">{pickBi(isRTL, 'مرتبطة بقطاعات', 'With sectors')}</SelectItem>
          <SelectItem value="without_sectors">{pickBi(isRTL, 'بدون قطاعات', 'Without sectors')}</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  const header = (
    <AdminPageHeader
      icon={TagIcon}
      tone="primary"
      eyebrow={pickBi(isRTL, 'الإدارة', 'Admin')}
      title={pickBi(isRTL, 'سجل العلامات التجارية', 'Brands Registry')}
      subtitle={pickBi(isRTL, 'إدارة العلامات وربطها بالقطاعات والخدمات والمزودين من مكان واحد', 'Manage brands, sector mapping, services, and provider assignments in one place')}
      breadcrumbs={[
        { label: pickBi(isRTL, 'الإدارة', 'Admin'), href: '/admin' },
        { label: pickBi(isRTL, 'العلامات التجارية', 'Brands') },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/taxonomy"><Filter className="w-4 h-4 me-2" />{pickBi(isRTL, 'مركز التصنيفات', 'Taxonomy Center')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/brand-requests"><Inbox className="w-4 h-4 me-2" />{pickBi(isRTL, 'طلبات العلامات', 'Brand requests')}</Link>
          </Button>
        </div>
      }
    />
  );

  const filters = (
    <ContentFiltersBar
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder={pickBi(isRTL, 'ابحث بالاسم أو الرابط أو الرقم المرجعي…', 'Search by name, slug, website, or ref id…')}
      pills={statusPills}
      activePill={status}
      onPillSelect={(key) => setStatus(key as BrandStatus | 'all')}
      sectorOptions={sectorOptions}
      activeSector={sectorId}
      onSectorChange={setSectorId}
      sectorAllValue={ALL}
      sectorPlaceholder={pickBi(isRTL, 'القطاع', 'Sector')}
      canReset={canReset}
      onReset={resetFilters}
      resetLabel={pickBi(isRTL, 'إعادة ضبط', 'Reset')}
      rightSlot={filtersRightSlot}
    />
  );

  const unlinkedCallout = stats.total > 0 && stats.withProviders === 0 && !brandsQuery.isLoading ? (
    <Card className="border-dashed">
      <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">{pickBi(isRTL, 'العلامات موجودة لكن لم تُسند بعد إلى خدمات المزودين', 'Brands exist but are not assigned to provider services yet')}</p>
          <p className="text-sm text-muted-foreground">
            {pickBi(isRTL, 'تم العثور على العلامات في السجل وربطها بالقطاعات، لكن جدول ربط العلامات بخدمات الشركات لا يحتوي على روابط حالياً.', 'The registry and sector links are populated, but the provider-service brand assignment table has no links yet.')}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-10 rounded-xl">
          <Link to="/admin/businesses"><Building2 className="w-4 h-4 me-2" />{pickBi(isRTL, 'إسناد عبر الشركات', 'Assign via businesses')}</Link>
        </Button>
      </CardContent>
    </Card>
  ) : null;

  const content = (
    <>
      {unlinkedCallout}
      <div className={`grid gap-4 ${previewBrand ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-3 flex-wrap">
            <span>{pickBi(isRTL, 'العلامات', 'Brands')} <span className="text-muted-foreground text-sm">({brands.length})</span></span>
            <Button size="sm" variant="ghost" onClick={() => { qc.invalidateQueries({ queryKey: ['admin-brands'] }); qc.invalidateQueries({ queryKey: ['admin-brand-link-summaries'] }); }}>
              <RefreshCw className="w-4 h-4 me-2" />{pickBi(isRTL, 'تحديث', 'Refresh')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {brandsQuery.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : brandsQuery.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center space-y-3">
              <p className="font-semibold text-destructive">{pickBi(isRTL, 'تعذر تحميل العلامات', 'Could not load brands')}</p>
              <p className="text-sm text-muted-foreground">{errorMessage(brandsQuery.error, pickBi(isRTL, 'تحقق من صلاحيات المدير وسياسات الوصول.', 'Check admin permissions and access rules.'))}</p>
              <Button size="sm" variant="outline" onClick={() => brandsQuery.refetch()}>{pickBi(isRTL, 'إعادة المحاولة', 'Try again')}</Button>
            </div>
          ) : brands.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <TagIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="font-semibold">{pickBi(isRTL, 'لا توجد علامات بهذه التصفية', 'No brands match these filters')}</p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">{pickBi(isRTL, 'البيانات موجودة في السجل؛ وسّع الفلاتر أو أعد ضبطها لعرض العلامات المعتمدة.', 'The registry has data; widen or reset filters to show approved brands.')}</p>
              <Button size="sm" variant="outline" onClick={resetFilters}>{pickBi(isRTL, 'عرض كل العلامات', 'Show all brands')}</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {brands.map((b) => <BrandRow key={b.id} brand={b} locale={locale} isRTL={isRTL}
                summary={summaryMap.get(b.id)}
                sectorLabel={sectorMap.get(b.sector_id ?? '') ? pick({ ar: sectorMap.get(b.sector_id ?? '')?.name_ar ?? b.sector_id ?? '', en: sectorMap.get(b.sector_id ?? '')?.name_en ?? sectorMap.get(b.sector_id ?? '')?.name_ar ?? b.sector_id ?? '' }, locale) : b.sector_id}
                categoryHints={b.sector_id ? (categoryHints[b.sector_id] ?? []) : []}
                onApprove={() => approve.mutate(b.id)}
                onArchive={() => archive.mutate(b.id)}
                onPreview={() => setPreviewId((curr) => curr === b.id ? null : b.id)}
                isPreviewing={previewId === b.id}
                rejecting={rejecting === b.id}
                onStartReject={() => { setRejecting(b.id); setReason(''); }}
                onCancelReject={() => { setRejecting(null); setReason(''); }}
                onConfirmReject={() => reject.mutate({ id: b.id, reason })}
                reason={reason} setReason={setReason}
              />)}
            </div>
          )}
        </CardContent>
      </Card>
      {previewBrand && (
        <div className="lg:block">
          <BrandDetailsDrawer
            open
            onClose={() => setPreviewId(null)}
            {...buildBrandDetailsDrawerProps({
              brand: previewBrand,
              summary: summaryMap.get(previewBrand.id),
              locale,
              sectorLabel: sectorMap.get(previewBrand.sector_id ?? '')
                ? pick({
                    ar: sectorMap.get(previewBrand.sector_id ?? '')?.name_ar ?? previewBrand.sector_id ?? '',
                    en: sectorMap.get(previewBrand.sector_id ?? '')?.name_en
                      ?? sectorMap.get(previewBrand.sector_id ?? '')?.name_ar
                      ?? previewBrand.sector_id ?? '',
                  }, locale)
                : previewBrand.sector_id,
              labels: {
                statusLabel: pick(brandStatusLabel[previewBrand.status], locale),
                officialLabel: pick(verificationLabel.official, locale),
                closeLabel: pickBi(isRTL, 'إغلاق', 'Close'),
                detailLabel: pickBi(isRTL, 'فتح صفحة التفاصيل', 'Open details page'),
                localLabel: pickBi(isRTL, 'محلي', 'Local'),
                sectorFieldLabel: pickBi(isRTL, 'القطاع', 'Sector'),
                originFieldLabel: pickBi(isRTL, 'بلد المنشأ', 'Country of origin'),
                ownerFieldLabel: pickBi(isRTL, 'الشركة المالكة', 'Owner company'),
                foundedFieldLabel: pickBi(isRTL, 'سنة التأسيس', 'Founded'),
                providersFieldLabel: pickBi(isRTL, 'إسناد مزودين/خدمات', 'Provider/service links'),
                sectorsFieldLabel: pickBi(isRTL, 'قطاعات مرتبطة', 'Linked sectors'),
                createdFieldLabel: pickBi(isRTL, 'أُنشئ في', 'Created at'),
                updatedFieldLabel: pickBi(isRTL, 'آخر تحديث', 'Updated at'),
                websiteFieldLabel: pickBi(isRTL, 'الموقع الإلكتروني', 'Website'),
              },
            })}
          />
        </div>
      )}
      </div>
    </>
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <ContentAdminPageShell
          header={header}
          statsSlot={<ContentStatsStrip items={statItems} columns={4} />}
          filtersSlot={filters}
          contentSlot={content}
        />
      </div>
    </DashboardLayout>
  );
};

function BrandRow({ brand, locale, isRTL, summary, sectorLabel, categoryHints, onApprove, onArchive, onPreview, isPreviewing, rejecting, onStartReject, onCancelReject, onConfirmReject, reason, setReason }: {
  brand: Brand; locale: 'ar' | 'en'; isRTL: boolean;
  summary?: AdminBrandLinkSummary;
  sectorLabel?: string | null;
  categoryHints: CategoryLite[];
  onApprove: () => void; onArchive: () => void;
  onPreview: () => void; isPreviewing: boolean;
  rejecting: boolean; onStartReject: () => void; onCancelReject: () => void; onConfirmReject: () => void;
  reason: string; setReason: (v: string) => void;
}) {
  const name = locale === 'ar' ? brand.name_ar : (brand.name_en ?? brand.name_ar);
  const providerCount = (summary?.business_count ?? 0) + (summary?.service_count ?? 0);
  const verificationStatus: 'verified' | 'unverified' =
    (brand.is_verified || brand.verification_status === 'verified' || brand.verification_status === 'official')
      ? 'verified' : 'unverified';
  return (
    <div className={`border rounded-xl p-4 hover-lift transition-all bg-card ${isPreviewing ? 'ring-2 ring-primary/40' : ''}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={name} className="w-14 h-14 rounded-lg object-contain border bg-background p-1" loading="lazy" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/admin/brands/${brand.slug || brand.id}`} className="font-semibold truncate hover:underline">{name}</Link>
              {brand.ref_id && <code className="tech-content text-xs bg-muted px-2 py-0.5 rounded">{brand.ref_id}</code>}
              <DirectoryStatusBadge
                label={pick(brandStatusLabel[brand.status], locale)}
                tone={STATUS_BADGE_TONE[brand.status]}
              />
              <VerificationStatusBadge status={verificationStatus} />
              {brand.verification_status === 'official' && (
                <DirectoryStatusBadge
                  label={pick(verificationLabel.official, locale)}
                  tone="info"
                />
              )}
              {brand.is_local && <Badge variant="outline" className="text-xs">{pickBi(isRTL, 'محلي', 'Local')}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
              {brand.slug && <span>/{brand.slug}</span>}
              {brand.country_of_origin_code && <span>{pickBi(isRTL, 'بلد المنشأ:', 'Origin:')} {brand.country_of_origin_code}</span>}
              {sectorLabel && <span>{pickBi(isRTL, 'القطاع:', 'Sector:')} {sectorLabel}</span>}
              {brand.website && (
                <span className="inline-flex items-center gap-1 tech-content">
                  <Globe2 className="h-3 w-3" />
                  {brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={(summary?.sector_ids.length ?? 0) > 0 ? 'secondary' : 'outline'} className="text-xs gap-1">
                <Filter className="h-3 w-3" />{pickBi(isRTL, 'قطاعات مرتبطة', 'Linked sectors')}: {summary?.sector_ids.length ?? 0}
              </Badge>
              <Badge variant={providerCount > 0 ? 'secondary' : 'outline'} className="text-xs gap-1">
                <Building2 className="h-3 w-3" />{pickBi(isRTL, 'إسناد مزودين/خدمات', 'Provider/service links')}: {providerCount}
              </Badge>
            </div>
            {categoryHints.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categoryHints.map((category) => (
                  <Badge key={category.id} variant="outline" className="text-[10px]">
                    {locale === 'ar' ? category.name_ar : (category.name_en ?? category.name_ar)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={isPreviewing ? 'secondary' : 'ghost'}
            onClick={onPreview}
            aria-pressed={isPreviewing}
            aria-label={pickBi(isRTL, 'معاينة', 'Preview')}
          >
            <Eye className="w-4 h-4 me-1" />{pickBi(isRTL, 'معاينة', 'Preview')}
          </Button>
          <Button asChild size="sm" variant="outline"><Link to={`/admin/brands/${brand.slug || brand.id}`}><Link2 className="w-4 h-4 me-1" />{pickBi(isRTL, 'تحسين وربط', 'Improve & link')}</Link></Button>
          {(brand.status === 'pending' || brand.status === 'in_review' || brand.status === 'draft') && (
            <>
              <Button size="sm" onClick={onApprove}><Check className="w-4 h-4 me-1" />{pickBi(isRTL, 'اعتماد', 'Approve')}</Button>
              <Button size="sm" variant="outline" onClick={onStartReject}><X className="w-4 h-4 me-1" />{pickBi(isRTL, 'رفض', 'Reject')}</Button>
            </>
          )}
          {brand.status === 'approved' && (
            <Button size="sm" variant="ghost" onClick={onArchive}><Archive className="w-4 h-4 me-1" />{pickBi(isRTL, 'أرشفة', 'Archive')}</Button>
          )}
        </div>
      </div>
      {rejecting && (
        <div className="mt-3 p-3 rounded-lg bg-muted/40 space-y-2">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={pickBi(isRTL, 'سبب الرفض…', 'Rejection reason…')} className="h-10" />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={onConfirmReject}>{pickBi(isRTL, 'تأكيد الرفض', 'Confirm reject')}</Button>
            <Button size="sm" variant="ghost" onClick={onCancelReject}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBrands;
