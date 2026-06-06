import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive, Building2, Check, ExternalLink, Filter, Globe2, Inbox, Link2,
  RefreshCw, Search, ShieldCheck, SlidersHorizontal, Tag as TagIcon, X,
} from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listActiveCategories } from '@/modules/categories';

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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const AdminBrands: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const locale = isRTL ? 'ar' : 'en';
  usePageMeta({ title: isRTL ? 'سجل العلامات التجارية — إدارة' : 'Brands Registry — Admin', noindex: true });
  const qc = useQueryClient();

  const [status, setStatus] = useState<BrandStatus | 'all'>('all');
  const [sectorId, setSectorId] = useState<string>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [verification, setVerification] = useState<VerificationFilter>('all');
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [q, setQ] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const brandsQuery = useQuery({
    queryKey: ['admin-brands', q],
    queryFn: () => adminListBrands({ status: 'all', q: q.trim() || undefined }),
    staleTime: 20_000,
  });
  const allBrands = brandsQuery.data ?? [];

  const sectorsQuery = useQuery({
    queryKey: ['admin-brand-sectors-lite'],
    queryFn: listSectorsLite,
    staleTime: 5 * 60_000,
  });
  const sectors = sectorsQuery.data ?? [];

  const categoriesQuery = useQuery({
    queryKey: ['admin-brand-category-reference'],
    queryFn: async () => {
      const { data, error } = await listActiveCategories<CategoryLite>({
        select: 'id, name_ar, name_en, slug, parent_id',
        order: 'sort_order',
      });
      if (error) throw error instanceof Error ? error : new Error(String(error));
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
  const categories = categoriesQuery.data ?? [];

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

  const approve = useMutation({
    mutationFn: (id: string) => adminApproveBrand(id),
    onSuccess: () => { toast.success(isRTL ? 'تم اعتماد العلامة' : 'Brand approved'); qc.invalidateQueries({ queryKey: ['admin-brands'] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const reject = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => adminRejectBrand(vars.id, vars.reason),
    onSuccess: () => { toast.success(isRTL ? 'تم الرفض' : 'Rejected'); setRejecting(null); setReason(''); qc.invalidateQueries({ queryKey: ['admin-brands'] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const archive = useMutation({
    mutationFn: (id: string) => adminArchiveBrand(id),
    onSuccess: () => { toast.success(isRTL ? 'تمت الأرشفة' : 'Archived'); qc.invalidateQueries({ queryKey: ['admin-brands'] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <AdminPageHeader
          icon={TagIcon}
          tone="primary"
          eyebrow={isRTL ? 'الإدارة' : 'Admin'}
          title={isRTL ? 'سجل العلامات التجارية' : 'Brands Registry'}
          subtitle={isRTL ? 'إدارة العلامات وربطها بالقطاعات والخدمات والمزودين من مكان واحد' : 'Manage brands, sector mapping, services, and provider assignments in one place'}
          breadcrumbs={[
            { label: isRTL ? 'الإدارة' : 'Admin', href: '/admin' },
            { label: isRTL ? 'العلامات التجارية' : 'Brands' },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/categories"><Filter className="w-4 h-4 me-2" />{isRTL ? 'التصنيفات' : 'Categories'}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/brand-requests"><Inbox className="w-4 h-4 me-2" />{isRTL ? 'طلبات العلامات' : 'Brand requests'}</Link>
              </Button>
            </div>
          }
        />

        <section className="grid gap-3 md:grid-cols-4" aria-label={isRTL ? 'ملخص العلامات' : 'Brands summary'}>
          <StatCard icon={TagIcon} label={isRTL ? 'إجمالي العلامات' : 'Total brands'} value={stats.total} />
          <StatCard icon={Check} label={isRTL ? 'معتمدة' : 'Approved'} value={stats.approved} />
          <StatCard icon={ShieldCheck} label={isRTL ? 'موثقة' : 'Verified'} value={stats.verified} />
          <StatCard icon={Link2} label={isRTL ? 'مرتبطة بمزودين' : 'Provider-linked'} value={stats.withProviders} muted={stats.withProviders === 0} />
        </section>

        {stats.total > 0 && stats.withProviders === 0 && !brandsQuery.isLoading && (
          <Card className="border-dashed">
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="font-semibold">{isRTL ? 'العلامات موجودة لكن لم تُسند بعد إلى خدمات المزودين' : 'Brands exist but are not assigned to provider services yet'}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? 'تم العثور على العلامات في السجل وربطها بالقطاعات، لكن جدول ربط العلامات بخدمات الشركات لا يحتوي على روابط حالياً.'
                    : 'The registry and sector links are populated, but the provider-service brand assignment table has no links yet.'}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-10 rounded-xl">
                <Link to="/admin/businesses"><Building2 className="w-4 h-4 me-2" />{isRTL ? 'إسناد عبر الشركات' : 'Assign via businesses'}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />{isRTL ? 'فلاتر العلامات والتصنيفات' : 'Brand and taxonomy filters'}</CardTitle>
            <CardDescription>{isRTL ? 'اعرض العلامات حسب الحالة، القطاع، بلد المنشأ، التوثيق، وحالة الإسناد للمزودين.' : 'Filter by status, sector, origin, verification, and provider assignment state.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)} className="h-9">
                  {s === 'all' ? (isRTL ? 'الكل' : 'All') : pick(brandStatusLabel[s as BrandStatus], locale)}
                  {counts[s as string] != null && <span className="ms-2 text-xs opacity-70">{counts[s as string]}</span>}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input dir="auto" value={q} onChange={(e) => setQ(e.target.value)} placeholder={isRTL ? 'ابحث بالاسم أو الرابط أو الرقم المرجعي…' : 'Search by name, slug, website, or ref id…'} className="ps-9 h-11" />
              </div>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isRTL ? 'القطاع' : 'Sector'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'كل القطاعات' : 'All sectors'}</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>{locale === 'ar' ? sector.name_ar : (sector.name_en ?? sector.name_ar)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isRTL ? 'بلد المنشأ' : 'Origin'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'كل البلدان' : 'All origins'}</SelectItem>
                  {countries.map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={verification} onValueChange={(value) => setVerification(value as VerificationFilter)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isRTL ? 'التوثيق' : 'Verification'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل حالات التوثيق' : 'All verification'}</SelectItem>
                  <SelectItem value="official">{isRTL ? 'رسمية' : 'Official'}</SelectItem>
                  <SelectItem value="verified">{isRTL ? 'موثقة' : 'Verified'}</SelectItem>
                  <SelectItem value="unverified">{isRTL ? 'غير موثقة' : 'Unverified'}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={providerFilter} onValueChange={(value) => setProviderFilter(value as ProviderFilter)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isRTL ? 'الربط' : 'Linking'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل حالات الربط' : 'All links'}</SelectItem>
                  <SelectItem value="with_providers">{isRTL ? 'مرتبطة بمزودين' : 'With providers'}</SelectItem>
                  <SelectItem value="without_providers">{isRTL ? 'بدون مزودين' : 'Without providers'}</SelectItem>
                  <SelectItem value="with_sectors">{isRTL ? 'مرتبطة بقطاعات' : 'With sectors'}</SelectItem>
                  <SelectItem value="without_sectors">{isRTL ? 'بدون قطاعات' : 'Without sectors'}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-11 rounded-xl" onClick={resetFilters}>{isRTL ? 'إعادة ضبط' : 'Reset'}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-3 flex-wrap">
              <span>{isRTL ? 'العلامات' : 'Brands'} <span className="text-muted-foreground text-sm">({brands.length})</span></span>
              <Button size="sm" variant="ghost" onClick={() => { qc.invalidateQueries({ queryKey: ['admin-brands'] }); qc.invalidateQueries({ queryKey: ['admin-brand-link-summaries'] }); }}>
                <RefreshCw className="w-4 h-4 me-2" />{isRTL ? 'تحديث' : 'Refresh'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {brandsQuery.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : brandsQuery.isError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center space-y-3">
                <p className="font-semibold text-destructive">{isRTL ? 'تعذر تحميل العلامات' : 'Could not load brands'}</p>
                <p className="text-sm text-muted-foreground">{errorMessage(brandsQuery.error, isRTL ? 'تحقق من صلاحيات المدير وسياسات الوصول.' : 'Check admin permissions and access rules.')}</p>
                <Button size="sm" variant="outline" onClick={() => brandsQuery.refetch()}>{isRTL ? 'إعادة المحاولة' : 'Try again'}</Button>
              </div>
            ) : brands.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <TagIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="font-semibold">{isRTL ? 'لا توجد علامات بهذه التصفية' : 'No brands match these filters'}</p>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">{isRTL ? 'البيانات موجودة في السجل؛ وسّع الفلاتر أو أعد ضبطها لعرض العلامات المعتمدة.' : 'The registry has data; widen or reset filters to show approved brands.'}</p>
                <Button size="sm" variant="outline" onClick={resetFilters}>{isRTL ? 'عرض كل العلامات' : 'Show all brands'}</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {brands.map((b) => <BrandRow key={b.id} brand={b} locale={locale} isRTL={isRTL}
                  summary={summaryMap.get(b.id)}
                  sectorLabel={sectorMap.get(b.sector_id ?? '') ? pick({ ar: sectorMap.get(b.sector_id ?? '')?.name_ar ?? b.sector_id ?? '', en: sectorMap.get(b.sector_id ?? '')?.name_en ?? sectorMap.get(b.sector_id ?? '')?.name_ar ?? b.sector_id ?? '' }, locale) : b.sector_id}
                  categoryHints={b.sector_id ? (categoryHints[b.sector_id] ?? []) : []}
                  onApprove={() => approve.mutate(b.id)}
                  onArchive={() => archive.mutate(b.id)}
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
      </div>
    </DashboardLayout>
  );
};

function StatCard({ icon: Icon, label, value, muted = false }: {
  icon: React.ElementType;
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={muted ? 'text-2xl font-bold text-muted-foreground' : 'text-2xl font-bold'}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandRow({ brand, locale, isRTL, summary, sectorLabel, categoryHints, onApprove, onArchive, rejecting, onStartReject, onCancelReject, onConfirmReject, reason, setReason }: {
  brand: Brand; locale: 'ar' | 'en'; isRTL: boolean;
  summary?: AdminBrandLinkSummary;
  sectorLabel?: string | null;
  categoryHints: CategoryLite[];
  onApprove: () => void; onArchive: () => void;
  rejecting: boolean; onStartReject: () => void; onCancelReject: () => void; onConfirmReject: () => void;
  reason: string; setReason: (v: string) => void;
}) {
  const name = locale === 'ar' ? brand.name_ar : (brand.name_en ?? brand.name_ar);
  const providerCount = (summary?.business_count ?? 0) + (summary?.service_count ?? 0);
  return (
    <div className="border rounded-xl p-4 hover-lift transition-all bg-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={name} className="w-14 h-14 rounded-lg object-contain border bg-background p-1" loading="lazy" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/admin/brands/${brand.id}`} className="font-semibold truncate hover:underline">{name}</Link>
              {brand.ref_id && <code className="tech-content text-xs bg-muted px-2 py-0.5 rounded">{brand.ref_id}</code>}
              <Badge variant="outline" className="text-xs">{pick(brandStatusLabel[brand.status], locale)}</Badge>
              {brand.verification_status !== 'unverified' && (
                <Badge variant="secondary" className="text-xs">{pick(verificationLabel[brand.verification_status], locale)}</Badge>
              )}
              {brand.is_local && <Badge variant="outline" className="text-xs">{isRTL ? 'محلي' : 'Local'}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
              {brand.slug && <span>/{brand.slug}</span>}
              {brand.country_of_origin_code && <span>{isRTL ? 'بلد المنشأ:' : 'Origin:'} {brand.country_of_origin_code}</span>}
              {sectorLabel && <span>{isRTL ? 'القطاع:' : 'Sector:'} {sectorLabel}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={(summary?.sector_ids.length ?? 0) > 0 ? 'secondary' : 'outline'} className="text-xs gap-1">
                <Filter className="h-3 w-3" />{isRTL ? 'قطاعات مرتبطة' : 'Linked sectors'}: {summary?.sector_ids.length ?? 0}
              </Badge>
              <Badge variant={providerCount > 0 ? 'secondary' : 'outline'} className="text-xs gap-1">
                <Building2 className="h-3 w-3" />{isRTL ? 'إسناد مزودين/خدمات' : 'Provider/service links'}: {providerCount}
              </Badge>
              {brand.website && (
                <Badge variant="outline" className="text-xs gap-1"><Globe2 className="h-3 w-3" />{isRTL ? 'موقع رسمي' : 'Official website'}</Badge>
              )}
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
          {brand.website && <Button asChild size="sm" variant="ghost"><a href={brand.website} target="_blank" rel="noopener noreferrer" aria-label={isRTL ? 'فتح موقع العلامة' : 'Open brand website'}><ExternalLink className="w-4 h-4" /></a></Button>}
          <Button asChild size="sm" variant="outline"><Link to={`/admin/brands/${brand.id}`}><Link2 className="w-4 h-4 me-1" />{isRTL ? 'تحسين وربط' : 'Improve & link'}</Link></Button>
          {(brand.status === 'pending' || brand.status === 'in_review' || brand.status === 'draft') && (
            <>
              <Button size="sm" onClick={onApprove}><Check className="w-4 h-4 me-1" />{isRTL ? 'اعتماد' : 'Approve'}</Button>
              <Button size="sm" variant="outline" onClick={onStartReject}><X className="w-4 h-4 me-1" />{isRTL ? 'رفض' : 'Reject'}</Button>
            </>
          )}
          {brand.status === 'approved' && (
            <Button size="sm" variant="ghost" onClick={onArchive}><Archive className="w-4 h-4 me-1" />{isRTL ? 'أرشفة' : 'Archive'}</Button>
          )}
        </div>
      </div>
      {rejecting && (
        <div className="mt-3 p-3 rounded-lg bg-muted/40 space-y-2">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={isRTL ? 'سبب الرفض…' : 'Rejection reason…'} className="h-10" />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={onConfirmReject}>{isRTL ? 'تأكيد الرفض' : 'Confirm reject'}</Button>
            <Button size="sm" variant="ghost" onClick={onCancelReject}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBrands;
