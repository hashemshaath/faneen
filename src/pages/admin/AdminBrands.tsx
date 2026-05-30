import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Check, X, Archive, ExternalLink, Inbox } from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import {
  adminListBrands, adminApproveBrand, adminRejectBrand, adminArchiveBrand,
  brandStatusLabel, verificationLabel, pick,
  type Brand, type BrandStatus,
} from '@/modules/brands';

const STATUS_FILTERS: Array<BrandStatus | 'all'> = ['pending', 'in_review', 'approved', 'rejected', 'archived', 'all'];

const AdminBrands: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const locale = isRTL ? 'ar' : 'en';
  usePageMeta({ title: isRTL ? 'سجل العلامات التجارية — إدارة' : 'Brands Registry — Admin', noindex: true });
  const qc = useQueryClient();

  const [status, setStatus] = useState<BrandStatus | 'all'>('pending');
  const [q, setQ] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['admin-brands', status, q],
    queryFn: () => adminListBrands({ status, q }),
    staleTime: 20_000,
  });

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    brands.forEach((b) => { out[b.status] = (out[b.status] ?? 0) + 1; });
    return out;
  }, [brands]);

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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{isRTL ? 'سجل العلامات التجارية' : 'Brands Registry'}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isRTL ? 'إدارة العلامات التجارية المعتمدة وطلبات الإضافة' : 'Manage approved brands and addition requests'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline"><Link to="/admin/brand-requests"><Inbox className="w-4 h-4 me-2" />{isRTL ? 'طلبات العلامات' : 'Brand requests'}</Link></Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isRTL ? 'تصفية' : 'Filters'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)} className="h-9">
                  {s === 'all' ? (isRTL ? 'الكل' : 'All') : pick(brandStatusLabel[s as BrandStatus], locale)}
                  {counts[s as string] != null && <span className="ms-2 text-xs opacity-70">{counts[s as string]}</span>}
                </Button>
              ))}
            </div>
            <div className="relative max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isRTL ? 'ابحث بالاسم أو السلاج أو الرقم المرجعي…' : 'Search by name, slug or ref id…'} className="ps-9 h-11" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isRTL ? 'العلامات' : 'Brands'} <span className="text-muted-foreground text-sm">({brands.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : brands.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">{isRTL ? 'لا توجد علامات بهذه التصفية' : 'No brands match these filters'}</p>
            ) : (
              <div className="space-y-3">
                {brands.map((b) => <BrandRow key={b.id} brand={b} locale={locale} isRTL={isRTL}
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

function BrandRow({ brand, locale, isRTL, onApprove, onArchive, rejecting, onStartReject, onCancelReject, onConfirmReject, reason, setReason }: {
  brand: Brand; locale: 'ar' | 'en'; isRTL: boolean;
  onApprove: () => void; onArchive: () => void;
  rejecting: boolean; onStartReject: () => void; onCancelReject: () => void; onConfirmReject: () => void;
  reason: string; setReason: (v: string) => void;
}) {
  const name = locale === 'ar' ? brand.name_ar : (brand.name_en ?? brand.name_ar);
  return (
    <div className="border rounded-xl p-4 hover-lift transition-all bg-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={name} className="w-12 h-12 rounded-lg object-cover border" loading="lazy" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
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
              {brand.sector_id && <span>{isRTL ? 'القطاع:' : 'Sector:'} {brand.sector_id}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {brand.website && <Button asChild size="sm" variant="ghost"><a href={brand.website} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>}
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
