/**
 * Admin — Membership upgrade rejections audit log.
 * Reads `public.membership_upgrade_rejections` (RLS: admin only here).
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryMembershipUpgradeRejections } from '@/modules/memberships';
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

const REASON_LABEL: Record<string, { ar: string; en: string; tone: 'destructive' | 'warning' | 'secondary' }> = {
  ref_id_mismatch:        { ar: 'عدم تطابق المعرّف',     en: 'ref_id mismatch',         tone: 'destructive' },
  business_user_mismatch: { ar: 'المنشأة لمستخدم آخر',   en: 'business/user mismatch',  tone: 'destructive' },
  business_not_found:     { ar: 'لا توجد منشأة',          en: 'business not found',      tone: 'warning' },
  missing_ref_id:         { ar: 'معرّف مرجعي مفقود',     en: 'missing ref_id',          tone: 'warning' },
  unknown:                { ar: 'غير محدد',               en: 'Unknown',                 tone: 'secondary' },
};

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

/** Apply current filters to a Supabase filter builder. Shared by table query + export. */
// Supabase chainable builder typing is intentionally loose here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, f: { reason: string; refId: string; businessId: string; userId: string; dateFrom: string; dateTo: string }): any {
  let qq = q;
  if (f.reason !== 'all') qq = qq.eq('reason_code', f.reason);
  if (f.refId.trim()) {
    const s = f.refId.trim();
    qq = qq.or(`attempted_business_ref_id.ilike.%${s}%,actual_business_ref_id.ilike.%${s}%`);
  }
  if (f.businessId.trim() && UUID_RX.test(f.businessId.trim()))
    qq = qq.eq('attempted_business_id', f.businessId.trim());
  if (f.userId.trim() && UUID_RX.test(f.userId.trim()))
    qq = qq.eq('user_id', f.userId.trim());
  if (f.dateFrom) qq = qq.gte('created_at', new Date(f.dateFrom).toISOString());
  if (f.dateTo) {
    const end = new Date(f.dateTo);
    end.setHours(23, 59, 59, 999);
    qq = qq.lte('created_at', end.toISOString());
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
      const { data } = await supabase.from('profiles').select('user_id, ref_id').in('user_id', userIds);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              {isRTL ? 'سجل تدقيق رفض ترقية العضوية' : 'Membership upgrade rejections'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRTL
                ? 'كل محاولات الترقية المرفوضة بسبب عدم تطابق المعرّف أو الملكية أو مشاكل أخرى.'
                : 'All upgrade attempts blocked by ref_id, ownership or validation checks.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
            <Button onClick={exportCsv} disabled={exporting || total === 0} className="gap-2">
              <Download className={`h-4 w-4 ${exporting ? 'animate-pulse' : ''}`} />
              {isRTL ? 'تصدير CSV' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
            {/* ref_id */}
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
            {/* business_id (UUID) */}
            <Input
              value={businessIdInput}
              onChange={(e) => setBusinessIdInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyAll(); }}
              placeholder={isRTL ? 'business_id (UUID)' : 'business_id (UUID)'}
              className="tech-content"
              dir="ltr"
            />
            {/* user_id (UUID) */}
            <Input
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyAll(); }}
              placeholder={isRTL ? 'user_id (UUID)' : 'user_id (UUID)'}
              className="tech-content"
              dir="ltr"
            />
            {/* reason */}
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الأسباب' : 'All reasons'}</SelectItem>
                {Object.entries(REASON_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* date from */}
            <div className="flex items-center gap-2">
              <label className="w-12 text-xs text-muted-foreground">{isRTL ? 'من' : 'From'}</label>
              <Input type="date" value={dateFromInput} onChange={(e) => setDateFromInput(e.target.value)} className="tech-content" />
            </div>
            {/* date to */}
            <div className="flex items-center gap-2">
              <label className="w-12 text-xs text-muted-foreground">{isRTL ? 'إلى' : 'To'}</label>
              <Input type="date" value={dateToInput} onChange={(e) => setDateToInput(e.target.value)} className="tech-content" />
            </div>
            {/* actions */}
            <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-3">
              <Button onClick={applyAll}>{isRTL ? 'تطبيق الفلاتر' : 'Apply filters'}</Button>
              <Button variant="ghost" onClick={clearAll} className="gap-1">
                <X className="h-4 w-4" />
                {isRTL ? 'مسح' : 'Clear'}
              </Button>
              <span className="ms-auto text-sm text-muted-foreground tech-content">
                {isRTL ? `الإجمالي: ${total}` : `Total: ${total}`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick stat chips for current page */}
        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).map(([code, n]) => {
              const meta = REASON_LABEL[code] ?? REASON_LABEL.unknown;
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
                    const meta = REASON_LABEL[r.reason_code] ?? REASON_LABEL.unknown;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="tech-content whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(r.created_at), 'yyyy-MM-dd HH:mm', { locale })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={meta.tone === 'destructive' ? 'destructive' : meta.tone === 'warning' ? 'secondary' : 'outline'}
                            title={r.error_message ?? ''}
                          >
                            {isRTL ? meta.ar : meta.en}
                          </Badge>
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
                            title={r.user_id}
                          >
                            <User2 className="h-3.5 w-3.5" />
                            {r.user_id.slice(0, 8)}…
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
      </div>
    </DashboardLayout>
  );
};

export default AdminMembershipRejections;