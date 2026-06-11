import { pickBi } from '@/components/common/Bilingual';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Loader2, Check, X, Archive, ExternalLink,
  Globe, Building2, Shield, History, AlertTriangle, Edit3,
  Save, Plus, Package, Inbox, Trash2,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { ResponsiveImage } from '@/modules/files';
import { SEOPreviewCard } from '@/components/seo/SEOPreviewCard';
import { FieldAiActions } from '@/components/blog/FieldAiActions';

import {
  adminGetBrand, adminApproveBrand, adminRejectBrand, adminArchiveBrand,
  adminMergeBrands, adminUpdateBrand,
  listBrandManufacturingCountries, listBrandSectors,
  listProviderBrandLinksForBrand, listBrandRequestsForBrand,
  listBrandAuditLog, listSectorsLite, lookupBusinessesByIds,
  adminApproveProviderBrandLink, adminRejectProviderBrandLink,
  brandStatusLabel, verificationLabel, relationshipLabel,
  requestStatusLabel, requestTypeLabel, authStatusLabel, pick,
  adminListBrandProducts, adminCreateBrandProduct, adminUpdateBrandProduct,
  adminDeleteBrandProduct,
  listBrandProductRequests, adminApproveBrandProductRequest, adminRejectBrandProductRequest,
  brandProductStatusLabel, brandProductRequestStatusLabel,
  adminSearchBusinessesForBrand, adminListBusinessServices, adminCreateProviderBrandLink,
  adminLinkBrandToAllServices,
  type BrandProduct, type BrandProductRequest,
} from '@/modules/brands';

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

  usePageMeta({
    title: brand
      ? (pickBi(isRTL, `${brand.name_ar} — إدارة العلامات`, `${brand.name_en ?? brand.name_ar} — Brand Admin`))
      : (pickBi(isRTL, 'تفاصيل العلامة', 'Brand detail')),
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
      if (linkServiceId && linkServiceId !== '__all__') {
        await adminCreateProviderBrandLink({
          brandId: id,
          businessId: linkBusinessId,
          businessServiceId: linkServiceId,
          relationshipType: linkRelationship as never,
          authorizationStatus: 'verified',
        });
        return { mode: 'single' as const, inserted: 1 };
      }
      const res = await adminLinkBrandToAllServices({
        brandId: id,
        businessId: linkBusinessId,
        relationshipType: linkRelationship as never,
        authorizationStatus: 'verified',
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
      qc.invalidateQueries({ queryKey: ['admin-brand-provider-links', id] });
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

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Identity & origin — inline editor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Edit3 className="w-4 h-4" />{pickBi(isRTL, 'البيانات الأساسية', 'Identity & origin')}</span>
                {identityDirty && <Badge variant="warning" className="text-[10px]">{pickBi(isRTL, 'تعديلات غير محفوظة', 'Unsaved')}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <FieldLabeled label={pickBi(isRTL, 'الاسم (عربي) *', 'Name (AR) *')}>
                  <Input dir="auto" value={identityForm.name_ar}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, name_ar: e.target.value })); setIdentityDirty(true); }} />
                </FieldLabeled>
                <FieldLabeled label={pickBi(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')}>
                  <Input dir="ltr" value={identityForm.name_en}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, name_en: e.target.value })); setIdentityDirty(true); }} />
                </FieldLabeled>
                <FieldLabeled label={pickBi(isRTL, 'الموقع الرسمي', 'Official website')}>
                  <Input dir="ltr" placeholder="https://example.com" className="tech-content" value={identityForm.website}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, website: e.target.value })); setIdentityDirty(true); }} />
                </FieldLabeled>
                <FieldLabeled label={pickBi(isRTL, 'الشركة المالكة', 'Brand owner')}>
                  <Input dir="auto" value={identityForm.brand_owner_company}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, brand_owner_company: e.target.value })); setIdentityDirty(true); }} />
                </FieldLabeled>
                <FieldLabeled label={pickBi(isRTL, 'سنة التأسيس', 'Founded year')}>
                  <Input type="number" inputMode="numeric" className="tech-content" value={identityForm.founded_year}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, founded_year: e.target.value })); setIdentityDirty(true); }} />
                </FieldLabeled>
                <FieldLabeled label={pickBi(isRTL, 'كود البلد (ISO)', 'Country code (ISO)')}>
                  <Input maxLength={3} dir="ltr" className="tech-content uppercase" value={identityForm.country_of_origin_code}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, country_of_origin_code: e.target.value })); setIdentityDirty(true); }} />
                </FieldLabeled>
                <FieldLabeled label={pickBi(isRTL, 'اسم البلد (عربي)', 'Country (AR)')}>
                  <Input dir="auto" value={identityForm.country_of_origin_name_ar}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, country_of_origin_name_ar: e.target.value })); setIdentityDirty(true); }} />
                </FieldLabeled>
                <FieldLabeled label={pickBi(isRTL, 'اسم البلد (إنجليزي)', 'Country (EN)')}>
                  <Input dir="ltr" value={identityForm.country_of_origin_name_en}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, country_of_origin_name_en: e.target.value })); setIdentityDirty(true); }} />
                </FieldLabeled>
              </div>
              <FieldLabeled label={pickBi(isRTL, 'وصف العلامة (عربي)', 'Description (AR)')}>
                <Textarea dir="auto" rows={2} value={identityForm.description_ar}
                  onChange={(e) => { setIdentityForm(f => ({ ...f, description_ar: e.target.value })); setIdentityDirty(true); }} />
              </FieldLabeled>
              <FieldLabeled label={pickBi(isRTL, 'وصف العلامة (إنجليزي)', 'Description (EN)')}>
                <Textarea dir="ltr" rows={2} value={identityForm.description_en}
                  onChange={(e) => { setIdentityForm(f => ({ ...f, description_en: e.target.value })); setIdentityDirty(true); }} />
              </FieldLabeled>
              <div>
                <Label className="text-xs mb-2 block">{pickBi(isRTL, 'الشعار (يُضغط تلقائياً إلى WebP)', 'Logo (auto-compressed to WebP)')}</Label>
                <ImageUpload bucket="business-assets" value={identityForm.logo_url}
                  onChange={(url) => { setIdentityForm(f => ({ ...f, logo_url: url || '' })); setIdentityDirty(true); }}
                  onRemove={() => { setIdentityForm(f => ({ ...f, logo_url: '' })); setIdentityDirty(true); }}
                  placeholder={pickBi(isRTL, 'رفع شعار العلامة', 'Upload brand logo')} />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="h-4 w-4" checked={identityForm.is_local}
                    onChange={(e) => { setIdentityForm(f => ({ ...f, is_local: e.target.checked })); setIdentityDirty(true); }} />
                  <span>{pickBi(isRTL, 'علامة محلية', 'Local brand')}</span>
                </label>
                <Button size="sm" onClick={() => saveIdentity.mutate()}
                  disabled={!identityDirty || saveIdentity.isPending || !identityForm.name_ar.trim()}>
                  {saveIdentity.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
                  {pickBi(isRTL, 'حفظ التعديلات', 'Save changes')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />SEO</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <SEOPreviewCard
                kind="brand"
                customTitleAr={seoForm.seo_title_ar}
                customTitleEn={seoForm.seo_title_en}
                customDescriptionAr={seoForm.seo_description_ar}
                customDescriptionEn={seoForm.seo_description_en}
                nameAr={brand.name_ar}
                nameEn={brand.name_en ?? brand.name_ar}
                rawDescriptionAr={brand.description_ar}
                rawDescriptionEn={brand.description_en}
                url={brand.slug ? `https://qitaat.com/brands/${brand.slug}` : null}
                ogImageUrl={seoForm.og_image_url || brand.logo_url}
                focusKeyword={seoForm.brand_keywords.split(',').map(k => k.trim()).filter(Boolean)[0] ?? null}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">{pickBi(isRTL, 'عنوان SEO (عربي)', 'SEO Title (AR)')}</Label>
                    <FieldAiActions value={seoForm.seo_title_ar || brand.name_ar || ''} lang="ar" isRTL={isRTL} fieldType="meta_title" compact
                      onTranslated={(t) => setSeoForm(f => ({ ...f, seo_title_ar: t }))}
                      onImproved={(t) => setSeoForm(f => ({ ...f, seo_title_ar: t }))} />
                  </div>
                  <Input value={seoForm.seo_title_ar} onChange={(e) => setSeoForm(f => ({ ...f, seo_title_ar: e.target.value }))} className="mt-1" dir="auto" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">{pickBi(isRTL, 'عنوان SEO (إنجليزي)', 'SEO Title (EN)')}</Label>
                    <FieldAiActions value={seoForm.seo_title_en || brand.name_en || ''} lang="en" isRTL={isRTL} fieldType="meta_title" compact
                      onTranslated={(t) => setSeoForm(f => ({ ...f, seo_title_en: t }))}
                      onImproved={(t) => setSeoForm(f => ({ ...f, seo_title_en: t }))} />
                  </div>
                  <Input value={seoForm.seo_title_en} onChange={(e) => setSeoForm(f => ({ ...f, seo_title_en: e.target.value }))} className="mt-1" dir="ltr" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">{pickBi(isRTL, 'وصف SEO (عربي)', 'SEO Description (AR)')}</Label>
                    <FieldAiActions value={seoForm.seo_description_ar || brand.description_ar || ''} lang="ar" isRTL={isRTL} fieldType="meta_description" compact
                      onTranslated={(t) => setSeoForm(f => ({ ...f, seo_description_ar: t }))}
                      onImproved={(t) => setSeoForm(f => ({ ...f, seo_description_ar: t }))} />
                  </div>
                  <Textarea value={seoForm.seo_description_ar} onChange={(e) => setSeoForm(f => ({ ...f, seo_description_ar: e.target.value }))} rows={2} className="mt-1" dir="auto" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">{pickBi(isRTL, 'وصف SEO (إنجليزي)', 'SEO Description (EN)')}</Label>
                    <FieldAiActions value={seoForm.seo_description_en || brand.description_en || ''} lang="en" isRTL={isRTL} fieldType="meta_description" compact
                      onTranslated={(t) => setSeoForm(f => ({ ...f, seo_description_en: t }))}
                      onImproved={(t) => setSeoForm(f => ({ ...f, seo_description_en: t }))} />
                  </div>
                  <Textarea value={seoForm.seo_description_en} onChange={(e) => setSeoForm(f => ({ ...f, seo_description_en: e.target.value }))} rows={2} className="mt-1" dir="ltr" />
                </div>
              </div>
              <div>
                <Label className="text-xs">{pickBi(isRTL, 'كلمات العلامة', 'Brand keywords')}</Label>
                <Input value={seoForm.brand_keywords} onChange={(e) => setSeoForm(f => ({ ...f, brand_keywords: e.target.value }))} className="mt-1" dir="auto" />
              </div>
              <div>
                <Label className="text-xs mb-2 block">{pickBi(isRTL, 'صورة OG', 'OG image')}</Label>
                <ImageUpload bucket="business-assets" value={seoForm.og_image_url}
                  onChange={(url) => setSeoForm(f => ({ ...f, og_image_url: url || '' }))}
                  onRemove={() => setSeoForm(f => ({ ...f, og_image_url: '' }))}
                  placeholder={pickBi(isRTL, 'رفع صورة المشاركة', 'Upload share image')} />
              </div>
              <Button onClick={() => saveSeo.mutate()} disabled={saveSeo.isPending} className="w-full gap-2">
                {saveSeo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {pickBi(isRTL, 'حفظ SEO', 'Save SEO')}
              </Button>
            </CardContent>
          </Card>

          {/* Manufacturing countries */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">{pickBi(isRTL, 'دول التصنيع', 'Manufacturing countries')}</CardTitle></CardHeader>
            <CardContent>
              {mfgQ.isLoading ? <Skeleton className="h-20" /> : (mfgQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد بيانات', 'None recorded')}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {(mfgQ.data ?? []).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 flex-wrap">
                      <code className="tech-content bg-muted px-2 py-0.5 rounded text-xs">{c.country_code}</code>
                      <span>{locale === 'ar' ? (c.country_name_ar ?? '—') : (c.country_name_en ?? '—')}</span>
                      <Badge variant="outline" className="text-[10px]">{c.manufacturing_type}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Sectors */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">{pickBi(isRTL, 'القطاعات المرتبطة', 'Linked sectors')}</CardTitle></CardHeader>
            <CardContent>
              {sectorsQ.isLoading ? <Skeleton className="h-16" /> : (sectorsQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد قطاعات مرتبطة', 'No sectors linked')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(sectorsQ.data ?? []).map((l) => {
                    const s = sectorMap.get(l.sector_id);
                    return (
                      <Badge key={l.id} variant={l.is_primary ? 'default' : 'outline'} className="text-xs">
                        {s ? (locale === 'ar' ? s.name_ar : (s.name_en ?? s.name_ar)) : l.sector_id}
                        {l.is_primary && <span className="ms-1 opacity-70">★</span>}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Merge */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{pickBi(isRTL, 'دمج العلامة', 'Merge brand')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {pickBi(isRTL, 'دمج هذه العلامة في علامة أخرى (تظل المراجع كما هي).', 'Merge this brand into another (refs are preserved).')}
              </p>
              <Input value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}
                placeholder={pickBi(isRTL, 'UUID العلامة الهدف', 'Target brand UUID')} className="h-10 tech-content" />
              <Button size="sm" variant="outline"
                onClick={() => { if (mergeTarget.trim()) merge.mutate(mergeTarget.trim()); }}
                disabled={!mergeTarget.trim() || merge.isPending}>
                {merge.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : null}
                {pickBi(isRTL, 'دمج', 'Merge')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Provider relationships */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />{pickBi(isRTL, 'علاقات المزودين', 'Provider relationships')} <span className="text-xs text-muted-foreground">({linksQ.data?.length ?? 0})</span></CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              {pickBi(isRTL, 'نوع العلاقة (وكيل حصري، موزع معتمد، مُصنِّع، إلخ) يُحدَّد من قِبل المزود ويُعتمَد من هنا.', 'Relationship type (exclusive agent, authorized distributor, manufacturer, etc.) is declared by the provider and approved here.')}
            </p>

            {/* Admin-only: directly link a provider business+service to this brand. */}
            <div className="mb-4 rounded-lg border border-dashed bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" />
                {pickBi(isRTL, 'إضافة وربط مزود بالعلامة', 'Link a provider to this brand')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-5 relative">
                  <Input
                    value={linkBusinessId ? linkBusinessLabel : linkSearch}
                    onChange={(e) => { setLinkSearch(e.target.value); setLinkBusinessId(''); setLinkBusinessLabel(''); setLinkServiceId(''); }}
                    placeholder={pickBi(isRTL, 'ابحث عن جهة بالاسم أو الرمز…', 'Search business by name or ref…')}
                    className="h-10"
                  />
                  {linkSearch.trim().length >= 2 && !linkBusinessId && (linkSearchQ.data?.length ?? 0) > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-background shadow-md">
                      {(linkSearchQ.data ?? []).map((b) => {
                        const bname = locale === 'ar' ? (b.name_ar ?? b.name_en ?? '') : (b.name_en ?? b.name_ar ?? '');
                        return (
                          <button
                            key={b.id}
                            type="button"
                            className="w-full text-start px-3 py-2 hover:bg-muted text-sm flex items-center justify-between gap-2"
                            onClick={() => { setLinkBusinessId(b.id); setLinkBusinessLabel(bname || b.username || b.ref_id || b.id.slice(0, 8)); setLinkSearch(''); }}
                          >
                            <span className="truncate" dir="auto">{bname || b.username || b.id.slice(0, 8)}</span>
                            {b.ref_id && <code className="tech-content text-[10px] text-muted-foreground">{b.ref_id}</code>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="md:col-span-4">
                  <select
                    value={linkServiceId}
                    onChange={(e) => setLinkServiceId(e.target.value)}
                    disabled={!linkBusinessId || linkServicesQ.isLoading}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="__all__">
                      {(linkServicesQ.data ?? []).length === 0
                        ? pickBi(isRTL, 'لا توجد خدمات — سيتم إنشاء خدمة عامة وربطها', 'No services — a general placeholder will be created')
                        : pickBi(isRTL, 'كل الخدمات (افتراضي)', 'All services (default)')}
                    </option>
                    {(linkServicesQ.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{locale === 'ar' ? (s.name_ar ?? s.name_en ?? s.id.slice(0,8)) : (s.name_en ?? s.name_ar ?? s.id.slice(0,8))}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <select
                    value={linkRelationship}
                    onChange={(e) => setLinkRelationship(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {(['manufacturer','official_agent','authorized_distributor','distributor','reseller','importer','installer','fabricator','maintenance_provider','showroom','supplier','other'] as const).map((rt) => (
                      <option key={rt} value={rt}>{pick(relationshipLabel[rt], locale)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <Button
                  size="sm"
                  onClick={() => createLink.mutate()}
                  disabled={!linkBusinessId || createLink.isPending}
                >
                  {createLink.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Plus className="w-4 h-4 me-1" />}
                  {pickBi(isRTL, 'ربط واعتماد', 'Link & verify')}
                </Button>
              </div>
            </div>

            {linksQ.isLoading ? <Skeleton className="h-24" /> : (linksQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد علاقات بعد', 'No provider links yet')}</p>
            ) : (
              <div className="space-y-2">
                {(linksQ.data ?? []).map((l) => {
                  const biz = bizMap.get(l.business_id);
                  const bizName = biz ? (locale === 'ar' ? (biz.name_ar ?? biz.name_en) : (biz.name_en ?? biz.name_ar)) : null;
                  return (
                    <div key={l.id} className="border rounded-lg p-3 flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{bizName ?? biz?.username ?? biz?.ref_id ?? l.business_id.slice(0, 8)}</span>
                          {biz?.ref_id && <code className="tech-content text-xs">{biz.ref_id}</code>}
                          {l.relationship_type && <Badge variant="outline" className="text-xs">{pick(relationshipLabel[l.relationship_type], locale)}</Badge>}
                          {l.authorization_status && <Badge variant="secondary" className="text-xs">{pick(authStatusLabel[l.authorization_status], locale)}</Badge>}
                        </div>
                        {l.ref_id && <code className="tech-content text-[10px] text-muted-foreground">{l.ref_id}</code>}
                        {l.authorization_document_url && (
                          <a href={l.authorization_document_url} target="_blank" rel="noopener noreferrer"
                             className="text-xs text-primary underline ms-2 inline-flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />{pickBi(isRTL, 'مستند التفويض', 'Auth doc')}
                          </a>
                        )}
                      </div>
                      {l.authorization_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveLink.mutate(l.id)} disabled={approveLink.isPending}>
                            <Check className="w-4 h-4 me-1" />{pickBi(isRTL, 'اعتماد', 'Approve')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectingLinkId(l.id); setLinkReason(''); }}>
                            <X className="w-4 h-4 me-1" />{pickBi(isRTL, 'رفض', 'Reject')}
                          </Button>
                        </div>
                      )}
                      {rejectingLinkId === l.id && (
                        <div className="w-full mt-2 p-2 rounded bg-muted/40 space-y-2">
                          <Input value={linkReason} onChange={(e) => setLinkReason(e.target.value)}
                            placeholder={pickBi(isRTL, 'سبب الرفض…', 'Rejection reason…')} className="h-9" />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive"
                              onClick={() => linkReason.trim() && rejectLink.mutate({ linkId: l.id, reason: linkReason })}
                              disabled={!linkReason.trim() || rejectLink.isPending}>
                              {pickBi(isRTL, 'تأكيد', 'Confirm')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setRejectingLinkId(null); setLinkReason(''); }}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related requests */}
        {/* Brand products — central catalog */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />{pickBi(isRTL, 'منتجات العلامة', 'Brand products')}
              <span className="text-xs text-muted-foreground">({productsQ.data?.length ?? 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-xl p-3 bg-muted/30 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><Plus className="w-4 h-4" />{pickBi(isRTL, 'إضافة منتج مركزياً (معتمد فوراً)', 'Add product centrally (instantly approved)')}</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input dir="auto" placeholder={pickBi(isRTL, 'الاسم (عربي) *', 'Name (AR) *')} value={newProduct.name_ar}
                  onChange={(e) => setNewProduct(p => ({ ...p, name_ar: e.target.value }))} />
                <Input dir="ltr" placeholder={pickBi(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')} value={newProduct.name_en}
                  onChange={(e) => setNewProduct(p => ({ ...p, name_en: e.target.value }))} />
                <Input dir="ltr" placeholder={pickBi(isRTL, 'رقم الموديل', 'Model number')} className="tech-content" value={newProduct.model_number}
                  onChange={(e) => setNewProduct(p => ({ ...p, model_number: e.target.value }))} />
                <Input dir="ltr" placeholder="SKU" className="tech-content" value={newProduct.sku}
                  onChange={(e) => setNewProduct(p => ({ ...p, sku: e.target.value }))} />
              </div>
              <Textarea dir="auto" rows={2} placeholder={pickBi(isRTL, 'وصف موجز', 'Short description')} value={newProduct.description_ar}
                onChange={(e) => setNewProduct(p => ({ ...p, description_ar: e.target.value }))} />
              <div>
                <Label className="text-xs mb-2 block">{pickBi(isRTL, 'صورة المنتج (تُضغط تلقائياً)', 'Product image (auto-compressed)')}</Label>
                <ImageUpload bucket="business-assets" value={newProduct.image_url}
                  pipeline="product"
                  onChange={(url) => setNewProduct(p => ({ ...p, image_url: url || '' }))}
                  onRemove={() => setNewProduct(p => ({ ...p, image_url: '' }))}
                  onUploadedMeta={(meta) => setNewProduct(p => ({
                    ...p,
                    image_asset_id: meta.imageAssetId ?? '',
                    image_variants: (meta.variants ?? {}) as Record<string, string>,
                  }))}
                  placeholder={pickBi(isRTL, 'رفع صورة', 'Upload image')} />
              </div>
              <Button size="sm" onClick={() => createProduct.mutate()}
                disabled={!newProduct.name_ar.trim() || createProduct.isPending}>
                {createProduct.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Plus className="w-4 h-4 me-1" />}
                {pickBi(isRTL, 'إضافة', 'Add')}
              </Button>
            </div>

            {productsQ.isLoading ? <Skeleton className="h-24" /> : (productsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{pickBi(isRTL, 'لا توجد منتجات بعد', 'No products yet')}</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(productsQ.data ?? []).map((p: BrandProduct) => editingProductId === p.id ? (
                  <div key={p.id} className="border rounded-xl p-3 space-y-2 bg-card">
                    <Input dir="auto" value={editProduct.name_ar} onChange={(e) => setEditProduct(s => ({ ...s, name_ar: e.target.value }))} placeholder={pickBi(isRTL, 'العربية', 'Arabic')} />
                    <Input dir="ltr" value={editProduct.name_en} onChange={(e) => setEditProduct(s => ({ ...s, name_en: e.target.value }))} placeholder="English" />
                    <Input dir="ltr" value={editProduct.model_number} onChange={(e) => setEditProduct(s => ({ ...s, model_number: e.target.value }))} placeholder="Model" className="tech-content" />
                    <Input dir="ltr" value={editProduct.sku} onChange={(e) => setEditProduct(s => ({ ...s, sku: e.target.value }))} placeholder="SKU" className="tech-content" />
                    <Textarea dir="auto" rows={2} value={editProduct.description_ar} onChange={(e) => setEditProduct(s => ({ ...s, description_ar: e.target.value }))} />
                    <ImageUpload bucket="business-assets" value={editProduct.image_url}
                      pipeline="product"
                      onChange={(url) => setEditProduct(s => ({ ...s, image_url: url || '' }))}
                      onRemove={() => setEditProduct(s => ({ ...s, image_url: '' }))}
                      onUploadedMeta={(meta) => setEditProduct(s => ({
                        ...s,
                        image_asset_id: meta.imageAssetId ?? '',
                        image_variants: (meta.variants ?? {}) as Record<string, string>,
                      }))} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateProduct.mutate({ productId: p.id })} disabled={updateProduct.isPending}>
                        <Save className="w-4 h-4 me-1" />{pickBi(isRTL, 'حفظ', 'Save')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingProductId(null)}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <div key={p.id} className="border rounded-xl p-3 bg-card hover-lift">
                    {p.image_url || (p.image_variants && Object.keys(p.image_variants).length > 0) ? (
                      <ResponsiveImage
                        variants={p.image_variants ?? null}
                        originalUrl={p.image_url}
                        alt={p.name_ar}
                        sizes="(max-width: 768px) 100vw, 320px"
                        className="w-full h-28 object-cover rounded-lg border bg-background mb-2"
                      />
                    ) : (
                      <div className="w-full h-28 rounded-lg bg-muted grid place-items-center text-xs text-muted-foreground mb-2"><Package className="w-6 h-6 opacity-40" /></div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate" dir="auto">{locale === 'ar' ? p.name_ar : (p.name_en ?? p.name_ar)}</div>
                        {p.model_number && <div className="text-[10px] text-muted-foreground tech-content">{p.model_number}</div>}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{pick(brandProductStatusLabel[p.status], locale)}</Badge>
                    </div>
                    {p.ref_id && <code className="tech-content text-[10px] text-muted-foreground">{p.ref_id}</code>}
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => {
                        setEditingProductId(p.id);
                        setEditProduct({
                          name_ar: p.name_ar, name_en: p.name_en ?? '',
                          model_number: p.model_number ?? '', sku: p.sku ?? '',
                          description_ar: p.description_ar ?? '', image_url: p.image_url ?? '',
                          image_asset_id: p.image_asset_id ?? '',
                          image_variants: p.image_variants ?? {},
                        });
                      }}><Edit3 className="w-3 h-3 me-1" />{pickBi(isRTL, 'تعديل', 'Edit')}</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive"
                        onClick={() => deleteProduct.mutate(p.id)} disabled={deleteProduct.isPending}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand product requests — provider proposals awaiting approval */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="w-4 h-4" />{pickBi(isRTL, 'طلبات منتجات من المزودين', 'Provider product requests')}
              <span className="text-xs text-muted-foreground">({productRequestsQ.data?.length ?? 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productRequestsQ.isLoading ? <Skeleton className="h-20" /> : (productRequestsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">{pickBi(isRTL, 'لا توجد طلبات', 'No requests')}</p>
            ) : (
              <ul className="space-y-2">
                {(productRequestsQ.data ?? []).map((r: BrandProductRequest) => (
                  <li key={r.id} className="border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {r.image_url ? (
                          <img src={r.image_url} alt={r.name_ar} className="w-12 h-12 rounded-lg object-cover border" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted grid place-items-center"><Package className="w-4 h-4 opacity-40" /></div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm" dir="auto">{locale === 'ar' ? r.name_ar : (r.name_en ?? r.name_ar)}</span>
                            <Badge variant="outline" className="text-[10px]">{pick(brandProductRequestStatusLabel[r.status], locale)}</Badge>
                            {r.ref_id && <code className="tech-content text-[10px] text-muted-foreground">{r.ref_id}</code>}
                          </div>
                          {r.model_number && <div className="text-[11px] text-muted-foreground tech-content">{r.model_number}</div>}
                          {(r.description_ar || r.description_en) && <p className="text-xs text-muted-foreground mt-1 line-clamp-2" dir="auto">{locale === 'ar' ? r.description_ar : (r.description_en ?? r.description_ar)}</p>}
                          {r.reject_reason && <p className="text-xs text-destructive mt-1" dir="auto">{r.reject_reason}</p>}
                        </div>
                      </div>
                      {(r.status === 'pending' || r.status === 'in_review' || r.status === 'needs_more_info') && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveProductReq.mutate(r.id)} disabled={approveProductReq.isPending}>
                            <Check className="w-4 h-4 me-1" />{pickBi(isRTL, 'اعتماد', 'Approve')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectingReqId(r.id); setReqRejectReason(''); }}>
                            <X className="w-4 h-4 me-1" />{pickBi(isRTL, 'رفض', 'Reject')}
                          </Button>
                        </div>
                      )}
                    </div>
                    {rejectingReqId === r.id && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/40 space-y-2">
                        <Input value={reqRejectReason} onChange={(e) => setReqRejectReason(e.target.value)}
                          placeholder={pickBi(isRTL, 'سبب الرفض…', 'Rejection reason…')} className="h-9" />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive"
                            onClick={() => rejectProductReq.mutate({ reqId: r.id, reason: reqRejectReason })}
                            disabled={!reqRejectReason.trim() || rejectProductReq.isPending}>
                            {pickBi(isRTL, 'تأكيد', 'Confirm')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRejectingReqId(null); setReqRejectReason(''); }}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Related requests (legacy brand requests) */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{pickBi(isRTL, 'الطلبات المرتبطة', 'Related requests')} <span className="text-xs text-muted-foreground">({reqsQ.data?.length ?? 0})</span></CardTitle></CardHeader>
          <CardContent>
            {reqsQ.isLoading ? <Skeleton className="h-20" /> : (reqsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد طلبات مرتبطة', 'No related requests')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(reqsQ.data ?? []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 flex-wrap border rounded-lg p-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {r.ref_id && <code className="tech-content text-xs">{r.ref_id}</code>}
                      <Badge variant="outline" className="text-xs">{pick(requestTypeLabel[r.request_type], locale)}</Badge>
                      <Badge variant="secondary" className="text-xs">{pick(requestStatusLabel[r.status], locale)}</Badge>
                      <span className="truncate" dir="auto">{locale === 'ar' ? r.name_ar : (r.name_en ?? r.name_ar)}</span>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/admin/brand-requests">{pickBi(isRTL, 'فتح القائمة', 'Open queue')}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Audit log */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" />{pickBi(isRTL, 'سجل التدقيق', 'Audit log')}</CardTitle></CardHeader>
          <CardContent>
            {auditQ.isLoading ? <Skeleton className="h-24" /> : (auditQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد أحداث', 'No events')}</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {(auditQ.data ?? []).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5">
                    <code className="tech-content">{e.action}</code>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString(pickBi(isRTL, 'ar-SA-u-nu-latn', 'en-US'))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
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