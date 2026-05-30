import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2, Search, Check, X, Eye, AlertTriangle, Inbox, Info,
  ExternalLink, Building2, MessageSquare, FileText,
} from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import {
  adminListBrandRequests,
  adminSetBrandRequestStatus,
  adminApproveBrandRequestRpc,
  adminRejectBrandRequestRpc,
  lookupBusinessesByIds,
  findPossibleDuplicateBrands,
  requestStatusLabel, requestTypeLabel, relationshipLabel, pick,
  type BrandRequest, type BrandRequestStatus, type BrandRequestType,
} from '@/modules/brands';

const STATUS_FILTERS: Array<BrandRequestStatus | 'all'> = [
  'pending', 'in_review', 'needs_more_info', 'approved', 'rejected', 'all',
];
const TYPE_FILTERS: Array<BrandRequestType | 'all'> = [
  'all', 'create_brand', 'claim_brand', 'link_provider', 'update_brand', 'report_duplicate',
];

const STATUS_TONE: Record<string, string> = {
  pending:         'bg-warning/10 text-warning border-warning/30',
  in_review:       'bg-primary/10 text-primary border-primary/30',
  needs_more_info: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved:        'bg-success/10 text-success border-success/30',
  rejected:        'bg-destructive/10 text-destructive border-destructive/30',
};

