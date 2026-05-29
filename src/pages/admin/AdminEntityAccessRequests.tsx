import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2, Check, X, Mail, Building2, RefreshCw, UserPlus,
  Clock, CheckCircle2, XCircle, Inbox, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listEntityAccessRequests,
  reviewEntityAccessRequest,
  type EntityAccessRequestListRow,
} from '@/modules/entities/services/access';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 2 — admin queue for
 * `entity_access_requests`. Admin-only route (gated in `App.tsx` via
 * `requireAdmin`). Safe fields only — no requester email/phone, no tokens.
 */
type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد المراجعة', en: 'Pending' },
  approved: { ar: 'تمت الموافقة', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  cancelled: { ar: 'ملغى', en: 'Cancelled' },
};

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-warning/10 text-warning border-warning/30',
  approved:  'bg-success/10 text-success border-success/30',
  rejected:  'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

const AdminEntityAccessRequests: React.FC = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'طلبات الانضمام للمنشآت' : 'Entity Access Requests', noindex: true });
  useNoIndex();

  const [rows, setRows] = useState<EntityAccessRequestListRow[]>([]);
  const [allRows, setAllRows] = useState<EntityAccessRequestListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [filtered, all] = await Promise.all([
      listEntityAccessRequests({ status: filter }),
      filter === 'all' ? Promise.resolve({ data: [], error: null }) : listEntityAccessRequests({ status: 'all' }),
    ]);
    if (filtered.error) toast.error(isRTL ? 'تعذّر تحميل الطلبات' : 'Could not load requests');
    setRows(filtered.data);
    setAllRows(filter === 'all' ? filtered.data : all.data);
    setLoading(false);
  }, [filter, isRTL]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, cancelled: 0, total: allRows.length };
    for (const r of allRows) {
      if (r.status in c) (c as Record<string, number>)[r.status] += 1;
    }
    return c;
  }, [allRows]);

  const onReview = async (row: EntityAccessRequestListRow, action: 'approve' | 'reject') => {
    if (!user) return;
    setActing(row.id);
    try {
      const { ok, error } = await reviewEntityAccessRequest({
        requestId: row.id,
        reviewerUserId: user.id,
        action,
      });
      if (!ok) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : (isRTL ? 'تعذّر تنفيذ الإجراء' : 'Action failed'),
        );
      } else {
        toast.success(
          action === 'approve'
            ? (isRTL ? 'تمت الموافقة على الطلب' : 'Request approved')
            : (isRTL ? 'تم رفض الطلب' : 'Request rejected'),
        );
        await load();
      }
    } finally {
      setActing(null);
    }
  };

  if (!isAdmin && !isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-muted-foreground">
          {isRTL ? 'هذه الصفحة للمشرفين فقط.' : 'This page is admin-only.'}
        </div>
      </DashboardLayout>
    );
  }

  const filters: { id: StatusFilter; ar: string; en: string; count: number; icon: typeof Clock }[] = [
    { id: 'pending',  ar: 'قيد المراجعة', en: 'Pending',  count: counts.pending,  icon: Clock },
    { id: 'approved', ar: 'تمت الموافقة',  en: 'Approved', count: counts.approved, icon: CheckCircle2 },
    { id: 'rejected', ar: 'مرفوض',         en: 'Rejected', count: counts.rejected, icon: XCircle },
    { id: 'all',      ar: 'الكل',           en: 'All',      count: counts.total,    icon: Inbox },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading">
                {isRTL ? 'طلبات الانضمام للمنشآت' : 'Entity Access Requests'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isRTL
                  ? 'مراجعة طلبات المستخدمين للانضمام إلى المنشآت القائمة وإدارتها مركزياً'
                  : 'Centrally review user requests to join existing entities'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* KPI cards (also act as filters) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="tablist">
          {filters.map((f) => {
            const active = filter === f.id;
            const tone =
              f.id === 'pending'  ? 'from-warning/10 to-warning/5 text-warning'
              : f.id === 'approved' ? 'from-success/10 to-success/5 text-success'
              : f.id === 'rejected' ? 'from-destructive/10 to-destructive/5 text-destructive'
              : 'from-primary/10 to-accent/5 text-primary';
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${tone} p-4 text-start transition-all hover-lift ${active ? 'border-primary ring-2 ring-primary/30' : 'border-border/30 hover:border-border/60'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-card/60 backdrop-blur flex items-center justify-center">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold font-heading leading-none tech-content text-foreground">{f.count}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">{isRTL ? f.ar : f.en}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter pills (compact secondary control) */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>{isRTL ? 'عرض:' : 'Showing:'}</span>
          <Badge variant="outline" className="text-[10px]">
            {isRTL ? (filters.find(f => f.id === filter)?.ar ?? '') : (filters.find(f => f.id === filter)?.en ?? '')}
          </Badge>
          <span className="tech-content">• {rows.length}</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {isRTL ? 'لا توجد طلبات في هذه القائمة' : 'No requests in this view'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL
                ? 'ستظهر طلبات الانضمام الجديدة هنا فور إرسالها من المستخدمين.'
                : 'New join requests will appear here as soon as users submit them.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2" data-feature="admin-access-requests-list">
          {rows.map((r) => {
            const label = STATUS_LABEL[r.status] ?? { ar: r.status, en: r.status };
            const statusCls = STATUS_STYLE[r.status] ?? 'bg-muted text-muted-foreground border-border';
            const tb = r.target_business;
            return (
              <li key={r.id} className="rounded-2xl border border-border/40 bg-card p-4 hover:border-border transition-colors hover-lift">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="tech-content text-[11px] font-semibold text-foreground">
                        {r.ref_id}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${statusCls}`}>
                        {isRTL ? label.ar : label.en}
                      </Badge>
                    </div>
                    {tb ? (
                      <p className="text-sm text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="tech-content text-[11px] text-muted-foreground">
                          {tb.ref_id ?? tb.legacy_ref_id ?? '—'}
                        </span>
                        <span className="truncate">
                          {isRTL ? (tb.name_ar ?? tb.name_en ?? '—') : (tb.name_en ?? tb.name_ar ?? '—')}
                        </span>
                      </p>
                    ) : r.target_ref ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {isRTL ? 'منشأة مجهولة الرابط — ' : 'Unresolved entity — '}
                          <span className="tech-content">{r.target_ref}</span>
                        </span>
                      </p>
                    ) : null}
                    {r.message && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {r.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground tech-content">
                      {new Date(r.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                    </p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acting === r.id}
                        onClick={() => onReview(r, 'reject')}
                      >
                        <X className="w-3.5 h-3.5 me-1" />
                        {isRTL ? 'رفض' : 'Reject'}
                      </Button>
                      <Button
                        size="sm"
                        variant="hero"
                        disabled={acting === r.id || !r.target_business_id}
                        onClick={() => onReview(r, 'approve')}
                        title={!r.target_business_id ? (isRTL ? 'يجب ربط المنشأة أولاً' : 'Link a target entity first') : undefined}
                      >
                        {acting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : <Check className="w-3.5 h-3.5 me-1" />}
                        {isRTL ? 'موافقة' : 'Approve'}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminEntityAccessRequests;