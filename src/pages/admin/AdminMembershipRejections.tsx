/**
 * Admin — Membership upgrade rejections audit log.
 * Reads `public.membership_upgrade_rejections` (RLS: admin only here).
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryMembershipUpgradeRejections } from '@/modules/memberships';
import { listProfilesByUserIds } from '@/modules/users';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ShieldAlert, Search, ExternalLink, User2, Building2, RefreshCw } from 'lucide-react';
import { Download, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import {
  RejectionReasonBadge,
  REJECTION_REASON_LABELS,
  getRejectionReasonMeta,
  MembershipFinancePageShell,
  MembershipFiltersBar,
} from '@/components/admin/memberships/shared';

interface Row {
  id: string;
  user_id: string;
  attempted_business_id: string | null;
  attempted_business_ref_id: string | null;
  actual_business_ref_id: string | null;
  requested_tier: string | null;
  billing_cycle: string | null;
  reason_code: string;
  error_message: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Reason labels are now sourced from the shared admin memberships primitives. */
const REASON_LABEL = REJECTION_REASON_LABELS;

/**
 * Reason codes shown in the filter dropdown for this page.
 * Preserved from the prior local map to avoid surfacing unrelated reason codes.
 */
const REASON_FILTER_CODES: ReadonlyArray<string> = [
  'ref_id_mismatch',
  'business_user_mismatch',
  'business_not_found',
  'missing_ref_id',
  'unknown',
];

const PAGE_SIZE = 50;
const EXPORT_LIMIT = 10_000;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SortColumn = 'created_at' | 'reason_code' | 'requested_tier' | 'attempted_business_ref_id';
type SortDir = 'asc' | 'desc';

/** Sortable column header button. */
const SortBtn: React.FC<{
  col: SortColumn;
  sortBy: SortColumn;
  sortDir: SortDir;
  onClick: (c: SortColumn) => void;
  children: React.ReactNode;
}> = ({ col, sortBy, sortDir, onClick, children }) => {
  const active = sortBy === col;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onClick(col)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
    >
      {children}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
};

/** Filters applied to the rejections list / export. */
interface RejectionsFilters {
  reason: string;
  refId: string;
  businessId: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Minimal structural shape of the chainable PostgREST filter builder
 * methods we use. Each call returns the same builder type so the chain
 * preserves its generic param through `applyFilters`.
 */
interface RejectionsFilterChain<Q> {
  eq(column: string, value: string): Q;
  or(filters: string): Q;
  gte(column: string, value: string): Q;
  lte(column: string, value: string): Q;
}

/** Apply current filters to a Supabase filter builder. Shared by table query + export. */
function applyFilters<Q>(q: Q, f: RejectionsFilters): Q {
  let qq = q as Q & RejectionsFilterChain<Q>;
  const chain = (next: Q): Q & RejectionsFilterChain<Q> =>
    next as Q & RejectionsFilterChain<Q>;
  if (f.reason !== 'all') qq = chain(qq.eq('reason_code', f.reason));
  if (f.refId.trim()) {
    const s = f.refId.trim();
    qq = chain(qq.or(`attempted_business_ref_id.ilike.%${s}%,actual_business_ref_id.ilike.%${s}%`));
  }
  if (f.businessId.trim() && UUID_RX.test(f.businessId.trim()))
    qq = chain(qq.eq('attempted_business_id', f.businessId.trim()));
  if (f.userId.trim() && UUID_RX.test(f.userId.trim()))
    qq = chain(qq.eq('user_id', f.userId.trim()));
  if (f.dateFrom) qq = chain(qq.gte('created_at', new Date(f.dateFrom).toISOString()));
  if (f.dateTo) {
    const end = new Date(f.dateTo);
    end.setHours(23, 59, 59, 999);
    qq = chain(qq.lte('created_at', end.toISOString()));
  }
  return qq;
}

/** Tiny CSV-safe escaper. */
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const AdminMembershipRejections: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const locale = isRTL ? arLocale : enUS;

