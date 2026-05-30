import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Check, X, Inbox, Clock, CheckCircle2, XCircle, ExternalLink, AlertCircle, Filter, Building2 } from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type SARequest = {
  id: string;
  ref_id: string | null;
  business_id: string;
  user_id: string;
  sector_id: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  ticket_ref_id: string | null;
  approved_sub_service_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type BizLite = { id: string; name_ar: string | null; name_en: string | null; username: string | null; ref_id: string | null };

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const AdminServiceRequests: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL ? 'طلبات إضافة خدمات — إدارة' : 'Service Addition Requests — Admin',
    noindex: true,
  });
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approving, setApproving] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-service-requests', filter],
    queryFn: async () => {
      let q = supabase
        .from('service_addition_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('status', filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SARequest[];
    },
    staleTime: 30_000,
  });

  const businessIds = useMemo(() => Array.from(new Set(requests.map((r) => r.business_id))), [requests]);
  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-service-requests-businesses', businessIds.join(',')],
    queryFn: async () => {
      if (businessIds.length === 0) return [] as BizLite[];
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name_ar, name_en, username, ref_id')
        .in('id', businessIds);
      if (error) throw error;
      return (data ?? []) as BizLite[];
    },
    enabled: businessIds.length > 0,
    staleTime: 60_000,
  });
  const bizById = useMemo(() => {
    const m = new Map<string, BizLite>();
    businesses.forEach((b) => m.set(b.id, b));
    return m;
  }, [businesses]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: requests.length };
    requests.forEach((r) => { c[r.status]++; });
    return c;
  }, [requests]);

  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('approve_service_addition_request', {
        p_request_id: id,
        p_admin_note: approveNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-requests'] });
      setApproving(null);
      setApproveNote('');
      toast.success(isRTL ? 'تمت الموافقة وإضافة الخدمة للمنشأة' : 'Approved and added to business');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  const rejectMut = useMutation({
    mutationFn: async (id: string) => {
      if (!rejectReason.trim()) throw new Error(isRTL ? 'سبب الرفض مطلوب' : 'Reason required');
      const { error } = await supabase.rpc('reject_service_addition_request', {
        p_request_id: id,
        p_reason: rejectReason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-requests'] });
      setRejecting(null);
      setRejectReason('');
      toast.success(isRTL ? 'تم رفض الطلب' : 'Rejected');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  const FilterBtn = ({ k, label }: { k: StatusFilter; label: string }) => (
    <Button
      variant={filter === k ? 'default' : 'outline'}
      size="sm"
      className="rounded-xl"
      onClick={() => setFilter(k)}
    >
      {label} <span className="ms-1 tech-content text-[11px] opacity-80">({counts[k]})</span>
    </Button>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              {isRTL ? 'طلبات إضافة الخدمات' : 'Service Addition Requests'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRTL
                ? 'راجع الطلبات المرسلة من المزوّدين لإضافة خدمات غير متوفرة في الكتالوج.'
                : 'Review requests from providers to add services not in the catalog.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <FilterBtn k="pending" label={isRTL ? 'قيد المراجعة' : 'Pending'} />
            <FilterBtn k="approved" label={isRTL ? 'مقبول' : 'Approved'} />
            <FilterBtn k="rejected" label={isRTL ? 'مرفوض' : 'Rejected'} />
            <FilterBtn k="all" label={isRTL ? 'الكل' : 'All'} />
          </div>
        </header>

        {isLoading && (
          <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
        )}

        {!isLoading && requests.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">{isRTL ? 'لا توجد طلبات في هذا التصنيف.' : 'No requests in this filter.'}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3">
          {requests.map((r) => {
            const biz = bizById.get(r.business_id);
            const sector = ONBOARDING_SECTORS.find((s) => s.id === r.sector_id);
            const isApproving = approving === r.id;
            const isRejecting = rejecting === r.id;
            return (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[r.status]}`}>
                      {r.status === 'pending' ? <Clock className="h-3 w-3" /> : r.status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span className="ms-1">{r.status === 'pending' ? (isRTL ? 'قيد المراجعة' : 'Pending') : r.status === 'approved' ? (isRTL ? 'مقبول' : 'Approved') : (isRTL ? 'مرفوض' : 'Rejected')}</span>
                    </Badge>
                    {r.ref_id && <span className="tech-content text-[11px] text-muted-foreground">{r.ref_id}</span>}
                    {r.ticket_ref_id && (
                      <Link to="/admin/help-center" className="tech-content text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                        {r.ticket_ref_id}<ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    <span className="text-[11px] text-muted-foreground ms-auto tech-content">
                      {new Date(r.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                    </span>
                  </div>
                  <CardTitle className="mt-2 text-base">
                    {isRTL ? r.name_ar : (r.name_en || r.name_ar)}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    {sector && <span className="inline-flex items-center gap-1"><Inbox className="h-3 w-3" />{isRTL ? sector.name_ar : sector.name_en}</span>}
                    {biz && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {biz.username ? (
                          <Link to={`/${biz.username}`} className="hover:underline">{isRTL ? (biz.name_ar || biz.name_en) : (biz.name_en || biz.name_ar)}</Link>
                        ) : (isRTL ? (biz.name_ar || biz.name_en) : (biz.name_en || biz.name_ar))}
                        {biz.ref_id && <span className="tech-content text-[10px] text-muted-foreground">· {biz.ref_id}</span>}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.description && (
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.description}</p>
                  )}
                  {r.status === 'rejected' && r.reject_reason && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive flex items-start gap-1">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{isRTL ? 'سبب الرفض: ' : 'Reason: '}{r.reject_reason}</span>
                    </div>
                  )}

                  {r.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      {isApproving && (
                        <div className="space-y-2">
                          <Label className="text-xs">{isRTL ? 'ملاحظة (اختياري)' : 'Note (optional)'}</Label>
                          <Input value={approveNote} onChange={(e) => setApproveNote(e.target.value)} dir="auto" />
                        </div>
                      )}
                      {isRejecting && (
                        <div className="space-y-2">
                          <Label className="text-xs">{isRTL ? 'سبب الرفض' : 'Reject reason'} *</Label>
                          <Textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} dir="auto" />
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        {!isApproving && !isRejecting && (
                          <>
                            <Button variant="destructive" size="sm" onClick={() => { setRejecting(r.id); setRejectReason(''); }}>
                              <X className="h-4 w-4 me-1" />{isRTL ? 'رفض' : 'Reject'}
                            </Button>
                            <Button size="sm" onClick={() => { setApproving(r.id); setApproveNote(''); }}>
                              <Check className="h-4 w-4 me-1" />{isRTL ? 'موافقة' : 'Approve'}
                            </Button>
                          </>
                        )}
                        {isApproving && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => setApproving(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                            <Button size="sm" disabled={approveMut.isPending} onClick={() => approveMut.mutate(r.id)}>
                              {approveMut.isPending ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <Check className="h-4 w-4 me-1" />}
                              {isRTL ? 'تأكيد الموافقة' : 'Confirm approval'}
                            </Button>
                          </>
                        )}
                        {isRejecting && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => setRejecting(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                            <Button variant="destructive" size="sm" disabled={rejectMut.isPending} onClick={() => rejectMut.mutate(r.id)}>
                              {rejectMut.isPending ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <X className="h-4 w-4 me-1" />}
                              {isRTL ? 'تأكيد الرفض' : 'Confirm reject'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminServiceRequests;