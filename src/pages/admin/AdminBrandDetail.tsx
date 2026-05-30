import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Loader2, Check, X, Archive, ExternalLink,
  Globe, Building2, Shield, History, AlertTriangle, Edit3,
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

import {
  adminGetBrand, adminApproveBrand, adminRejectBrand, adminArchiveBrand,
  adminMergeBrands, adminUpdateBrand,
  listBrandManufacturingCountries, listBrandSectors,
  listProviderBrandLinksForBrand, listBrandRequestsForBrand,
  listBrandAuditLog, listSectorsLite, lookupBusinessesByIds,
  adminApproveProviderBrandLink, adminRejectProviderBrandLink,
  brandStatusLabel, verificationLabel, relationshipLabel,
  requestStatusLabel, requestTypeLabel, authStatusLabel, pick,
} from '@/modules/brands';

const AdminBrandDetail: React.FC = () => {
  useNoIndex();
  const { id = '' } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();
  const locale: 'ar' | 'en' = isRTL ? 'ar' : 'en';
  const qc = useQueryClient();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [rejectingLinkId, setRejectingLinkId] = useState<string | null>(null);
  const [linkReason, setLinkReason] = useState('');

  const brandQ = useQuery({
    queryKey: ['admin-brand-detail', id],
    queryFn: () => adminGetBrand(id),
    enabled: !!id,
  });
  const brand = brandQ.data;

  usePageMeta({
    title: brand
      ? (isRTL ? `${brand.name_ar} — إدارة العلامات` : `${brand.name_en ?? brand.name_ar} — Brand Admin`)
      : (isRTL ? 'تفاصيل العلامة' : 'Brand detail'),
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

  const businessIds = (linksQ.data ?? []).map((l) => l.business_id);
  const bizQ = useQuery({
    queryKey: ['admin-brand-provider-businesses', businessIds.join(',')],
    queryFn: () => lookupBusinessesByIds(businessIds),
    enabled: businessIds.length > 0,
    staleTime: 60_000,
  });
  const bizMap = new Map((bizQ.data ?? []).map((b) => [b.id, b]));
  const sectorMap = new Map((allSectorsQ.data ?? []).map((s) => [s.id, s]));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-brand-detail', id] });
    qc.invalidateQueries({ queryKey: ['admin-brands'] });
    qc.invalidateQueries({ queryKey: ['admin-brand-audit', id] });
    qc.invalidateQueries({ queryKey: ['admin-brand-provider-links', id] });
    qc.invalidateQueries({ queryKey: ['brand-ops-counts'] });
  };

  const approve = useMutation({
    mutationFn: () => adminApproveBrand(id),
    onSuccess: () => { toast.success(isRTL ? 'تم الاعتماد' : 'Approved'); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const reject = useMutation({
    mutationFn: () => adminRejectBrand(id, reason),
    onSuccess: () => { toast.success(isRTL ? 'تم الرفض' : 'Rejected'); setRejecting(false); setReason(''); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const archive = useMutation({
    mutationFn: () => adminArchiveBrand(id),
    onSuccess: () => { toast.success(isRTL ? 'تمت الأرشفة' : 'Archived'); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const merge = useMutation({
    mutationFn: (targetId: string) => adminMergeBrands(id, targetId),
    onSuccess: () => { toast.success(isRTL ? 'تم الدمج' : 'Merged'); setMergeTarget(''); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const toggleVerified = useMutation({
    mutationFn: () => adminUpdateBrand(id, {
      is_verified: !brand?.is_verified,
      verification_status: brand?.is_verified ? 'unverified' : 'verified',
    }),
    onSuccess: () => { toast.success(isRTL ? 'تم التحديث' : 'Updated'); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const approveLink = useMutation({
    mutationFn: (linkId: string) => adminApproveProviderBrandLink(linkId),
    onSuccess: () => { toast.success(isRTL ? 'تم اعتماد الربط' : 'Link approved'); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const rejectLink = useMutation({
    mutationFn: (vars: { linkId: string; reason: string }) =>
      adminRejectProviderBrandLink(vars.linkId, vars.reason),
    onSuccess: () => {
      toast.success(isRTL ? 'تم رفض الربط' : 'Link rejected');
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
          <p className="text-muted-foreground">{isRTL ? 'العلامة غير موجودة' : 'Brand not found'}</p>
          <Button asChild variant="outline"><Link to="/admin/brands"><BackArrow className="w-4 h-4 me-1" />{isRTL ? 'العودة' : 'Back'}</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  const name = locale === 'ar' ? brand.name_ar : (brand.name_en ?? brand.name_ar);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/admin/brands"><BackArrow className="w-4 h-4 me-1" />{isRTL ? 'سجل العلامات' : 'Brands Registry'}</Link></Button>
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
                  {brand.is_local && <Badge variant="outline" className="text-xs">{isRTL ? 'محلي' : 'Local'}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {brand.website && (
                <Button asChild size="sm" variant="outline">
                  <a href={brand.website} target="_blank" rel="noopener noreferrer"><Globe className="w-4 h-4 me-1" />{isRTL ? 'الموقع' : 'Website'}<ExternalLink className="w-3 h-3 ms-1" /></a>
                </Button>
              )}
              {(brand.status === 'pending' || brand.status === 'in_review' || brand.status === 'draft') && (
                <>
                  <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
                    {approve.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Check className="w-4 h-4 me-1" />}
                    {isRTL ? 'اعتماد' : 'Approve'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting(true)}><X className="w-4 h-4 me-1" />{isRTL ? 'رفض' : 'Reject'}</Button>
                </>
              )}
              {brand.status === 'approved' && (
                <Button size="sm" variant="ghost" onClick={() => archive.mutate()} disabled={archive.isPending}>
                  <Archive className="w-4 h-4 me-1" />{isRTL ? 'أرشفة' : 'Archive'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => toggleVerified.mutate()} disabled={toggleVerified.isPending}>
                <Shield className="w-4 h-4 me-1" />{brand.is_verified ? (isRTL ? 'إلغاء التوثيق' : 'Unverify') : (isRTL ? 'توثيق' : 'Verify')}
              </Button>
            </div>
          </div>
          {rejecting && (
            <div className="mt-3 p-3 rounded-lg bg-muted/40 space-y-2">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={isRTL ? 'سبب الرفض…' : 'Rejection reason…'} className="h-10" />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => reject.mutate()} disabled={reject.isPending || !reason.trim()}>
                  {isRTL ? 'تأكيد الرفض' : 'Confirm reject'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason(''); }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* General */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Edit3 className="w-4 h-4" />{isRTL ? 'البيانات الأساسية' : 'Identity & origin'}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Info label={isRTL ? 'العربية' : 'Arabic'} value={brand.name_ar} />
              <Info label={isRTL ? 'الإنجليزية' : 'English'} value={brand.name_en ?? '—'} />
              <Info label={isRTL ? 'بلد المنشأ' : 'Country of origin'}
                    value={`${brand.country_of_origin_code ?? '—'}${brand.country_of_origin_name_ar ? ' • ' + (locale === 'ar' ? brand.country_of_origin_name_ar : brand.country_of_origin_name_en) : ''}`} />
              <Info label={isRTL ? 'الشركة المالكة' : 'Brand owner'} value={brand.brand_owner_company ?? '—'} />
              <Info label={isRTL ? 'سنة التأسيس' : 'Founded'} value={brand.founded_year ? String(brand.founded_year) : '—'} />
              <Info label={isRTL ? 'المصدر' : 'Source'} value={brand.source} />
            </CardContent>
          </Card>

          {/* Manufacturing countries */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? 'دول التصنيع' : 'Manufacturing countries'}</CardTitle></CardHeader>
            <CardContent>
              {mfgQ.isLoading ? <Skeleton className="h-20" /> : (mfgQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد بيانات' : 'None recorded'}</p>
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
            <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? 'القطاعات المرتبطة' : 'Linked sectors'}</CardTitle></CardHeader>
            <CardContent>
              {sectorsQ.isLoading ? <Skeleton className="h-16" /> : (sectorsQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد قطاعات مرتبطة' : 'No sectors linked'}</p>
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
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{isRTL ? 'دمج العلامة' : 'Merge brand'}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'دمج هذه العلامة في علامة أخرى (تظل المراجع كما هي).' : 'Merge this brand into another (refs are preserved).'}
              </p>
              <Input value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}
                placeholder={isRTL ? 'UUID العلامة الهدف' : 'Target brand UUID'} className="h-10 tech-content" />
              <Button size="sm" variant="outline"
                onClick={() => { if (mergeTarget.trim()) merge.mutate(mergeTarget.trim()); }}
                disabled={!mergeTarget.trim() || merge.isPending}>
                {merge.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : null}
                {isRTL ? 'دمج' : 'Merge'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Provider relationships */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />{isRTL ? 'علاقات المزودين' : 'Provider relationships'} <span className="text-xs text-muted-foreground">({linksQ.data?.length ?? 0})</span></CardTitle></CardHeader>
          <CardContent>
            {linksQ.isLoading ? <Skeleton className="h-24" /> : (linksQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد علاقات بعد' : 'No provider links yet'}</p>
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
                            <ExternalLink className="w-3 h-3" />{isRTL ? 'مستند التفويض' : 'Auth doc'}
                          </a>
                        )}
                      </div>
                      {l.authorization_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveLink.mutate(l.id)} disabled={approveLink.isPending}>
                            <Check className="w-4 h-4 me-1" />{isRTL ? 'اعتماد' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectingLinkId(l.id); setLinkReason(''); }}>
                            <X className="w-4 h-4 me-1" />{isRTL ? 'رفض' : 'Reject'}
                          </Button>
                        </div>
                      )}
                      {rejectingLinkId === l.id && (
                        <div className="w-full mt-2 p-2 rounded bg-muted/40 space-y-2">
                          <Input value={linkReason} onChange={(e) => setLinkReason(e.target.value)}
                            placeholder={isRTL ? 'سبب الرفض…' : 'Rejection reason…'} className="h-9" />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive"
                              onClick={() => linkReason.trim() && rejectLink.mutate({ linkId: l.id, reason: linkReason })}
                              disabled={!linkReason.trim() || rejectLink.isPending}>
                              {isRTL ? 'تأكيد' : 'Confirm'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setRejectingLinkId(null); setLinkReason(''); }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
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
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? 'الطلبات المرتبطة' : 'Related requests'} <span className="text-xs text-muted-foreground">({reqsQ.data?.length ?? 0})</span></CardTitle></CardHeader>
          <CardContent>
            {reqsQ.isLoading ? <Skeleton className="h-20" /> : (reqsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد طلبات مرتبطة' : 'No related requests'}</p>
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
                      <Link to="/admin/brand-requests">{isRTL ? 'فتح القائمة' : 'Open queue'}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Audit log */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" />{isRTL ? 'سجل التدقيق' : 'Audit log'}</CardTitle></CardHeader>
          <CardContent>
            {auditQ.isLoading ? <Skeleton className="h-24" /> : (auditQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد أحداث' : 'No events'}</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {(auditQ.data ?? []).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5">
                    <code className="tech-content">{e.action}</code>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</span>
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

export default AdminBrandDetail;