  const [page, setPage] = useState(0);
  const [reason, setReason] = useState<string>('all');
  // Inputs (typed) vs applied (used in queryKey) — apply on click/Enter.
  const [refIdInput, setRefIdInput] = useState('');
  const [businessIdInput, setBusinessIdInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [filters, setFilters] = useState({
    reason: 'all', refId: '', businessId: '', userId: '', dateFrom: '', dateTo: '',
  });
  const [exporting, setExporting] = useState(false);
  const [sortBy, setSortBy] = useState<SortColumn>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (col: SortColumn) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir(col === 'created_at' ? 'desc' : 'asc');
    }
    setPage(0);
  };

  const applyAll = () => {
    setFilters({
      reason,
      refId: refIdInput,
      businessId: businessIdInput,
      userId: userIdInput,
      dateFrom: dateFromInput,
      dateTo: dateToInput,
    });
    setPage(0);
  };

  const clearAll = () => {
    setReason('all');
    setRefIdInput(''); setBusinessIdInput(''); setUserIdInput('');
    setDateFromInput(''); setDateToInput('');
    setFilters({ reason: 'all', refId: '', businessId: '', userId: '', dateFrom: '', dateTo: '' });
    setPage(0);
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-membership-rejections', page, filters, sortBy, sortDir],
    queryFn: async () => {
      const { data: rows, count, error } = await queryMembershipUpgradeRejections<Row>({
        select: '*',
        count: 'exact',
        orderBy: { column: sortBy, ascending: sortDir === 'asc', nullsFirst: false },
        range: { from: page * PAGE_SIZE, to: page * PAGE_SIZE + PAGE_SIZE - 1 },
        applyFilters: (q) => applyFilters(q, filters),
      });
      if (error) throw error;
      return { rows: (rows ?? []) as Row[], count: count ?? 0 };
    },
    staleTime: 30_000,
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const userIds = useMemo(() => Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))), [rows]);
  const { data: userRefs = {} } = useQuery({
    queryKey: ['admin-rejections-user-refs', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await listProfilesByUserIds<{ user_id: string; ref_id: string | null }>({
        userIds,
        select: 'user_id, ref_id',
      });
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => { if (p.ref_id) map[p.user_id] = p.ref_id; });
      return map;
    },
  });

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    rows.forEach((r) => { by[r.reason_code] = (by[r.reason_code] ?? 0) + 1; });
    return by;
  }, [rows]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data: all, error } = await queryMembershipUpgradeRejections<Row>({
        select: '*',
        orderBy: { column: sortBy, ascending: sortDir === 'asc', nullsFirst: false },
        limit: EXPORT_LIMIT,
        applyFilters: (q) => applyFilters(q, filters),
      });
      if (error) throw error;
      const list = (all ?? []) as Row[];
      const headers = [
        'id', 'created_at', 'reason_code', 'requested_tier', 'billing_cycle',
        'attempted_business_id', 'attempted_business_ref_id', 'actual_business_ref_id',
        'user_id', 'error_message', 'user_agent',
      ] as const;
      const lines = [headers.join(',')];
      list.forEach((r) => {
        lines.push(headers.map((h) => csvEscape((r as unknown as Record<string, unknown>)[h])).join(','));
      });
      // UTF-8 BOM so Excel renders Arabic correctly.
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `membership-rejections-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(
        isRTL ? `تم تصدير ${list.length} سجل.` : `Exported ${list.length} records.`,
      );
      if (list.length === EXPORT_LIMIT) {
        toast.warning(isRTL
          ? `وصلنا للحد الأقصى (${EXPORT_LIMIT}). ضيّق نطاق التواريخ للحصول على نتائج كاملة.`
          : `Reached export cap (${EXPORT_LIMIT}). Narrow the date range for a complete export.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <MembershipFinancePageShell
        title={isRTL ? 'سجل تدقيق رفض ترقية العضوية' : 'Membership upgrade rejections'}
        description={
          isRTL
            ? 'كل محاولات الترقية المرفوضة بسبب عدم تطابق المعرّف أو الملكية أو مشاكل أخرى.'
            : 'All upgrade attempts blocked by ref_id, ownership or validation checks.'
        }
        icon={<ShieldAlert className="h-6 w-6 text-destructive" />}
        actionsSlot={
          <>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
            <Button onClick={exportCsv} disabled={exporting || total === 0} className="gap-2">
              <Download className={`h-4 w-4 ${exporting ? 'animate-pulse' : ''}`} />
              {isRTL ? 'تصدير CSV' : 'Export CSV'}
            </Button>
          </>
        }
        filtersSlot={
          <MembershipFiltersBar
            reasonValue={reason}
            onReasonChange={setReason}
            reasonAllLabel={isRTL ? 'كل الأسباب' : 'All reasons'}
            reasonOptions={REASON_FILTER_CODES.map((k) => {
              const v = getRejectionReasonMeta(k);
              return { value: k, label: isRTL ? v.ar : v.en };
            })}
            dateFrom={dateFromInput}
            onDateFromChange={setDateFromInput}
            dateTo={dateToInput}
            onDateToChange={setDateToInput}
            dateFromLabel={isRTL ? 'من' : 'From'}
            dateToLabel={isRTL ? 'إلى' : 'To'}
            onApply={applyAll}
            applyLabel={isRTL ? 'تطبيق الفلاتر' : 'Apply filters'}
            onReset={clearAll}
            resetLabel={isRTL ? 'مسح' : 'Clear'}
            actionsExtras={
              <span className="text-sm text-muted-foreground tech-content">
                {isRTL ? `الإجمالي: ${total}` : `Total: ${total}`}
              </span>
            }
            extras={
              <>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={refIdInput}
                    onChange={(e) => setRefIdInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') applyAll(); }}
                    placeholder={isRTL ? 'ref_id (مثال BIZ-1000123)' : 'ref_id (e.g. BIZ-1000123)'}
                    className="ps-9 tech-content"
                    dir="auto"
                  />
                </div>
                <Input
                  value={businessIdInput}
                  onChange={(e) => setBusinessIdInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyAll(); }}
                  placeholder={isRTL ? 'business_id (UUID)' : 'business_id (UUID)'}
                  className="tech-content"
                  dir="ltr"
                />
                <Input
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyAll(); }}
                  placeholder={isRTL ? 'user_id (UUID)' : 'user_id (UUID)'}
                  className="tech-content"
                  dir="ltr"
                />
              </>
            }
          />
        }
      >
        {/* Quick stat chips for current page */}
        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).map(([code, n]) => {
              const meta = getRejectionReasonMeta(code);
              return (
                <Badge key={code} variant="outline" className="gap-1">
                  <span>{isRTL ? meta.ar : meta.en}</span>
                  <span className="tech-content text-muted-foreground">· {n}</span>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                {isRTL ? 'لا توجد سجلات مطابقة.' : 'No records match.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortBtn col="created_at" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>
                        {isRTL ? 'التاريخ' : 'Date'}
                      </SortBtn>
                    </TableHead>
                    <TableHead>
                      <SortBtn col="reason_code" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>
                        {isRTL ? 'السبب' : 'Reason'}
                      </SortBtn>
                    </TableHead>
                    <TableHead>
                      <SortBtn col="requested_tier" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>
                        {isRTL ? 'الباقة' : 'Tier'}
                      </SortBtn>
                    </TableHead>
                    <TableHead>
                      <SortBtn col="attempted_business_ref_id" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>
                        {isRTL ? 'المنشأة (المحاولة)' : 'Business (attempt)'}
                      </SortBtn>
                    </TableHead>
                    <TableHead>{isRTL ? 'المنشأة (الفعلية)' : 'Business (actual)'}</TableHead>
                    <TableHead>{isRTL ? 'المستخدم' : 'User'}</TableHead>
                    <TableHead className="text-end">{isRTL ? 'إجراء' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="tech-content whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(r.created_at), 'yyyy-MM-dd HH:mm', { locale })}
                        </TableCell>
                        <TableCell>
                          <RejectionReasonBadge
                            code={r.reason_code}
                            isRTL={isRTL}
                            title={r.error_message ?? ''}
                          />
                          {r.error_message && (
                            <div className="mt-1 line-clamp-2 max-w-xs text-xs text-muted-foreground">
                              {r.error_message}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="tech-content text-xs">
                          {r.requested_tier ?? '—'}
                          {r.billing_cycle && <span className="text-muted-foreground"> · {r.billing_cycle}</span>}
                        </TableCell>
                        <TableCell>
                          {r.attempted_business_ref_id ? (
                            <Link
                              to={`/admin/businesses?q=${encodeURIComponent(r.attempted_business_ref_id)}`}
                              className="tech-content inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              {r.attempted_business_ref_id}
                            </Link>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {r.actual_business_ref_id ? (
                            <Link
                              to={`/admin/businesses?q=${encodeURIComponent(r.actual_business_ref_id)}`}
                              className="tech-content inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              {r.actual_business_ref_id}
                            </Link>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/admin/users?q=${encodeURIComponent(r.user_id)}`}
                            className="tech-content inline-flex items-center gap-1 text-primary hover:underline"
                            title={userRefs[r.user_id] || r.user_id}
                          >
                            <User2 className="h-3.5 w-3.5" />
                            {userRefs[r.user_id] || `${r.user_id.slice(0, 8)}…`}
                          </Link>
                        </TableCell>
                        <TableCell className="text-end">
                          <Button asChild variant="ghost" size="sm" className="gap-1">
                            <Link to={`/admin/memberships?user=${r.user_id}`}>
                              {isRTL ? 'الطلب' : 'Request'}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground tech-content">
              {isRTL
                ? `صفحة ${page + 1} من ${totalPages} · ${total} سجل`
                : `Page ${page + 1} of ${totalPages} · ${total} records`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                {isRTL ? 'السابق' : 'Previous'}
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {isRTL ? 'التالي' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </MembershipFinancePageShell>
    </DashboardLayout>
  );
};

export default AdminMembershipRejections;