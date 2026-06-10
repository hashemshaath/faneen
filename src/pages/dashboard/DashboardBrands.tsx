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
  PackagePlus, Tag, Globe2, AlertCircle, Package, Layers, CheckSquare, ChevronDown, ChevronUp, Sparkles,
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
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { BrandRequestForm, type BrandRequestFormPayload } from '@/components/brands/BrandRequestForm';
import { LinkedBrandProductsInline } from '@/components/brands/LinkedBrandProductsInline';

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
import {
  listBrandProductRequests,
  submitBrandProductRequest,
  brandProductRequestStatusLabel,
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
  const locale: Loc = pickBi(isRTL, 'ar', 'en');
  usePageMeta({
    title: pickBi(isRTL, 'العلامات التجارية — قِطاعات', 'My Brands — Qitaat'),
    description: pickBi(isRTL, 'إدارة علاقات منشأتك مع العلامات التجارية المعتمدة.', 'Manage your business relationships with approved brands.'),
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
  const [linkPanel, setLinkPanel] = useState<{ brandId: string; serviceIds: string[] } | null>(null);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);

  const linkMut = useMutation({
    mutationFn: async (args: { brandId: string; serviceIds: string[] }) => {
      if (!businessId) throw new Error(pickBi(isRTL, 'لا توجد منشأة نشطة', 'No active business'));
      if (args.serviceIds.length === 0) {
        throw new Error(pickBi(isRTL, 'اختر تخصصاً واحداً على الأقل', 'Pick at least one specialization'));
      }
      const results = await Promise.allSettled(
        args.serviceIds.map((sid) =>
          linkBrandToMyServiceOrBusiness({
            businessServiceId: sid,
            businessId,
            brandId: args.brandId,
          }),
        ),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      return { ok, fail };
    },
    onSuccess: ({ ok, fail }) => {
      if (ok > 0) {
        toast.success(
          isRTL
            ? `تم ربط العلامة بـ ${ok} تخصص${fail ? ` (تعذّر ${fail})` : ''}`
            : `Linked to ${ok} specialization${ok > 1 ? 's' : ''}${fail ? ` (${fail} failed)` : ''}`,
        );
      } else {
        toast.error(pickBi(isRTL, 'تعذّر ربط أي تخصص', 'No specialization linked'));
      }
      setLinkPanel(null);
      qc.invalidateQueries({ queryKey: ['provider-brand-links', businessId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const unlinkMut = useMutation({
    mutationFn: (linkId: string) => unlinkMyProviderBrand(linkId),
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تم إلغاء الربط', 'Brand unlinked'));
      qc.invalidateQueries({ queryKey: ['provider-brand-links', businessId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  // ─────────── Request form ───────────
  const [requestOpen, setRequestOpen] = useState(false);
  const submit = useMutation({
    mutationFn: async (payload: BrandRequestFormPayload) => {
      if (!user) throw new Error(pickBi(isRTL, 'يجب تسجيل الدخول', 'Not signed in'));
      return createMyBrandRequest({
        request_type: 'create_brand',
        business_id: businessId,
        user_id: user.id,
        ...payload,
      });
    },
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تم إرسال الطلب للمراجعة', 'Request submitted for review'));
      setRequestOpen(false);
      qc.invalidateQueries({ queryKey: ['provider-brand-requests', user?.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  // ─────────── Product request form (per linked brand) ───────────
  const [prodOpen, setProdOpen] = useState(false);
  const [prodBrandId, setProdBrandId] = useState<string>('');
  const [prodNameAr, setProdNameAr] = useState('');
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodModel, setProdModel] = useState('');
  const [prodDesc, setProdDesc] = useState('');

  const { data: myProductRequests = [], isLoading: loadingProdReq } = useQuery({
    queryKey: ['provider-brand-product-requests', businessId],
    enabled: !!businessId,
    queryFn: () => listBrandProductRequests({ businessId: businessId as string }),
    staleTime: 20_000,
  });

  const submitProduct = useMutation({
    mutationFn: async () => {
      if (!prodBrandId) throw new Error(pickBi(isRTL, 'اختر العلامة', 'Pick a brand'));
      // Multi-product mode: each newline in the Arabic name field becomes a
      // separate product request, so providers can propose a batch in one shot.
      const lines = prodNameAr.split('\n').map((s) => s.trim()).filter(Boolean);
      if (lines.length === 0) throw new Error(pickBi(isRTL, 'اسم المنتج مطلوب', 'Product name required'));
      const enLines = prodNameEn.split('\n').map((s) => s.trim());
      const modelLines = prodModel.split('\n').map((s) => s.trim());
      const results = await Promise.allSettled(
        lines.map((nameAr, i) =>
          submitBrandProductRequest({
            brand_id: prodBrandId,
            business_id: businessId,
            name_ar: nameAr,
            name_en: enLines[i] || null,
            model_number: modelLines[i] || null,
            description_ar: lines.length === 1 ? (prodDesc.trim() || null) : null,
          }),
        ),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      return { ok, total: results.length };
    },
    onSuccess: ({ ok, total }) => {
      toast.success(
        pickBi(isRTL, `تم إرسال ${ok} من ${total} منتج للمراجعة`, `${ok} of ${total} product${total > 1 ? 's' : ''} submitted`),
      );
      setProdNameAr(''); setProdNameEn(''); setProdModel(''); setProdDesc('');
      setProdOpen(false);
      qc.invalidateQueries({ queryKey: ['provider-brand-product-requests', businessId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const linkedBrandOptions = useMemo(
    () => myLinks
      .filter((l) => l.brand)
      .map((l) => ({
        id: l.brand!.id,
        label: locale === 'ar' ? l.brand!.name_ar : (l.brand!.name_en ?? l.brand!.name_ar),
      })),
    [myLinks, locale],
  );

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
              {pickBi(isRTL, 'العلامات التجارية', 'Brands')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              {pickBi(isRTL, 'سجل العلامات المعتمدة في قِطاعات. اربط منشأتك بالعلامات التي تتعامل معها أو اطلب إضافة علامة جديدة لمراجعتها.', 'Approved brand registry on Qitaat. Link your business to the brands you work with, or request a new brand for review.')}
            </p>
          </div>
          <Button
            variant="default"
            onClick={() => setRequestOpen((v) => !v)}
            data-testid="request-new-brand-cta"
          >
            <PackagePlus className="w-4 h-4 me-2" />
            {pickBi(isRTL, 'طلب علامة جديدة', 'Request new brand')}
          </Button>
        </div>

        {/* Stats strip — quick at-a-glance counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="brands-stats-strip">
          {[
            { icon: Tag, label: pickBi(isRTL, 'علامات مرتبطة', 'Linked brands'), value: myLinks.length, tone: 'text-primary' },
            { icon: Layers, label: pickBi(isRTL, 'تخصصاتي', 'My specializations'), value: services.length, tone: 'text-info' },
            { icon: Clock, label: pickBi(isRTL, 'طلبات قيد المراجعة', 'Pending requests'), value: myRequests.filter((r) => r.status === 'pending').length + myProductRequests.filter((r) => r.status === 'pending').length, tone: 'text-warning' },
            { icon: Sparkles, label: pickBi(isRTL, 'منتجات معتمدة', 'Approved products'), value: myProductRequests.filter((r) => r.status === 'approved').length, tone: 'text-success' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-3 flex items-center gap-3 hover-lift">
              <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${s.tone}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold leading-none tech-content">{s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1 truncate">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Inline request form (full professional intake) */}
        {requestOpen && (
          <BrandRequestForm
            isRTL={isRTL}
            locale={locale}
            sectors={sectors}
            countries={filterOpts?.countries ?? []}
            isSubmitting={submit.isPending}
            onCancel={() => setRequestOpen(false)}
            onSubmit={(payload) => submit.mutate(payload)}
          />
        )}

        {/* My linked brands */}
        <Card data-testid="my-linked-brands-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {pickBi(isRTL, 'العلامات المرتبطة بمنشأتي', 'My linked brands')}
            </CardTitle>
            <CardDescription>
              {pickBi(isRTL, 'حالات الربط: قيد المراجعة، موثّق، مرفوض. الإدارة وحدها تستطيع الموافقة على الربط.', 'Link statuses: pending, verified, or rejected. Only admins can approve a link.')}
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
                title={pickBi(isRTL, 'لا توجد منشأة نشطة', 'No active business')}
                description={pickBi(isRTL, 'أنشئ ملف منشأتك أولاً لتتمكن من ربط العلامات التجارية.', 'Create your business profile first to link brands.')}
                primaryAction={
                  <Button asChild>
                    <Link to="/dashboard/business-edit">
                      {pickBi(isRTL, 'تعديل الملف التجاري', 'Edit business profile')}
                    </Link>
                  </Button>
                }
              />
            ) : myLinks.length === 0 ? (
              <DashboardEmptyState
                icon={<Tag className="w-8 h-8" />}
                title={pickBi(isRTL, 'لم تربط أي علامة بعد', 'No linked brands yet')}
                description={pickBi(isRTL, 'اختر علامة من السجل أدناه واضغط "ربط" لإضافتها لإحدى خدماتك.', 'Pick a brand from the catalog below and click "Link" to add it to one of your services.')}
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
                    : (pickBi(isRTL, 'علامة محذوفة', 'Removed brand'));
                  const linkedService = services.find((s) => s.id === link.business_service_id);
                  const linkedServiceLbl = linkedService
                    ? (locale === 'ar'
                        ? (linkedService.name_ar ?? linkedService.id)
                        : (linkedService.name_en ?? linkedService.name_ar ?? linkedService.id))
                    : null;
                  const expanded = expandedBrandId === (b?.id ?? link.id);
                  return (
                    <div
                      key={link.id}
                      className="p-3 border rounded-xl hover-lift"
                      data-testid="linked-brand-row"
                    >
                    <div className="flex items-start gap-3">
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
                          {linkedServiceLbl && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Layers className="w-3 h-3" />
                              {linkedServiceLbl}
                            </Badge>
                          )}
                        </div>
                        {link.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">{link.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {b?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedBrandId(expanded ? null : b.id)}
                            data-testid="toggle-brand-products"
                          >
                            {expanded
                              ? <ChevronUp className="w-4 h-4 me-1" />
                              : <ChevronDown className="w-4 h-4 me-1" />}
                            {pickBi(isRTL, 'المنتجات', 'Products')}
                          </Button>
                        )}
                        {b?.slug && (
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/brands/${b.slug}`} target="_blank" rel="noopener">
                              <ExternalLink className="w-4 h-4 me-1" />
                              {pickBi(isRTL, 'الصفحة العامة', 'Public page')}
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
                          {pickBi(isRTL, 'إلغاء الربط', 'Unlink')}
                        </Button>
                      </div>
                    </div>
                    {expanded && b?.id && (
                      <LinkedBrandProductsInline brandId={b.id} isRTL={isRTL} locale={locale} />
                    )}
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
              {pickBi(isRTL, 'سجل العلامات المعتمدة', 'Approved brand catalog')}
            </CardTitle>
            <div className="grid md:grid-cols-3 gap-2 mt-3">
              <div className="relative md:col-span-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={pickBi(isRTL, 'بحث بالاسم…', 'Search by name…')}
                  className="ps-9 h-10"
                />
              </div>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger className="h-10"><SelectValue placeholder={pickBi(isRTL, 'القطاع', 'Sector')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{pickBi(isRTL, 'جميع القطاعات', 'All sectors')}</SelectItem>
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
                <SelectTrigger className="h-10"><SelectValue placeholder={pickBi(isRTL, 'بلد المنشأ', 'Country')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{pickBi(isRTL, 'جميع البلدان', 'All countries')}</SelectItem>
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
                {pickBi(isRTL, 'تعذّر تحميل العلامات. حاول مرة أخرى.', 'Failed to load brands. Please try again.')}
              </p>
            ) : catalog.length === 0 ? (
              <DashboardEmptyState
                icon={<Search className="w-8 h-8" />}
                title={pickBi(isRTL, 'لا توجد علامات مطابقة', 'No matching brands')}
                description={pickBi(isRTL, 'جرّب تعديل البحث أو اطلب إضافة علامة جديدة.', 'Try adjusting your search, or request a new brand.')}
                primaryAction={
                  <Button variant="outline" onClick={() => setRequestOpen(true)}>
                    <PackagePlus className="w-4 h-4 me-2" />
                    {pickBi(isRTL, 'طلب علامة جديدة', 'Request new brand')}
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
                              {pickBi(isRTL, 'العرض العام', 'View')}
                            </Link>
                          </Button>
                        ) : <span />}
                        <Button
                          variant={alreadyLinked ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => {
                            if (!businessId) {
                              toast.error(pickBi(isRTL, 'لا توجد منشأة نشطة', 'No active business'));
                              return;
                            }
                            // Pre-select the services already linked to this
                            // brand so the multi-select reflects current state
                            // (and toggling adds only new ones).
                            const preselected = myLinks
                              .filter((l) => l.brand_id === b.id)
                              .map((l) => l.business_service_id);
                            setLinkPanel(panelOpen ? null : { brandId: b.id, serviceIds: preselected });
                          }}
                          data-testid="link-brand-btn"
                        >
                          <Link2 className="w-3.5 h-3.5 me-1" />
                          {alreadyLinked
                            ? (pickBi(isRTL, 'ربط إضافي', 'Link again'))
                            : (pickBi(isRTL, 'ربط', 'Link'))}
                        </Button>
                      </div>
                      {panelOpen && (
                        <div className="border-t pt-2 mt-1 space-y-2" data-testid="inline-link-form">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {pickBi(isRTL, 'اختر تخصصاتك المرتبطة بهذه العلامة', 'Pick specializations for this brand')}
                            </Label>
                            {services.length > 0 && (
                              <button
                                type="button"
                                className="text-[11px] text-primary hover:underline"
                                onClick={() => {
                                  const all = services.map((s) => s.id);
                                  const allSelected = linkPanel?.serviceIds.length === all.length;
                                  setLinkPanel({ brandId: b.id, serviceIds: allSelected ? [] : all });
                                }}
                              >
                                <CheckSquare className="inline w-3 h-3 me-1" />
                                {linkPanel?.serviceIds.length === services.length
                                  ? (pickBi(isRTL, 'إلغاء تحديد الكل', 'Clear all'))
                                  : (pickBi(isRTL, 'تحديد الكل', 'Select all'))}
                              </button>
                            )}
                          </div>
                          {services.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {pickBi(isRTL, 'لا توجد تخصصات نشطة. أضف خدمة من ', 'No active specializations. Add one from ')}
                              <Link to="/dashboard/services" className="text-primary underline">
                                /dashboard/services
                              </Link>
                            </p>
                          ) : (
                            <>
                              <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1 rounded-lg border bg-muted/30 p-2">
                                {services.map((s) => {
                                  const checked = linkPanel?.serviceIds.includes(s.id) ?? false;
                                  const lbl = locale === 'ar' ? (s.name_ar ?? s.id) : (s.name_en ?? s.name_ar ?? s.id);
                                  return (
                                    <label
                                      key={s.id}
                                      className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-background cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(v) => {
                                          const cur = linkPanel?.serviceIds ?? [];
                                          const next = v
                                            ? Array.from(new Set([...cur, s.id]))
                                            : cur.filter((id) => id !== s.id);
                                          setLinkPanel({ brandId: b.id, serviceIds: next });
                                        }}
                                      />
                                      <span className="truncate">{lbl}</span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-muted-foreground">
                                  {pickBi(isRTL, `محدّد: ${linkPanel?.serviceIds.length ?? 0} / ${services.length}`, `Selected: ${linkPanel?.serviceIds.length ?? 0} / ${services.length}`)}
                                </span>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => setLinkPanel(null)}>
                                    {pickBi(isRTL, 'إلغاء', 'Cancel')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={!linkPanel?.serviceIds.length || linkMut.isPending}
                                    onClick={() => linkPanel && linkMut.mutate(linkPanel)}
                                    data-testid="confirm-link-btn"
                                  >
                                    {pickBi(isRTL, 'تأكيد الربط', 'Confirm links')}
                                  </Button>
                                </div>
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
              {pickBi(isRTL, 'طلباتي للعلامات', 'My brand requests')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReq ? (
              <Skeleton className="h-16 w-full" />
            ) : myRequests.length === 0 ? (
              <DashboardEmptyState
                icon={<Clock className="w-8 h-8" />}
                title={pickBi(isRTL, 'لا توجد طلبات بعد', 'No requests yet')}
                description={pickBi(isRTL, 'يمكنك طلب إضافة علامة جديدة في أي وقت لتُراجعها الإدارة.', 'You can request a new brand at any time for admin review.')}
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

        {/* My brand product requests */}
        <Card data-testid="my-brand-product-requests-panel">
          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {pickBi(isRTL, 'طلبات منتجات العلامات', 'Brand product requests')}
              </CardTitle>
              <CardDescription>
                {pickBi(isRTL, 'اقترح منتجاً جديداً لإحدى علاماتك المرتبطة. تخضع جميع الاقتراحات لموافقة الإدارة قبل ظهورها في الكتالوج المركزي.', 'Suggest a new product for one of your linked brands. All proposals are reviewed by admins before they appear in the central catalog.')}
              </CardDescription>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (!businessId) {
                  toast.error(pickBi(isRTL, 'لا توجد منشأة نشطة', 'No active business'));
                  return;
                }
                if (linkedBrandOptions.length === 0) {
                  toast.error(pickBi(isRTL, 'اربط علامة أولاً', 'Link a brand first'));
                  return;
                }
                setProdBrandId(linkedBrandOptions[0]?.id ?? '');
                setProdOpen((v) => !v);
              }}
              data-testid="propose-product-cta"
            >
              <Package className="w-4 h-4 me-2" />
              {pickBi(isRTL, 'اقتراح منتج', 'Propose product')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {prodOpen && (
              <div className="border rounded-xl p-3 space-y-3" data-testid="product-request-form">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{pickBi(isRTL, 'العلامة *', 'Brand *')}</Label>
                    <Select value={prodBrandId} onValueChange={setProdBrandId}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {linkedBrandOptions.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{pickBi(isRTL, 'رقم/كود الموديل', 'Model number')}</Label>
                    <Textarea
                      value={prodModel}
                      onChange={(e) => setProdModel(e.target.value)}
                      rows={2}
                      className="tech-content"
                      placeholder={pickBi(isRTL, 'سطر لكل موديل (اختياري)', 'One model per line (optional)')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{pickBi(isRTL, 'أسماء المنتجات بالعربية *', 'Arabic product names *')}</Label>
                    <Textarea
                      value={prodNameAr}
                      onChange={(e) => setProdNameAr(e.target.value)}
                      rows={3}
                      dir="auto"
                      placeholder={pickBi(isRTL, 'منتج لكل سطر — يمكنك اقتراح عدة منتجات دفعة واحدة', 'One product per line — propose several at once')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{pickBi(isRTL, 'الأسماء بالإنجليزية', 'English names')}</Label>
                    <Textarea
                      value={prodNameEn}
                      onChange={(e) => setProdNameEn(e.target.value)}
                      rows={3}
                      dir="auto"
                      placeholder={pickBi(isRTL, 'سطر لكل منتج (اختياري)', 'One per line (optional)')}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{pickBi(isRTL, 'وصف مختصر', 'Short description')}</Label>
                  <Textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} rows={2} dir="auto" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setProdOpen(false)}>
                    {pickBi(isRTL, 'إلغاء', 'Cancel')}
                  </Button>
                  <Button
                    onClick={() => submitProduct.mutate()}
                    disabled={!prodBrandId || !prodNameAr.trim() || submitProduct.isPending}
                    data-testid="submit-product-request-btn"
                  >
                    <Send className="w-4 h-4 me-2" />
                    {pickBi(isRTL, 'إرسال للمراجعة', 'Submit for review')}
                  </Button>
                </div>
              </div>
            )}

            {loadingProdReq ? (
              <Skeleton className="h-16 w-full" />
            ) : myProductRequests.length === 0 ? (
              <DashboardEmptyState
                icon={<Package className="w-8 h-8" />}
                title={pickBi(isRTL, 'لا توجد طلبات منتجات', 'No product requests yet')}
                description={pickBi(isRTL, 'اقترح منتجاً جديداً لإثراء الكتالوج المركزي للعلامات.', 'Propose a new product to enrich the central brand catalog.')}
              />
            ) : (
              <div className="space-y-2">
                {myProductRequests.map((r) => {
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
                      data-testid="product-request-row"
                    >
                      <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.name_ar}</span>
                          {r.model_number && (
                            <code className="tech-content text-xs bg-muted px-2 py-0.5 rounded">{r.model_number}</code>
                          )}
                          {r.ref_id && (
                            <code className="tech-content text-xs bg-muted px-2 py-0.5 rounded">{r.ref_id}</code>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {pick(brandProductRequestStatusLabel[r.status], locale)}
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
