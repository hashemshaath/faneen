/**
 * PROVIDER-BRANDS-DASHBOARD-1 — Provider Brands Dashboard.
 *
 * Lets a verified provider:
 *  - Browse approved brands (search + sector + country filters)
 *  - Link an approved brand to one of their business services
 *  - See their existing provider-brand links and their statuses
 *  - Track their pending/rejected brand addition requests
 *  - Request a brand if one is missing
 *
 * All Supabase access is routed through `@/modules/brands` and
 * `@/modules/catalog` wrappers. No direct supabase client imports here.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, Send, ShieldCheck, Clock, XCircle, ExternalLink, Link2, Unlink,
  PackagePlus, Tag, Globe2, AlertCircle,
} from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';

import {
  listApprovedBrandsForProviderPicker,
  listMyProviderBrandLinks,
  linkBrandToMyServiceOrBusiness,
  unlinkMyProviderBrand,
  listMyBrandRequests,
  createMyBrandRequest,
  getBrandFilterOptions,
  listSectorsLite,
  requestTypeLabel, requestStatusLabel, authStatusLabel, pick,
} from '@/modules/brands';
import { listServicesByBusiness } from '@/modules/catalog';
import { getOwnerBusiness, listBusinessesByIds } from '@/modules/businesses';

type Loc = 'ar' | 'en';

type ServiceLite = {
  id: string;
  business_id: string;
  name_ar: string | null;
  name_en: string | null;
};

const statusBadgeClass = (status: string | null | undefined): string => {
  switch (status) {
    case 'verified':
    case 'approved':
      return 'bg-success/10 text-success border-success/30';
    case 'rejected':
    case 'expired':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'needs_more_info':
      return 'bg-warning/10 text-warning border-warning/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const DashboardBrands: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const locale: Loc = isRTL ? 'ar' : 'en';
  usePageMeta({
    title: isRTL ? 'العلامات التجارية — قِطاعات' : 'My Brands — Qitaat',
    description: isRTL
      ? 'إدارة علاقات منشأتك مع العلامات التجارية المعتمدة.'
      : 'Manage your business relationships with approved brands.',
    noindex: true,
  });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { active_entity_id, entities } = useActiveWorkspace();
  const activeOwnerEntityId = useMemo(() => {
    if (!active_entity_id) return null;
    const e = entities.find((x) => x.entity_id === active_entity_id);
    return e && e.source === 'owner' ? e.entity_id : null;
  }, [active_entity_id, entities]);

  // Resolve the active business id (owner-scoped) — same pattern as DashboardServices.
  const { data: business, isLoading: loadingBiz } = useQuery({
    queryKey: ['provider-brands-business', user?.id, activeOwnerEntityId],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      if (activeOwnerEntityId) {
        const { data } = await listBusinessesByIds<{ id: string }>({
          ids: [activeOwnerEntityId],
          select: 'id',
        });
        return (data ?? [])[0] ?? null;
      }
      const { data } = await getOwnerBusiness<{ id: string }>({
        userId: user.id,
        select: 'id',
      });
      return data;
    },
    staleTime: 30_000,
  });
  const businessId = business?.id ?? null;

  // ─────────── Filters ───────────
  const [q, setQ] = useState('');
  const [sectorId, setSectorId] = useState<string>('all');
  const [countryCode, setCountryCode] = useState<string>('all');

  const { data: filterOpts } = useQuery({
    queryKey: ['provider-brands-filter-opts'],
    queryFn: getBrandFilterOptions,
    staleTime: 5 * 60_000,
  });
  const { data: sectors = [] } = useQuery({
    queryKey: ['provider-brands-sectors-lite'],
    queryFn: listSectorsLite,
    staleTime: 5 * 60_000,
  });

  // ─────────── Approved brand catalog ───────────
  const { data: catalog = [], isLoading: loadingCatalog, isError: catalogError } = useQuery({
    queryKey: ['provider-brands-catalog', q, sectorId, countryCode],
    queryFn: () => listApprovedBrandsForProviderPicker({
      q: q.trim() || undefined,
      sectorId: sectorId === 'all' ? undefined : sectorId,
      countryCode: countryCode === 'all' ? undefined : countryCode,
      limit: 60,
    }),
    staleTime: 30_000,
  });

  // ─────────── My linked brands ───────────
  const { data: myLinks = [], isLoading: loadingLinks } = useQuery({
    queryKey: ['provider-brand-links', businessId],
    enabled: !!businessId,
    queryFn: () => listMyProviderBrandLinks(businessId as string),
    staleTime: 20_000,
  });

  // ─────────── My pending requests ───────────
  const { data: myRequests = [], isLoading: loadingReq } = useQuery({
    queryKey: ['provider-brand-requests', user?.id],
    enabled: !!user,
    queryFn: () => listMyBrandRequests(user!.id),
    staleTime: 20_000,
  });

  // ─────────── My services (for inline link form) ───────────
  const { data: services = [] } = useQuery({
    queryKey: ['provider-brands-my-services', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await listServicesByBusiness<ServiceLite>({
        businessId: businessId as string,
        select: 'id, business_id, name_ar, name_en',
        activeOnly: true,
      });
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // ─────────── Link mutation (inline panel state) ───────────
  const [linkPanel, setLinkPanel] = useState<{ brandId: string; serviceId: string } | null>(null);

  const linkMut = useMutation({
    mutationFn: async (args: { brandId: string; serviceId: string }) => {
      if (!businessId) throw new Error(isRTL ? 'لا توجد منشأة نشطة' : 'No active business');
      await linkBrandToMyServiceOrBusiness({
        businessServiceId: args.serviceId,
        businessId,
        brandId: args.brandId,
      });
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم ربط العلامة' : 'Brand linked');
      setLinkPanel(null);
      qc.invalidateQueries({ queryKey: ['provider-brand-links', businessId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const unlinkMut = useMutation({
    mutationFn: (linkId: string) => unlinkMyProviderBrand(linkId),
    onSuccess: () => {
      toast.success(isRTL ? 'تم إلغاء الربط' : 'Brand unlinked');
      qc.invalidateQueries({ queryKey: ['provider-brand-links', businessId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  // ─────────── Request form ───────────
  const [requestOpen, setRequestOpen] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [notes, setNotes] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(isRTL ? 'يجب تسجيل الدخول' : 'Not signed in');
      return createMyBrandRequest({
        request_type: 'create_brand',
        business_id: businessId,
        user_id: user.id,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || null,
        notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال الطلب للمراجعة' : 'Request submitted for review');
      setNameAr(''); setNameEn(''); setNotes(''); setRequestOpen(false);
      qc.invalidateQueries({ queryKey: ['provider-brand-requests', user?.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const sectorLabelMap = useMemo(() => {
    const m = new Map<string, { ar: string; en: string }>();
    for (const s of sectors as Array<{ id: string; name_ar: string; name_en: string }>) {
      m.set(s.id, { ar: s.name_ar, en: s.name_en });
    }
    return m;
  }, [sectors]);

  const linkedBrandIds = useMemo(
    () => new Set(myLinks.map((l) => l.brand_id)),
    [myLinks],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6" data-testid="dashboard-brands-root">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {isRTL ? 'العلامات التجارية' : 'Brands'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              {isRTL
                ? 'سجل العلامات المعتمدة في قِطاعات. اربط منشأتك بالعلامات التي تتعامل معها أو اطلب إضافة علامة جديدة لمراجعتها.'
                : 'Approved brand registry on Qitaat. Link your business to the brands you work with, or request a new brand for review.'}
            </p>
          </div>
          <Button
            variant="default"
            onClick={() => setRequestOpen((v) => !v)}
            data-testid="request-new-brand-cta"
          >
            <PackagePlus className="w-4 h-4 me-2" />
            {isRTL ? 'طلب علامة جديدة' : 'Request new brand'}
          </Button>
        </div>

        {/* Inline request form */}
        {requestOpen && (
          <Card data-testid="brand-request-form">
            <CardHeader>
              <CardTitle className="text-base">
                {isRTL ? 'طلب إضافة علامة جديدة' : 'Request a new brand'}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? 'تخضع جميع الطلبات لمراجعة الإدارة قبل ظهور العلامة في السجل العام.'
                  : 'All requests are reviewed by admins before the brand becomes publicly visible.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{isRTL ? 'الاسم بالعربية *' : 'Arabic name *'}</Label>
                  <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="h-11" dir="auto" />
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'الاسم بالإنجليزية' : 'English name'}</Label>
                  <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="h-11" dir="auto" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{isRTL ? 'ملاحظات' : 'Notes'}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} dir="auto" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRequestOpen(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={() => submit.mutate()} disabled={!nameAr.trim() || submit.isPending}>
                  <Send className="w-4 h-4 me-2" />
                  {isRTL ? 'إرسال الطلب' : 'Submit request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My linked brands */}
        <Card data-testid="my-linked-brands-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isRTL ? 'العلامات المرتبطة بمنشأتي' : 'My linked brands'}
            </CardTitle>
            <CardDescription>
              {isRTL
                ? 'حالات الربط: قيد المراجعة، موثّق، مرفوض. الإدارة وحدها تستطيع الموافقة على الربط.'
                : 'Link statuses: pending, verified, or rejected. Only admins can approve a link.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBiz || loadingLinks ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !businessId ? (
              <DashboardEmptyState
                icon={<AlertCircle className="w-8 h-8" />}
                title={isRTL ? 'لا توجد منشأة نشطة' : 'No active business'}
                description={isRTL
                  ? 'أنشئ ملف منشأتك أولاً لتتمكن من ربط العلامات التجارية.'
                  : 'Create your business profile first to link brands.'}
                primaryAction={
                  <Button asChild>
                    <Link to="/dashboard/business-edit">
                      {isRTL ? 'تعديل الملف التجاري' : 'Edit business profile'}
                    </Link>
                  </Button>
                }
              />
            ) : myLinks.length === 0 ? (
              <DashboardEmptyState
                icon={<Tag className="w-8 h-8" />}
                title={isRTL ? 'لم تربط أي علامة بعد' : 'No linked brands yet'}
                description={isRTL
                  ? 'اختر علامة من السجل أدناه واضغط "ربط" لإضافتها لإحدى خدماتك.'
                  : 'Pick a brand from the catalog below and click "Link" to add it to one of your services.'}
              />
            ) : (
              <div className="space-y-2">
                {myLinks.map((link) => {
                  const b = link.brand;
                  const status = link.authorization_status ?? 'unverified';
                  const statusLbl = pick(
                    authStatusLabel[status as keyof typeof authStatusLabel] ?? authStatusLabel.unverified,
                    locale,
                  );
                  const display = b
                    ? (locale === 'ar' ? b.name_ar : (b.name_en ?? b.name_ar))
                    : (isRTL ? 'علامة محذوفة' : 'Removed brand');
                  return (
                    <div
                      key={link.id}
                      className="flex items-start gap-3 p-3 border rounded-xl hover-lift"
                      data-testid="linked-brand-row"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{display}</span>
                          {b?.ref_id && (
                            <code className="tech-content text-xs bg-muted px-2 py-0.5 rounded">{b.ref_id}</code>
                          )}
                          <Badge variant="outline" className={`text-xs ${statusBadgeClass(status)}`}>
                            {statusLbl}
                          </Badge>
                          {link.relationship_type && (
                            <Badge variant="secondary" className="text-xs">{link.relationship_type}</Badge>
                          )}
                        </div>
                        {link.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">{link.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {b?.slug && (
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/brands/${b.slug}`} target="_blank" rel="noopener">
                              <ExternalLink className="w-4 h-4 me-1" />
                              {isRTL ? 'الصفحة العامة' : 'Public page'}
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unlinkMut.mutate(link.id)}
                          disabled={unlinkMut.isPending}
                          data-testid="unlink-brand-btn"
                        >
                          <Unlink className="w-4 h-4 me-1" />
                          {isRTL ? 'إلغاء الربط' : 'Unlink'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved brand browser */}
        <Card data-testid="approved-brands-browser">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isRTL ? 'سجل العلامات المعتمدة' : 'Approved brand catalog'}
            </CardTitle>
            <div className="grid md:grid-cols-3 gap-2 mt-3">
              <div className="relative md:col-span-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={isRTL ? 'بحث بالاسم…' : 'Search by name…'}
                  className="ps-9 h-10"
                />
              </div>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger className="h-10"><SelectValue placeholder={isRTL ? 'القطاع' : 'Sector'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع القطاعات' : 'All sectors'}</SelectItem>
                  {(filterOpts?.sectors ?? []).map((sid) => {
                    const lbl = sectorLabelMap.get(sid);
                    return (
                      <SelectItem key={sid} value={sid}>
                        {lbl ? (locale === 'ar' ? lbl.ar : lbl.en) : sid}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="h-10"><SelectValue placeholder={isRTL ? 'بلد المنشأ' : 'Country'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع البلدان' : 'All countries'}</SelectItem>
                  {(filterOpts?.countries ?? []).map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {locale === 'ar' ? (c.name_ar ?? c.code) : (c.name_en ?? c.code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCatalog ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : catalogError ? (
              <p className="text-sm text-destructive text-center py-6">
                {isRTL ? 'تعذّر تحميل العلامات. حاول مرة أخرى.' : 'Failed to load brands. Please try again.'}
              </p>
            ) : catalog.length === 0 ? (
              <DashboardEmptyState
                icon={<Search className="w-8 h-8" />}
                title={isRTL ? 'لا توجد علامات مطابقة' : 'No matching brands'}
                description={isRTL
                  ? 'جرّب تعديل البحث أو اطلب إضافة علامة جديدة.'
                  : 'Try adjusting your search, or request a new brand.'}
                primaryAction={
                  <Button variant="outline" onClick={() => setRequestOpen(true)}>
                    <PackagePlus className="w-4 h-4 me-2" />
                    {isRTL ? 'طلب علامة جديدة' : 'Request new brand'}
                  </Button>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catalog.map((b) => {
                  const display = locale === 'ar' ? b.name_ar : (b.name_en ?? b.name_ar);
                  const alreadyLinked = linkedBrandIds.has(b.id);
                  const panelOpen = linkPanel?.brandId === b.id;
                  return (
                    <div
                      key={b.id}
                      className="border rounded-xl p-3 hover-lift flex flex-col gap-2"
                      data-testid="approved-brand-card"
                    >
                      <div className="flex items-center gap-3">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={display} className="w-10 h-10 rounded object-cover border" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Tag className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            {display}
                            {b.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            {b.country_of_origin_code && <><Globe2 className="w-3 h-3" />{b.country_of_origin_code}</>}
                            {b.ref_id && <code className="tech-content ms-1">{b.ref_id}</code>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        {b.slug ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/brands/${b.slug}`} target="_blank" rel="noopener">
                              <ExternalLink className="w-3.5 h-3.5 me-1" />
                              {isRTL ? 'العرض العام' : 'View'}
                            </Link>
                          </Button>
                        ) : <span />}
                        <Button
                          variant={alreadyLinked ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => {
                            if (!businessId) {
                              toast.error(isRTL ? 'لا توجد منشأة نشطة' : 'No active business');
                              return;
                            }
                            setLinkPanel(panelOpen ? null : { brandId: b.id, serviceId: services[0]?.id ?? '' });
                          }}
                          data-testid="link-brand-btn"
                        >
                          <Link2 className="w-3.5 h-3.5 me-1" />
                          {alreadyLinked
                            ? (isRTL ? 'ربط إضافي' : 'Link again')
                            : (isRTL ? 'ربط' : 'Link')}
                        </Button>
                      </div>
                      {panelOpen && (
                        <div className="border-t pt-2 mt-1 space-y-2" data-testid="inline-link-form">
                          <Label className="text-xs">{isRTL ? 'اختر خدمة' : 'Pick a service'}</Label>
                          {services.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {isRTL
                                ? 'لا توجد خدمات نشطة. أضف خدمة من '
                                : 'No active services. Add one from '}
                              <Link to="/dashboard/services" className="text-primary underline">
                                /dashboard/services
                              </Link>
                            </p>
                          ) : (
                            <>
                              <Select
                                value={linkPanel?.serviceId ?? ''}
                                onValueChange={(v) => setLinkPanel({ brandId: b.id, serviceId: v })}
                              >
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {services.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {locale === 'ar' ? (s.name_ar ?? s.id) : (s.name_en ?? s.name_ar ?? s.id)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setLinkPanel(null)}>
                                  {isRTL ? 'إلغاء' : 'Cancel'}
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={!linkPanel?.serviceId || linkMut.isPending}
                                  onClick={() => linkPanel && linkMut.mutate(linkPanel)}
                                  data-testid="confirm-link-btn"
                                >
                                  {isRTL ? 'تأكيد الربط' : 'Confirm link'}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My pending requests */}
        <Card data-testid="my-brand-requests-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isRTL ? 'طلباتي للعلامات' : 'My brand requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReq ? (
              <Skeleton className="h-16 w-full" />
            ) : myRequests.length === 0 ? (
              <DashboardEmptyState
                icon={<Clock className="w-8 h-8" />}
                title={isRTL ? 'لا توجد طلبات بعد' : 'No requests yet'}
                description={isRTL
                  ? 'يمكنك طلب إضافة علامة جديدة في أي وقت لتُراجعها الإدارة.'
                  : 'You can request a new brand at any time for admin review.'}
              />
            ) : (
              <div className="space-y-2">
                {myRequests.map((r) => {
                  const Icon = r.status === 'approved' ? ShieldCheck
                    : r.status === 'rejected' ? XCircle
                    : Clock;
                  const color = r.status === 'approved' ? 'text-success'
                    : r.status === 'rejected' ? 'text-destructive'
                    : 'text-warning';
                  return (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 p-3 border rounded-xl"
                      data-testid="brand-request-row"
                    >
                      <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.name_ar}</span>
                          {r.ref_id && (
                            <code className="tech-content text-xs bg-muted px-2 py-0.5 rounded">{r.ref_id}</code>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {pick(requestTypeLabel[r.request_type], locale)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {pick(requestStatusLabel[(r.status ?? 'pending') as keyof typeof requestStatusLabel], locale)}
                          </Badge>
                        </div>
                        {r.reject_reason && (
                          <p className="text-xs text-destructive mt-1">{r.reject_reason}</p>
                        )}
                        {r.admin_notes && r.status === 'needs_more_info' && (
                          <p className="text-xs text-warning mt-1">{r.admin_notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardBrands;
