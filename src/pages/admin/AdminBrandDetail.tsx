import { pickBi } from '@/components/common/Bilingual';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Loader2, Check, X, Archive, Globe, Shield,
} from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import {
  adminGetBrand, adminApproveBrand, adminRejectBrand, adminArchiveBrand,
  adminMergeBrands, adminUpdateBrand,
  listBrandManufacturingCountries, listBrandSectors,
  listProviderBrandLinksForBrand, listBrandRequestsForBrand,
  listBrandAuditLog, listSectorsLite, lookupBusinessesByIds,
  adminApproveProviderBrandLink, adminRejectProviderBrandLink,
  brandStatusLabel, verificationLabel, pick,
  adminListBrandProducts, adminCreateBrandProduct, adminUpdateBrandProduct,
  adminDeleteBrandProduct,
  listBrandProductRequests, adminApproveBrandProductRequest, adminRejectBrandProductRequest,
  adminSearchBusinessesForBrand, adminListBusinessServices, adminCreateProviderBrandLink,
  adminLinkBrandToAllServices,
  listProviderBrandLinkProducts, adminSetProviderBrandLinkProducts,
  adminRemoveProviderBrandLinkProduct,
  type BrandProduct,
} from '@/modules/brands';
import {
  BrandDetailOverviewPanel,
  BrandClaimsPanel,
  BrandEquivalencePanel,
  BrandProvidersPanel,
  BrandAuditPanel,
} from '@/components/admin/procurement/brand-detail';