const AdminBrandRequests: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const locale = isRTL ? 'ar' : 'en';
  usePageMeta({
    title: isRTL ? 'طلبات العلامات التجارية — إدارة' : 'Brand Requests — Admin',
    noindex: true,
  });
  const qc = useQueryClient();

  const [status, setStatus] = useState<BrandRequestStatus | 'all'>('pending');
  const [type, setType] = useState<BrandRequestType | 'all'>('all');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-brand-requests', status, type],
    queryFn: () => adminListBrandRequests({
      status: status === 'all' ? 'all' : status as 'pending' | 'approved' | 'rejected',
      request_type: type,
    }),
    staleTime: 15_000,
  });

  // status enum in the service narrows to pending/approved/rejected; for the
  // new states we fetch everything and filter client-side.
  const filtered = useMemo(() => {
    let rows = requests as BrandRequest[];
    if (status !== 'all') rows = rows.filter((r) => r.status === status);
    const term = q.trim().toLowerCase();
    if (term) {
      rows = rows.filter((r) =>
        (r.name_ar ?? '').toLowerCase().includes(term)
        || (r.name_en ?? '').toLowerCase().includes(term)
        || (r.ref_id ?? '').toLowerCase().includes(term),
      );
    }
    return rows;
  }, [requests, status, q]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    (requests as BrandRequest[]).forEach((r) => { out[r.status] = (out[r.status] ?? 0) + 1; });
    out.all = (requests as BrandRequest[]).length;
    return out;
  }, [requests]);

  const businessIds = useMemo(
    () => Array.from(new Set(filtered.map((r) => r.business_id).filter((x): x is string => !!x))),
    [filtered],
  );
  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-brand-requests-businesses', businessIds.join(',')],
    queryFn: () => lookupBusinessesByIds(businessIds),
    enabled: businessIds.length > 0,
    staleTime: 60_000,
  });
  const bizById = useMemo(() => {
    const m = new Map<string, typeof businesses[number]>();
    businesses.forEach((b) => m.set(b.id, b));
    return m;
  }, [businesses]);

  const inReview = useMutation({
    mutationFn: (id: string) => adminSetBrandRequestStatus({
      requestId: id, status: 'in_review', adminNote: actionNote || null,
    }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم وضع الطلب قيد المراجعة' : 'Marked as in review');
      setActionNote(''); qc.invalidateQueries({ queryKey: ['admin-brand-requests'] });
      qc.invalidateQueries({ queryKey: ['brand-ops-counts'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const needsInfo = useMutation({
    mutationFn: (id: string) => adminSetBrandRequestStatus({
      requestId: id, status: 'needs_more_info', adminNote: actionNote || null,
    }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم طلب معلومات إضافية' : 'Requested more info');
      setActionNote(''); qc.invalidateQueries({ queryKey: ['admin-brand-requests'] });
      qc.invalidateQueries({ queryKey: ['brand-ops-counts'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const approve = useMutation({
    mutationFn: (id: string) => adminApproveBrandRequestRpc({
      requestId: id, adminNote: actionNote || null,
    }),
    onSuccess: () => {
      toast.success(isRTL ? 'تمت الموافقة على الطلب' : 'Request approved');
      setActionNote(''); setExpanded(null);
      qc.invalidateQueries({ queryKey: ['admin-brand-requests'] });
      qc.invalidateQueries({ queryKey: ['brand-ops-counts'] });
      qc.invalidateQueries({ queryKey: ['admin-brands'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const reject = useMutation({
    mutationFn: (id: string) => adminRejectBrandRequestRpc({
      requestId: id, reason: rejectReason,
    }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم رفض الطلب' : 'Request rejected');
      setRejectReason(''); setExpanded(null);
      qc.invalidateQueries({ queryKey: ['admin-brand-requests'] });
      qc.invalidateQueries({ queryKey: ['brand-ops-counts'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Inbox className="w-6 h-6 text-primary" />
              {isRTL ? 'طلبات العلامات التجارية' : 'Brand Requests'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isRTL
                ? 'مراجعة واعتماد طلبات إضافة العلامات والمطالبات والربط والتكرار.'
                : 'Review brand additions, claims, provider links and duplicate reports.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/brands"><Inbox className="w-4 h-4 me-1" />{isRTL ? 'سجل العلامات' : 'Brands Registry'}</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? 'تصفية' : 'Filters'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'الحالة' : 'Status'}</div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((s) => (
                  <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)} className="h-9">
                    {s === 'all' ? (isRTL ? 'الكل' : 'All') : pick(requestStatusLabel[s as BrandRequestStatus], locale)}
                    {counts[s as string] != null && <span className="ms-2 text-xs opacity-70">{counts[s as string]}</span>}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'النوع' : 'Type'}</div>
              <div className="flex flex-wrap gap-2">
                {TYPE_FILTERS.map((t) => (
                  <Button key={t} size="sm" variant={type === t ? 'default' : 'outline'} onClick={() => setType(t)} className="h-9">
                    {t === 'all' ? (isRTL ? 'الكل' : 'All') : pick(requestTypeLabel[t as BrandRequestType], locale)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isRTL ? 'ابحث بالاسم أو الرقم المرجعي…' : 'Search by name or ref id…'} className="ps-9 h-11" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isRTL ? 'الطلبات' : 'Requests'} <span className="text-muted-foreground text-sm">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                {isRTL ? 'لا توجد طلبات مطابقة لهذه التصفية.' : 'No requests match these filters.'}
              </p>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => (
                  <RequestRow
                    key={r.id}
                    req={r}
                    locale={locale}
                    isRTL={isRTL}
                    biz={r.business_id ? bizById.get(r.business_id) : undefined}
                    expanded={expanded === r.id}
                    onExpand={() => { setExpanded(expanded === r.id ? null : r.id); setActionNote(''); setRejectReason(''); }}
                    actionNote={actionNote} setActionNote={setActionNote}
                    rejectReason={rejectReason} setRejectReason={setRejectReason}
                    onApprove={() => approve.mutate(r.id)}
                    onReject={() => {
                      if (!rejectReason.trim()) { toast.error(isRTL ? 'أدخل سبب الرفض' : 'Enter a rejection reason'); return; }
                      reject.mutate(r.id);
                    }}
                    onInReview={() => inReview.mutate(r.id)}
                    onNeedsInfo={() => {
                      if (!actionNote.trim()) { toast.error(isRTL ? 'أدخل المعلومات المطلوبة' : 'Describe what info is needed'); return; }
                      needsInfo.mutate(r.id);
                    }}
                    busy={approve.isPending || reject.isPending || inReview.isPending || needsInfo.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

function RequestRow(props: {
  req: BrandRequest;
  locale: 'ar' | 'en';
  isRTL: boolean;
  biz?: { id: string; ref_id: string | null; name_ar: string | null; name_en: string | null; username: string | null };
  expanded: boolean;
  onExpand: () => void;
  actionNote: string; setActionNote: (v: string) => void;
  rejectReason: string; setRejectReason: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onInReview: () => void;
  onNeedsInfo: () => void;
  busy: boolean;
}) {
  const { req: r, locale, isRTL, biz, expanded, onExpand, actionNote, setActionNote, rejectReason, setRejectReason, onApprove, onReject, onInReview, onNeedsInfo, busy } = props;
  const name = locale === 'ar' ? r.name_ar : (r.name_en ?? r.name_ar);
  const bizName = biz ? (locale === 'ar' ? (biz.name_ar ?? biz.name_en) : (biz.name_en ?? biz.name_ar)) : null;

  const { data: duplicates = [] } = useQuery({
    queryKey: ['admin-brand-request-dupes', r.id, r.name_ar, r.name_en ?? ''],
    queryFn: () => findPossibleDuplicateBrands({ name_ar: r.name_ar, name_en: r.name_en }),
    enabled: expanded,
    staleTime: 60_000,
  });

  const isTerminal = r.status === 'approved' || r.status === 'rejected';

  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate" dir="auto">{name}</h3>
            {r.ref_id && <code className="tech-content text-xs bg-muted px-2 py-0.5 rounded">{r.ref_id}</code>}
            <Badge variant="outline" className={`text-xs ${STATUS_TONE[r.status]}`}>
              {pick(requestStatusLabel[r.status], locale)}
            </Badge>
            <Badge variant="secondary" className="text-xs">{pick(requestTypeLabel[r.request_type], locale)}</Badge>
            {r.relationship_type && (
              <Badge variant="outline" className="text-xs">{pick(relationshipLabel[r.relationship_type], locale)}</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
            {biz && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {bizName ?? biz.username ?? biz.ref_id}
                {biz.ref_id && <code className="tech-content ms-1">{biz.ref_id}</code>}
              </span>
            )}
            {r.proposed_country_of_origin_code && (
              <span>{isRTL ? 'المنشأ:' : 'Origin:'} <code className="tech-content">{r.proposed_country_of_origin_code}</code></span>
            )}
            {r.proposed_sector_ids?.length > 0 && (
              <span>{isRTL ? 'القطاعات:' : 'Sectors:'} {r.proposed_sector_ids.length}</span>
            )}
            <span>{new Date(r.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onExpand}>
            <Eye className="w-4 h-4 me-1" />{expanded ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'مراجعة' : 'Review')}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* Proposed data */}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label={isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'} value={r.name_ar} />
            <Field label={isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'} value={r.name_en ?? '—'} />
            <Field label={isRTL ? 'بلد المنشأ' : 'Country of origin'} value={r.proposed_country_of_origin_code ?? '—'} />
            <Field label={isRTL ? 'دول التصنيع' : 'Manufacturing countries'}
                   value={(r.proposed_manufacturing_countries ?? []).map((c) => c.country_code).join(', ') || '—'} />
            <Field label={isRTL ? 'القطاعات المقترحة' : 'Proposed sectors'}
                   value={(r.proposed_sector_ids ?? []).join(', ') || '—'} />
            <Field label={isRTL ? 'الخدمات المقترحة' : 'Proposed services'}
                   value={(r.proposed_service_ids ?? []).join(', ') || '—'} />
            <Field label={isRTL ? 'نوع العلاقة' : 'Relationship'}
                   value={r.relationship_type ? pick(relationshipLabel[r.relationship_type], locale) : '—'} />
            <Field label={isRTL ? 'الملاحظات' : 'Requester notes'} value={r.notes ?? '—'} />
          </div>

          {r.documents?.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" />{isRTL ? 'المستندات' : 'Documents'}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.documents.map((d, i) => (
                  <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                     className="text-xs underline inline-flex items-center gap-1 text-primary">
                    <ExternalLink className="w-3 h-3" />{d.name ?? `Doc ${i + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          {duplicates.length > 0 && (
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
              <div className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {isRTL ? 'تحذير تكرار محتمل' : 'Possible duplicates'} ({duplicates.length})
              </div>
              <ul className="text-xs space-y-1">
                {duplicates.slice(0, 5).map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <Link to={`/admin/brands/${d.id}`} className="underline text-primary truncate">
                      {locale === 'ar' ? d.name_ar : (d.name_en ?? d.name_ar)}
                    </Link>
                    {d.ref_id && <code className="tech-content opacity-70">{d.ref_id}</code>}
                    <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.admin_notes && (
            <div className="text-sm bg-muted/40 rounded-lg p-2 flex items-start gap-2">
              <MessageSquare className="w-3 h-3 mt-0.5 text-muted-foreground" />
              <span><span className="font-medium">{isRTL ? 'ملاحظة الأدمن:' : 'Admin note:'}</span> {r.admin_notes}</span>
            </div>
          )}
          {r.reject_reason && (
            <div className="text-sm bg-destructive/5 border border-destructive/20 rounded-lg p-2 flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 text-destructive" />
              <span><span className="font-medium">{isRTL ? 'سبب الرفض:' : 'Rejection reason:'}</span> {r.reject_reason}</span>
            </div>
          )}

          {!isTerminal && (
            <div className="space-y-3 pt-2">
              <Textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                placeholder={isRTL ? 'ملاحظة أو معلومات مطلوبة من المُرسل…' : 'Admin note or what info is needed from requester…'}
                className="min-h-[60px]" />
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder={isRTL ? 'سبب الرفض (إن وُجد)…' : 'Rejection reason (if rejecting)…'} className="h-10" />
              <div className="flex flex-wrap gap-2">
                {r.status === 'pending' && (
                  <Button size="sm" variant="outline" onClick={onInReview} disabled={busy}>
                    {busy ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Eye className="w-4 h-4 me-1" />}
                    {isRTL ? 'قيد المراجعة' : 'Mark in review'}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={onNeedsInfo} disabled={busy}>
                  <MessageSquare className="w-4 h-4 me-1" />{isRTL ? 'يحتاج معلومات' : 'Needs more info'}
                </Button>
                <Button size="sm" onClick={onApprove} disabled={busy}>
                  <Check className="w-4 h-4 me-1" />{isRTL ? 'اعتماد' : 'Approve'}
                </Button>
                <Button size="sm" variant="destructive" onClick={onReject} disabled={busy}>
                  <X className="w-4 h-4 me-1" />{isRTL ? 'رفض' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5 break-words" dir="auto">{value}</div>
    </div>
  );
}

export default AdminBrandRequests;