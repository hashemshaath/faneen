/**
 * Admin — Membership upgrade rejections audit log.
 * Reads `public.membership_upgrade_rejections` (RLS: admin only here).
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

const AdminMembershipRejections: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const locale = isRTL ? arLocale : enUS;

  const [page, setPage] = useState(0);
  const [reason, setReason] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-membership-rejections', page, reason, search],
    queryFn: async () => {
      let q = supabase
        .from('membership_upgrade_rejections')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (reason !== 'all') q = q.eq('reason_code', reason);
      if (search.trim()) {
        const s = search.trim();
        q = q.or(
          `attempted_business_ref_id.ilike.%${s}%,actual_business_ref_id.ilike.%${s}%,user_id.eq.${/^[0-9a-f-]{36}$/i.test(s) ? s : '00000000-0000-0000-0000-000000000000'}`,
        );
      }
      const { data: rows, count, error } = await q;
      if (error) throw error;
      return { rows: (rows ?? []) as Row[], count: count ?? 0 };
    },
    staleTime: 30_000,
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    rows.forEach((r) => { by[r.reason_code] = (by[r.reason_code] ?? 0) + 1; });
    return by;
  }, [rows]);

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
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(0); } }}
                placeholder={isRTL ? 'بحث بالـ ref_id أو معرّف المستخدم (UUID)…' : 'Search by ref_id or user UUID…'}
                className="ps-9 tech-content"
                dir="auto"
              />
            </div>
            <Select value={reason} onValueChange={(v) => { setReason(v); setPage(0); }}>
              <SelectTrigger className="md:w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الأسباب' : 'All reasons'}</SelectItem>
                {Object.entries(REASON_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { setSearch(searchInput); setPage(0); }} className="md:w-auto">
              {isRTL ? 'بحث' : 'Search'}
            </Button>
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
                    <TableHead>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{isRTL ? 'السبب' : 'Reason'}</TableHead>
                    <TableHead>{isRTL ? 'الباقة' : 'Tier'}</TableHead>
                    <TableHead>{isRTL ? 'المنشأة (المحاولة)' : 'Business (attempt)'}</TableHead>
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