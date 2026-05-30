import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Loader2, Check, X, Mail, Building2, RefreshCw, UserPlus,
  Clock, CheckCircle2, XCircle, Inbox, Filter, Search as SearchIcon,
  Download, ArrowUpDown, ExternalLink, CheckCheck, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listEntityAccessRequests,
  reviewEntityAccessRequest,
  countEntityAccessRequests,
  type AccessRequestStatusCounts,
  type EntityAccessRequestListRow,
} from '@/modules/entities/services/access';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 2 — admin queue for
 * `entity_access_requests`. Admin-only route (gated in `App.tsx` via
 * `requireAdmin`). Safe fields only — no requester email/phone, no tokens.
 */
type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
type SortOrder = 'newest' | 'oldest';

const PAGE_SIZE = 25;
const STATUS_VALUES: StatusFilter[] = ['pending', 'approved', 'rejected', 'all'];
const SORT_VALUES: SortOrder[] = ['newest', 'oldest'];

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

  // Persist filter, search query, and sort in the URL so navigating away and
  // back (or sharing the link with a teammate) restores the exact view.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') ?? 'pending') as StatusFilter;
  const initialQuery = searchParams.get('q') ?? '';
  const initialSort = (searchParams.get('sort') ?? 'newest') as SortOrder;

  const [rows, setRows] = useState<EntityAccessRequestListRow[]>([]);
  const [counts, setCounts] = useState<AccessRequestStatusCounts>({
    pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0,
  });
  const [totalForFilter, setTotalForFilter] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilterState] = useState<StatusFilter>(
    STATUS_VALUES.includes(initialStatus) ? initialStatus : 'pending',
  );
  const [acting, setActing] = useState<string | null>(null);
  const [query, setQueryState] = useState(initialQuery);
  const [sort, setSortState] = useState<SortOrder>(
    SORT_VALUES.includes(initialSort) ? initialSort : 'newest',
  );
  const [bulkRunning, setBulkRunning] = useState(false);

  // Sync state changes back into URL params (without spamming history).
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filter !== 'pending') next.set('status', filter); else next.delete('status');
    if (query) next.set('q', query); else next.delete('q');
    if (sort !== 'newest') next.set('sort', sort); else next.delete('sort');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, sort]);

  const setFilter = (next: StatusFilter) => {
    // The search query is intentionally preserved across status switches.
    setFilterState(next);
  };
  const setQuery = (next: string) => setQueryState(next);
  const setSort = (next: SortOrder | ((s: SortOrder) => SortOrder)) => {
    setSortState((prev) => (typeof next === 'function' ? next(prev) : next));
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [page, countsRes] = await Promise.all([
      listEntityAccessRequests({ status: filter, limit: PAGE_SIZE, offset: 0, withCount: true }),
      countEntityAccessRequests(),
    ]);
    if (page.error) toast.error(isRTL ? 'تعذّر تحميل الطلبات' : 'Could not load requests');
    setRows(page.data);
    setTotalForFilter(page.count ?? page.data.length);
    setCounts(countsRes);
    setLoading(false);
  }, [filter, isRTL]);

  const loadMore = useCallback(async () => {
    if (loadingMore || rows.length >= totalForFilter) return;
    setLoadingMore(true);
    const next = await listEntityAccessRequests({
      status: filter,
      limit: PAGE_SIZE,
      offset: rows.length,
    });
    if (next.error) {
      toast.error(isRTL ? 'تعذّر تحميل المزيد' : 'Could not load more');
    } else {
      // Dedupe defensively in case of overlapping rows.
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return prev.concat(next.data.filter((r) => !seen.has(r.id)));
      });
    }
    setLoadingMore(false);
  }, [filter, isRTL, loadingMore, rows.length, totalForFilter]);

  useEffect(() => { void load(); }, [load]);

  // Client-side search + sort over the already-fetched, status-filtered rows.
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => {
          const tb = r.target_business;
          const hay = [
            r.ref_id,
            r.target_ref ?? '',
            tb?.ref_id ?? '',
            tb?.legacy_ref_id ?? '',
            tb?.name_ar ?? '',
            tb?.name_en ?? '',
            r.message ?? '',
          ].join(' ').toLowerCase();
          return hay.includes(q);
        })
      : rows;
    const sorted = [...filtered].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === 'newest' ? db - da : da - db;
    });
    return sorted;
  }, [rows, query, sort]);

  // Pending rows that already have a linked entity → safe to bulk-approve.
  const bulkApprovable = useMemo(
    () => visibleRows.filter((r) => r.status === 'pending' && !!r.target_business_id),
    [visibleRows],
  );

  const exportCsv = useCallback(() => {
    const header = ['ref_id', 'status', 'target_ref', 'entity_ref', 'entity_name', 'message', 'created_at'];
    const esc = (s: unknown) => {
      const v = (s ?? '').toString().replace(/"/g, '""');
      return `"${v}"`;
    };
    const lines = [header.join(',')].concat(
      visibleRows.map((r) => {
        const tb = r.target_business;
        return [
          esc(r.ref_id),
          esc(r.status),
          esc(r.target_ref ?? ''),
          esc(tb?.ref_id ?? tb?.legacy_ref_id ?? ''),
          esc(tb?.name_en ?? tb?.name_ar ?? ''),
          esc((r.message ?? '').replace(/\s+/g, ' ')),
          esc(r.created_at),
        ].join(',');
      }),
    );
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entity-access-requests-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [visibleRows, filter]);

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

  const onBulkApprove = useCallback(async () => {
    if (!user || bulkApprovable.length === 0) return;
    setBulkRunning(true);
    let ok = 0;
    let fail = 0;
    for (const r of bulkApprovable) {
      const res = await reviewEntityAccessRequest({
        requestId: r.id,
        reviewerUserId: user.id,
        action: 'approve',
      });
      if (res.ok) ok += 1; else fail += 1;
    }
    setBulkRunning(false);
    if (ok > 0) {
      toast.success(isRTL ? `تمت الموافقة على ${ok} طلب` : `Approved ${ok} request(s)`);
    }
    if (fail > 0) {
      toast.error(isRTL ? `تعذّر تنفيذ ${fail} طلب` : `${fail} request(s) failed`);
    }
    await load();
  }, [user, bulkApprovable, isRTL, load]);

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
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={loading || visibleRows.length === 0}
              className="rounded-xl gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {isRTL ? 'تصدير CSV' : 'Export CSV'}
            </Button>
            {filter === 'pending' && (
              <Button
                variant="hero"
                size="sm"
                onClick={onBulkApprove}
                disabled={bulkRunning || bulkApprovable.length === 0}
                className="rounded-xl gap-1.5"
                title={
                  bulkApprovable.length === 0
                    ? (isRTL ? 'لا توجد طلبات قابلة للموافقة الجماعية' : 'No bulk-approvable requests')
                    : undefined
                }
              >
                {bulkRunning
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <CheckCheck className="w-3.5 h-3.5" />}
                {isRTL ? `موافقة جماعية (${bulkApprovable.length})` : `Bulk approve (${bulkApprovable.length})`}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
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

        {/* Search + sort + active filter pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              dir="auto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isRTL ? 'ابحث برقم الطلب، اسم المنشأة، أو الرسالة…' : 'Search by ref, entity name, or message…'}
              className="ps-9 h-9 rounded-xl text-xs"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
            className="rounded-xl gap-1.5 h-9"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sort === 'newest'
              ? (isRTL ? 'الأحدث أولاً' : 'Newest first')
              : (isRTL ? 'الأقدم أولاً' : 'Oldest first')}
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <Badge variant="outline" className="text-[10px]">
              {isRTL ? (filters.find(f => f.id === filter)?.ar ?? '') : (filters.find(f => f.id === filter)?.en ?? '')}
            </Badge>
            <span className="tech-content">• {visibleRows.length}/{rows.length}</span>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {query
                ? (isRTL ? 'لا نتائج مطابقة للبحث' : 'No matching results')
                : (isRTL ? 'لا توجد طلبات في هذه القائمة' : 'No requests in this view')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {query
                ? (isRTL ? 'جرّب تعديل كلمات البحث أو امسح الحقل.' : 'Try adjusting the search or clear the field.')
                : (isRTL
                  ? 'ستظهر طلبات الانضمام الجديدة هنا فور إرسالها من المستخدمين.'
                  : 'New join requests will appear here as soon as users submit them.')}
            </p>
            {query && (
              <Button variant="outline" size="sm" onClick={() => setQuery('')} className="mt-3 rounded-xl">
                {isRTL ? 'مسح البحث' : 'Clear search'}
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-2" data-feature="admin-access-requests-list">
          {visibleRows.map((r) => {
            const label = STATUS_LABEL[r.status] ?? { ar: r.status, en: r.status };
            const statusCls = STATUS_STYLE[r.status] ?? 'bg-muted text-muted-foreground border-border';
            const tb = r.target_business;
            return (
              <li key={r.id} className="rounded-2xl border border-border/40 bg-card p-4 hover:border-border transition-colors hover-lift">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/admin/ref/${encodeURIComponent(r.ref_id)}`}
                        className="tech-content text-[11px] font-semibold text-foreground hover:text-primary inline-flex items-center gap-1"
                        title={isRTL ? 'فتح في مستكشف المراجع' : 'Open in Reference Inspector'}
                      >
                        {r.ref_id}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      <Badge variant="outline" className={`text-[10px] ${statusCls}`}>
                        {isRTL ? label.ar : label.en}
                      </Badge>
                      {r.status === 'pending' && !r.target_business_id && (
                        <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                          {isRTL ? 'يحتاج ربط منشأة' : 'Needs linking'}
                        </Badge>
                      )}
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