const AdminBrandDetail: React.FC = () => {
  useNoIndex();
  // Accept either a UUID or a slug in the URL so admin URLs can be readable
  // (/admin/brands/somfy) while still honoring legacy /admin/brands/<uuid>.
  const { id: idParam = '' } = useParams<{ id: string }>();
  const isUuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam);
  const { isRTL } = useLanguage();
  const locale: 'ar' | 'en' = pickBi(isRTL, 'ar', 'en');
  const qc = useQueryClient();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [rejectingLinkId, setRejectingLinkId] = useState<string | null>(null);
  const [linkReason, setLinkReason] = useState('');
  const [seoForm, setSeoForm] = useState({
    seo_title_ar: '', seo_title_en: '', seo_description_ar: '', seo_description_en: '',
    brand_keywords: '', og_image_url: '',
  });
  const [identityForm, setIdentityForm] = useState({
    name_ar: '', name_en: '', description_ar: '', description_en: '',
    website: '', brand_owner_company: '', founded_year: '',
    country_of_origin_code: '', country_of_origin_name_ar: '', country_of_origin_name_en: '',
    logo_url: '', is_local: false,
  });
  const [identityDirty, setIdentityDirty] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name_ar: '', name_en: '', model_number: '', sku: '',
    description_ar: '', image_url: '',
    image_asset_id: '' as string, image_variants: {} as Record<string, string>,
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState({
    name_ar: '', name_en: '', model_number: '', sku: '', description_ar: '', image_url: '',
    image_asset_id: '' as string, image_variants: {} as Record<string, string>,
  });
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [reqRejectReason, setReqRejectReason] = useState('');

  // ---- Admin: directly link a provider business+service to this brand ----
  const [linkSearch, setLinkSearch] = useState('');
  const [linkBusinessId, setLinkBusinessId] = useState<string>('');
  const [linkBusinessLabel, setLinkBusinessLabel] = useState<string>('');
  const [linkServiceId, setLinkServiceId] = useState<string>('__all__');
  const [linkRelationship, setLinkRelationship] = useState<string>('authorized_distributor');
  // Scope toggle: link covers the whole brand, or only specific products.
  const [linkScope, setLinkScope] = useState<'all' | 'products'>('all');
  const [linkProductIds, setLinkProductIds] = useState<string[]>([]);
  // Per-link expansion + add-product UI state.
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  const [addProductForLinkId, setAddProductForLinkId] = useState<string>('');

  const brandQ = useQuery({
    queryKey: ['admin-brand-detail', idParam],
    queryFn: () => adminGetBrand(idParam),
    enabled: !!idParam,
  });
  const brand = brandQ.data;
  // Effective UUID used by every sub-query / mutation. Empty until the brand
  // resolves when the URL param is a slug — sub-queries are gated by `!!id`.
  const id = brand?.id ?? (isUuidParam ? idParam : '');

  useEffect(() => {
    if (!brand) return;
    setSeoForm({
      seo_title_ar: brand.seo_title_ar ?? '',
      seo_title_en: brand.seo_title_en ?? '',
      seo_description_ar: brand.seo_description_ar ?? '',
      seo_description_en: brand.seo_description_en ?? '',
      brand_keywords: (brand.brand_keywords ?? []).join(', '),
      og_image_url: brand.og_image_url ?? '',
    });
    setIdentityForm({
      name_ar: brand.name_ar ?? '',
      name_en: brand.name_en ?? '',
      description_ar: brand.description_ar ?? '',
      description_en: brand.description_en ?? '',
      website: brand.website ?? '',
      brand_owner_company: brand.brand_owner_company ?? '',
      founded_year: brand.founded_year ? String(brand.founded_year) : '',
      country_of_origin_code: brand.country_of_origin_code ?? '',
      country_of_origin_name_ar: brand.country_of_origin_name_ar ?? '',
      country_of_origin_name_en: brand.country_of_origin_name_en ?? '',
      logo_url: brand.logo_url ?? '',
      is_local: !!brand.is_local,
    });
    setIdentityDirty(false);
  }, [brand]);

  // Build a rich, brand-specific document title + description. Admin pages are
  // noindex so this won't be crawled, but the proper <title> still drives the
  // browser tab label, bookmarks, history, and screen readers.
  const brandTitleName = brand
    ? (isRTL
        ? (brand.name_ar || brand.name_en || brand.slug || '')
        : (brand.name_en || brand.name_ar || brand.slug || ''))
    : '';
  usePageMeta({
    title: brand
      ? pickBi(isRTL,
          `${brandTitleName} — إدارة العلامة · قِطاعات`,
          `${brandTitleName} — Brand admin · Qitaat`)
      : pickBi(isRTL, 'تفاصيل العلامة · قِطاعات', 'Brand detail · Qitaat'),
    description: brand
      ? pickBi(isRTL,
          `إدارة بيانات العلامة "${brandTitleName}" — الاعتماد، المزوّدون، القطاعات، المنتجات، والتدقيق.`,
          `Manage the "${brandTitleName}" brand — approval, providers, sectors, products, and audit log.`)
      : undefined,
    noindex: true,
  });

  const sectorsQ = useQuery({
    queryKey: ['admin-brand-sectors', id],
    queryFn: () => listBrandSectors(id),
    enabled: !!id,
  });
  const mfgQ = useQuery({
    queryKey: ['admin-brand-mfg', id],
    queryFn: () => listBrandManufacturingCountries(id),
    enabled: !!id,
  });
  const linksQ = useQuery({
    queryKey: ['admin-brand-provider-links', id],
    queryFn: () => listProviderBrandLinksForBrand(id),
    enabled: !!id,
  });
  const reqsQ = useQuery({
    queryKey: ['admin-brand-related-requests', id],
    queryFn: () => listBrandRequestsForBrand(id),
    enabled: !!id,
  });
  const auditQ = useQuery({
    queryKey: ['admin-brand-audit', id],
    queryFn: () => listBrandAuditLog({ brandId: id }),
    enabled: !!id,
  });
  const allSectorsQ = useQuery({
    queryKey: ['admin-brand-all-sectors'],
    queryFn: listSectorsLite,
    staleTime: 5 * 60_000,
  });

  const productsQ = useQuery({
    queryKey: ['admin-brand-products', id],
    queryFn: () => adminListBrandProducts(id, { status: 'all' }),
    enabled: !!id,
  });
  const productRequestsQ = useQuery({
    queryKey: ['admin-brand-product-requests', id],
    queryFn: () => listBrandProductRequests({ brandId: id, status: 'all' }),
    enabled: !!id,
  });

  const businessIds = (linksQ.data ?? []).map((l) => l.business_id);
  const bizQ = useQuery({
    queryKey: ['admin-brand-provider-businesses', businessIds.join(',')],
    queryFn: () => lookupBusinessesByIds(businessIds),
    enabled: businessIds.length > 0,
    staleTime: 60_000,
  });
  const bizMap = new Map((bizQ.data ?? []).map((b) => [b.id, b]));
  const sectorMap = new Map((allSectorsQ.data ?? []).map((s) => [s.id, s]));

  // Search businesses for the admin "link provider" form.
  const linkSearchQ = useQuery({
    queryKey: ['admin-brand-link-business-search', linkSearch],
    queryFn: () => adminSearchBusinessesForBrand(linkSearch, 8),
    enabled: linkSearch.trim().length >= 2,
    staleTime: 30_000,
  });
  const linkServicesQ = useQuery({
    queryKey: ['admin-brand-link-business-services', linkBusinessId],
    queryFn: () => adminListBusinessServices(linkBusinessId),
    enabled: !!linkBusinessId,
  });
  const createLink = useMutation({
    // `linkServiceId === '__all__'` (or empty when the provider has no
    // services yet) means "link to every service" — falls back to the bulk
    // helper which auto-creates a placeholder service when the business has
    // none, so the brand can still be attached.
    mutationFn: async () => {
      const productIds = linkScope === 'products' ? linkProductIds : undefined;
      if (linkServiceId && linkServiceId !== '__all__') {
        await adminCreateProviderBrandLink({
          brandId: id,
          businessId: linkBusinessId,
          businessServiceId: linkServiceId,
          relationshipType: linkRelationship as never,
          authorizationStatus: 'verified',
          productIds,
        });
        return { mode: 'single' as const, inserted: 1 };
      }
      const res = await adminLinkBrandToAllServices({
        brandId: id,
        businessId: linkBusinessId,
        relationshipType: linkRelationship as never,
        authorizationStatus: 'verified',
        productIds,
      });
      return { mode: 'all' as const, ...res };
    },
    onSuccess: (res) => {
      const msg = res.mode === 'all'
        ? pickBi(isRTL,
            `تم الربط بـ ${res.servicesTotal} خدمة (مضافة: ${res.inserted})`,
            `Linked to ${res.servicesTotal} service(s) — ${res.inserted} new`)
        : pickBi(isRTL, 'تم ربط المزود', 'Provider linked');
      toast.success(msg);
      setLinkSearch(''); setLinkBusinessId(''); setLinkBusinessLabel(''); setLinkServiceId('__all__');
      setLinkScope('all'); setLinkProductIds([]);
      qc.invalidateQueries({ queryKey: ['admin-brand-provider-links', id] });
      qc.invalidateQueries({ queryKey: ['admin-brand-link-products'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const addLinkProduct = useMutation({
    mutationFn: async (args: { linkId: string; productId: string; businessId: string }) => {
      await adminSetProviderBrandLinkProducts({
        providerBrandLinkId: args.linkId,
        brandId: id,
        businessId: args.businessId,
        productIds: [args.productId],
        mode: 'add',
      });
    },
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تمت إضافة المنتج', 'Product added'));
      setAddProductForLinkId('');
      qc.invalidateQueries({ queryKey: ['admin-brand-link-products'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const removeLinkProduct = useMutation({
    mutationFn: async (rowId: string) => {
      await adminRemoveProviderBrandLinkProduct(rowId);
    },
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تمت الإزالة', 'Removed'));
      qc.invalidateQueries({ queryKey: ['admin-brand-link-products'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-brand-detail', id] });
    qc.invalidateQueries({ queryKey: ['admin-brands'] });
    qc.invalidateQueries({ queryKey: ['admin-brand-audit', id] });
    qc.invalidateQueries({ queryKey: ['admin-brand-provider-links', id] });
    qc.invalidateQueries({ queryKey: ['brand-ops-counts'] });
  };
  const invalidateProducts = () => {
    qc.invalidateQueries({ queryKey: ['admin-brand-products', id] });
    qc.invalidateQueries({ queryKey: ['admin-brand-product-requests', id] });
  };

  const approve = useMutation({
    mutationFn: () => adminApproveBrand(id),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم الاعتماد', 'Approved')); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const reject = useMutation({
    mutationFn: () => adminRejectBrand(id, reason),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم الرفض', 'Rejected')); setRejecting(false); setReason(''); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const archive = useMutation({
    mutationFn: () => adminArchiveBrand(id),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تمت الأرشفة', 'Archived')); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const merge = useMutation({
    mutationFn: (targetId: string) => adminMergeBrands(id, targetId),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم الدمج', 'Merged')); setMergeTarget(''); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const toggleVerified = useMutation({
    mutationFn: () => adminUpdateBrand(id, {
      is_verified: !brand?.is_verified,
      verification_status: brand?.is_verified ? 'unverified' : 'verified',
    }),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم التحديث', 'Updated')); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const saveSeo = useMutation({
    mutationFn: () => adminUpdateBrand(id, {
      seo_title_ar: seoForm.seo_title_ar || null,
      seo_title_en: seoForm.seo_title_en || null,
      seo_description_ar: seoForm.seo_description_ar || null,
      seo_description_en: seoForm.seo_description_en || null,
      brand_keywords: seoForm.brand_keywords.split(',').map(k => k.trim()).filter(Boolean),
      og_image_url: seoForm.og_image_url || null,
    }),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم حفظ SEO', 'SEO saved')); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const saveIdentity = useMutation({
    mutationFn: () => adminUpdateBrand(id, {
      name_ar: identityForm.name_ar.trim() || brand?.name_ar || '',
      name_en: identityForm.name_en.trim() || null,
      description_ar: identityForm.description_ar.trim() || null,
      description_en: identityForm.description_en.trim() || null,
      website: identityForm.website.trim() || null,
      brand_owner_company: identityForm.brand_owner_company.trim() || null,
      founded_year: identityForm.founded_year.trim() ? Number(identityForm.founded_year) : null,
      country_of_origin_code: identityForm.country_of_origin_code.trim().toUpperCase() || null,
      country_of_origin_name_ar: identityForm.country_of_origin_name_ar.trim() || null,
      country_of_origin_name_en: identityForm.country_of_origin_name_en.trim() || null,
      logo_url: identityForm.logo_url || null,
      is_local: identityForm.is_local,
    }),
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تم حفظ التعديلات', 'Changes saved'));
      setIdentityDirty(false); invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const createProduct = useMutation({
    mutationFn: () => adminCreateBrandProduct({
      brand_id: id,
      name_ar: newProduct.name_ar.trim(),
      name_en: newProduct.name_en.trim() || null,
      model_number: newProduct.model_number.trim() || null,
      sku: newProduct.sku.trim() || null,
      description_ar: newProduct.description_ar.trim() || null,
      image_url: newProduct.image_url || null,
      image_asset_id: newProduct.image_asset_id || null,
      image_variants: newProduct.image_variants ?? {},
      status: 'approved',
    }),
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تمت إضافة المنتج', 'Product added'));
      setNewProduct({
        name_ar: '', name_en: '', model_number: '', sku: '',
        description_ar: '', image_url: '',
        image_asset_id: '', image_variants: {},
      });
      invalidateProducts();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const updateProduct = useMutation({
    mutationFn: (vars: { productId: string }) => adminUpdateBrandProduct(vars.productId, {
      name_ar: editProduct.name_ar.trim(),
      name_en: editProduct.name_en.trim() || null,
      model_number: editProduct.model_number.trim() || null,
      sku: editProduct.sku.trim() || null,
      description_ar: editProduct.description_ar.trim() || null,
      image_url: editProduct.image_url || null,
      image_asset_id: editProduct.image_asset_id || null,
      image_variants: editProduct.image_variants ?? {},
    }),
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تم التحديث', 'Updated'));
      setEditingProductId(null); invalidateProducts();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const deleteProduct = useMutation({
    mutationFn: (productId: string) => adminDeleteBrandProduct(productId),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم الحذف', 'Deleted')); invalidateProducts(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const approveProductReq = useMutation({
    mutationFn: (reqId: string) => adminApproveBrandProductRequest(reqId),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم اعتماد المنتج', 'Product approved')); invalidateProducts(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const rejectProductReq = useMutation({
    mutationFn: (vars: { reqId: string; reason: string }) =>
      adminRejectBrandProductRequest(vars.reqId, vars.reason),
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تم الرفض', 'Rejected'));
      setRejectingReqId(null); setReqRejectReason(''); invalidateProducts();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const approveLink = useMutation({
    mutationFn: (linkId: string) => adminApproveProviderBrandLink(linkId),
    onSuccess: () => { toast.success(pickBi(isRTL, 'تم اعتماد الربط', 'Link approved')); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const rejectLink = useMutation({
    mutationFn: (vars: { linkId: string; reason: string }) =>
      adminRejectProviderBrandLink(vars.linkId, vars.reason),
    onSuccess: () => {
      toast.success(pickBi(isRTL, 'تم رفض الربط', 'Link rejected'));
      setRejectingLinkId(null); setLinkReason(''); invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  if (brandQ.isLoading) {
    return <DashboardLayout><div className="p-6 space-y-3"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-64 w-full" /></div></DashboardLayout>;
  }
  if (!brand) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center space-y-3">
          <p className="text-muted-foreground">{pickBi(isRTL, 'العلامة غير موجودة', 'Brand not found')}</p>
          <Button asChild variant="outline"><Link to="/admin/brands"><BackArrow className="w-4 h-4 me-1" />{pickBi(isRTL, 'العودة', 'Back')}</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  const name = locale === 'ar' ? brand.name_ar : (brand.name_en ?? brand.name_ar);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/admin/brands"><BackArrow className="w-4 h-4 me-1" />{pickBi(isRTL, 'سجل العلامات', 'Brands Registry')}</Link></Button>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={name} className="w-16 h-16 rounded-xl object-cover border" loading="lazy" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">—</div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold truncate" dir="auto">{name}</h1>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                  {brand.ref_id && <code className="tech-content bg-muted px-2 py-0.5 rounded">{brand.ref_id}</code>}
                  {brand.slug && <span>/{brand.slug}</span>}
                  <Badge variant="outline" className="text-xs">{pick(brandStatusLabel[brand.status], locale)}</Badge>
                  <Badge variant="secondary" className="text-xs">{pick(verificationLabel[brand.verification_status], locale)}</Badge>
                  {brand.is_local && <Badge variant="outline" className="text-xs">{pickBi(isRTL, 'محلي', 'Local')}</Badge>}
                  {brand.website && (
                    <span className="inline-flex items-center gap-1 tech-content">
                      <Globe className="w-3 h-3" />
                      {brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(brand.status === 'pending' || brand.status === 'in_review' || brand.status === 'draft') && (
                <>
                  <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
                    {approve.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Check className="w-4 h-4 me-1" />}
                    {pickBi(isRTL, 'اعتماد', 'Approve')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting(true)}><X className="w-4 h-4 me-1" />{pickBi(isRTL, 'رفض', 'Reject')}</Button>
                </>
              )}
              {brand.status === 'approved' && (
                <Button size="sm" variant="ghost" onClick={() => archive.mutate()} disabled={archive.isPending}>
                  <Archive className="w-4 h-4 me-1" />{pickBi(isRTL, 'أرشفة', 'Archive')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => toggleVerified.mutate()} disabled={toggleVerified.isPending}>
                <Shield className="w-4 h-4 me-1" />{brand.is_verified ? (pickBi(isRTL, 'إلغاء التوثيق', 'Unverify')) : (pickBi(isRTL, 'توثيق', 'Verify'))}
              </Button>
            </div>
          </div>
          {rejecting && (
            <div className="mt-3 p-3 rounded-lg bg-muted/40 space-y-2">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={pickBi(isRTL, 'سبب الرفض…', 'Rejection reason…')} className="h-10" />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => reject.mutate()} disabled={reject.isPending || !reason.trim()}>
                  {pickBi(isRTL, 'تأكيد الرفض', 'Confirm reject')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason(''); }}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
              </div>
            </div>
          )}
        </div>

        <BrandDetailOverviewPanel
          isRTL={isRTL}
          locale={locale}
          brand={brand}
          identityForm={identityForm}
          setIdentityForm={setIdentityForm}
          identityDirty={identityDirty}
          setIdentityDirty={setIdentityDirty}
          onSaveIdentity={() => saveIdentity.mutate()}
          saveIdentityPending={saveIdentity.isPending}
          seoForm={seoForm}
          setSeoForm={setSeoForm}
          onSaveSeo={() => saveSeo.mutate()}
          saveSeoPending={saveSeo.isPending}
          mfgData={mfgQ.data}
          mfgLoading={mfgQ.isLoading}
          sectorsData={sectorsQ.data}
          sectorsLoading={sectorsQ.isLoading}
          sectorMap={sectorMap}
          mergeTarget={mergeTarget}
          setMergeTarget={setMergeTarget}
          onMerge={(target) => merge.mutate(target)}
          mergePending={merge.isPending}
        />

        <BrandProvidersPanel
          isRTL={isRTL}
          locale={locale}
          links={linksQ.data}
          linksLoading={linksQ.isLoading}
          bizMap={bizMap}
          linkSearch={linkSearch}
          setLinkSearch={setLinkSearch}
          linkBusinessId={linkBusinessId}
          setLinkBusinessId={setLinkBusinessId}
          linkBusinessLabel={linkBusinessLabel}
          setLinkBusinessLabel={setLinkBusinessLabel}
          linkServiceId={linkServiceId}
          setLinkServiceId={setLinkServiceId}
          linkRelationship={linkRelationship}
          setLinkRelationship={setLinkRelationship}
          linkScope={linkScope}
          setLinkScope={setLinkScope}
          linkProductIds={linkProductIds}
          setLinkProductIds={setLinkProductIds}
          products={productsQ.data}
          linkSearchData={linkSearchQ.data}
          linkServicesData={linkServicesQ.data}
          linkServicesLoading={linkServicesQ.isLoading}
          onCreateLink={() => createLink.mutate()}
          createLinkPending={createLink.isPending}
          expandedLinkId={expandedLinkId}
          setExpandedLinkId={setExpandedLinkId}
          renderLinkProductsEditor={(l) => (
            <LinkProductsEditor
              linkId={l.id}
              businessId={l.business_id}
              brandProducts={productsQ.data ?? []}
              isRTL={isRTL}
              locale={locale}
              addProductForLinkId={addProductForLinkId}
              setAddProductForLinkId={setAddProductForLinkId}
              onAdd={(productId) => addLinkProduct.mutate({ linkId: l.id, productId, businessId: l.business_id })}
              onRemove={(rowId) => removeLinkProduct.mutate(rowId)}
              addPending={addLinkProduct.isPending}
            />
          )}
          rejectingLinkId={rejectingLinkId}
          setRejectingLinkId={setRejectingLinkId}
          linkReason={linkReason}
          setLinkReason={setLinkReason}
          onApproveLink={(linkId) => approveLink.mutate(linkId)}
          approveLinkPending={approveLink.isPending}
          onRejectLink={(linkId, reasonText) => rejectLink.mutate({ linkId, reason: reasonText })}
          rejectLinkPending={rejectLink.isPending}
        />

        <BrandEquivalencePanel
          isRTL={isRTL}
          locale={locale}
          products={productsQ.data}
          productsLoading={productsQ.isLoading}
          newProduct={newProduct}
          setNewProduct={setNewProduct}
          onCreateProduct={() => createProduct.mutate()}
          createPending={createProduct.isPending}
          editingProductId={editingProductId}
          setEditingProductId={setEditingProductId}
          editProduct={editProduct}
          setEditProduct={setEditProduct}
          onUpdateProduct={(productId) => updateProduct.mutate({ productId })}
          updatePending={updateProduct.isPending}
          onDeleteProduct={(productId) => deleteProduct.mutate(productId)}
          deletePending={deleteProduct.isPending}
          productRequests={productRequestsQ.data}
          productRequestsLoading={productRequestsQ.isLoading}
          rejectingReqId={rejectingReqId}
          setRejectingReqId={setRejectingReqId}
          reqRejectReason={reqRejectReason}
          setReqRejectReason={setReqRejectReason}
          onApproveProductReq={(reqId) => approveProductReq.mutate(reqId)}
          approveProductReqPending={approveProductReq.isPending}
          onRejectProductReq={(reqId, reasonText) => rejectProductReq.mutate({ reqId, reason: reasonText })}
          rejectProductReqPending={rejectProductReq.isPending}
        />

        <BrandClaimsPanel
          isRTL={isRTL}
          locale={locale}
          requests={reqsQ.data}
          loading={reqsQ.isLoading}
        />

        <BrandAuditPanel
          isRTL={isRTL}
          events={auditQ.data}
          loading={auditQ.isLoading}
        />
      </div>
    </DashboardLayout>
  );
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5 break-words" dir="auto">{value}</div>
    </div>
  );
}

function FieldLabeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default AdminBrandDetail;

function LinkProductsEditor({
  linkId, businessId, brandProducts, isRTL, locale,
  addProductForLinkId, setAddProductForLinkId,
  onAdd, onRemove, addPending,
}: {
  linkId: string;
  businessId: string;
  brandProducts: BrandProduct[];
  isRTL: boolean;
  locale: 'ar' | 'en';
  addProductForLinkId: string;
  setAddProductForLinkId: (v: string) => void;
  onAdd: (productId: string) => void;
  onRemove: (rowId: string) => void;
  addPending: boolean;
}) {
  const q = useQuery({
    queryKey: ['admin-brand-link-products', linkId],
    queryFn: () => listProviderBrandLinkProducts(linkId),
    enabled: !!linkId,
  });
  const rows = q.data ?? [];
  const linkedIds = new Set(rows.map((r) => r.brand_product_id));
  const available = brandProducts.filter((p) => !linkedIds.has(p.id));

  return (
    <div className="mt-2 p-2 rounded border bg-muted/30 space-y-2">
      <div className="text-[11px] text-muted-foreground">
        {rows.length === 0
          ? pickBi(isRTL, 'النطاق الحالي: العلامة كاملة (لا توجد منتجات محددة).', 'Current scope: whole brand (no specific products).')
          : pickBi(isRTL, `النطاق الحالي: ${rows.length} منتج محدد.`, `Current scope: ${rows.length} specific product(s).`)}
      </div>
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((r) => {
            const name = r.product
              ? (locale === 'ar' ? (r.product.name_ar ?? r.product.name_en ?? '') : (r.product.name_en ?? r.product.name_ar ?? ''))
              : r.brand_product_id.slice(0, 8);
            return (
              <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-[11px]">
                {r.product?.image_url && <img src={r.product.image_url} alt="" className="w-4 h-4 rounded object-cover" />}
                <span className="truncate max-w-[160px]" dir="auto">{name}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(r.id)}
                  aria-label={pickBi(isRTL, 'إزالة', 'Remove')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {available.length > 0 ? (
        <div className="flex items-center gap-2">
          <select
            value={addProductForLinkId === linkId ? '' : ''}
            onChange={(e) => {
              const pid = e.target.value;
              if (!pid) return;
              setAddProductForLinkId(linkId);
              onAdd(pid);
            }}
            disabled={addPending}
            className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">{pickBi(isRTL, 'إضافة منتج…', 'Add product…')}</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {locale === 'ar' ? (p.name_ar ?? p.name_en ?? p.id.slice(0, 8)) : (p.name_en ?? p.name_ar ?? p.id.slice(0, 8))}
                {p.model_number ? ` — ${p.model_number}` : ''}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground tech-content">{businessId.slice(0, 6)}</span>
        </div>
      ) : brandProducts.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{pickBi(isRTL, 'لا توجد منتجات لهذه العلامة بعد.', 'No brand products yet.')}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">{pickBi(isRTL, 'كل المنتجات مضافة.', 'All products already added.')}</p>
      )}
    </div>
  );
}