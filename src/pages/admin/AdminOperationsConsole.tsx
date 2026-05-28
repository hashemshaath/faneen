import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertCircle, ClipboardList, GitBranch, RefreshCw,
  Search, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { UnifiedOperationsFeed } from '@/components/operations/UnifiedOperationsFeed';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { AdminOperationalNotesPanel } from '@/components/admin/AdminOperationalNotesPanel';
import {
  listAdminOperationalActivity,
  listAdminWorkOrders,
  type AdminOperationalSourceType,
} from '@/modules/admin';
import { computeWorkOrderKpis, type WorkOrderRow } from '@/modules/workOrders';
import type { BusinessActivityEvent } from '@/modules/businesses/notes';

/**
 * BUSINESS-ADMIN-1 — Admin Operational Console.
 *
 * Read-only support visibility across all businesses. Uses admin-safe
 * wrappers only (`listAdminOperationalActivity`, `listAdminWorkOrders`).
 * No direct table reads, no mutations, no realtime, no cron, no
 * notifications. Reference search rejects UUIDs.
 */

type SourceFilter = 'all' | AdminOperationalSourceType;

const OFFICIAL_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;
const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function StatCard({ label, value, tone = 'default' }: {
  label: string;
  value: number | string;
  tone?: 'default' | 'warn' | 'danger' | 'ok' | 'accent';
}) {
  const cls =
    tone === 'danger' ? 'text-destructive'
    : tone === 'warn' ? 'text-amber-600 dark:text-amber-400'
    : tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'accent' ? 'text-accent'
    : 'text-foreground';
  return (
    <Card className="border-border/40">
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminOperationsConsole() {
  useNoIndex();
  const { isRTL } = useLanguage();

  const tx = useMemo(() => ({
    title: isRTL ? 'مركز العمليات' : 'Operations Console',
    subtitle: isRTL
      ? 'رؤية تشغيلية للمسؤولين عبر جميع المنشآت — للدعم والمراجعة فقط (قراءة).'
      : 'Admin support visibility across all businesses — read-only.',
    refresh: isRTL ? 'تحديث' : 'Refresh',
    retry: isRTL ? 'إعادة المحاولة' : 'Retry',
    err: isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.',
    kpiOpen: isRTL ? 'أوامر العمل المفتوحة' : 'Open Work Orders',
    kpiOverdue: isRTL ? 'متأخرة' : 'Overdue',
    kpiHigh: isRTL ? 'أولوية عالية' : 'High Priority',
    kpiConverted: isRTL ? 'محوَّلة إلى أوامر عمل' : 'Converted to Work Orders',
    kpiActivity: isRTL ? 'نشاط حديث' : 'Recent activity',
    filtersTitle: isRTL ? 'المرشّحات' : 'Filters',
    business: isRTL ? 'المنشأة (UUID)' : 'Business (UUID)',
    businessPh: isRTL ? 'معرّف المنشأة' : 'Business id',
    source: isRTL ? 'المصدر' : 'Source',
    status: isRTL ? 'الحالة' : 'Status',
    priority: isRTL ? 'الأولوية' : 'Priority',
    refSearch: isRTL ? 'بحث برقم مرجعي' : 'Reference search',
    refSearchPh: isRTL
      ? 'ENT- / CNT- / QTE- / LED- / BKG- / WO- / TASK-'
      : 'ENT- / CNT- / QTE- / LED- / BKG- / WO- / TASK-',
    all: isRTL ? 'الكل' : 'All',
    wo: isRTL ? 'أوامر العمل' : 'Work Orders',
    cnt: isRTL ? 'العقود' : 'Contracts',
    qte: isRTL ? 'عروض الأسعار' : 'Quotes',
    led: isRTL ? 'الطلبات' : 'Leads',
    bkg: isRTL ? 'الحجوزات' : 'Bookings',
    feedTitle: isRTL ? 'موجز العمليات الموحّد (الكل)' : 'Unified Operations Feed (all businesses)',
    woTableTitle: isRTL ? 'أوامر العمل' : 'Work Orders',
    recentConvTitle: isRTL ? 'تحويلات حديثة' : 'Recent conversions',
    overdueListTitle: isRTL ? 'أوامر متأخرة' : 'Overdue items',
    refCol: isRTL ? 'المرجع' : 'Ref',
    titleCol: isRTL ? 'العنوان' : 'Title',
    statusCol: isRTL ? 'الحالة' : 'Status',
    priorityCol: isRTL ? 'الأولوية' : 'Priority',
    dueCol: isRTL ? 'الاستحقاق' : 'Due',
    createdCol: isRTL ? 'أُنشئ' : 'Created',
    empty: isRTL ? 'لا توجد عناصر.' : 'No items.',
    safe: isRTL ? 'قراءة فقط — لا توجد إجراءات تعديل في هذه المرحلة.'
               : 'Read-only — no mutation actions in this phase.',
    invalidRef: isRTL ? 'البحث يقبل المراجع الرسمية فقط (لا UUID).'
                      : 'Search accepts official refs only (no UUIDs).',
    rowsCount: (n: number) => isRTL ? `${n} عنصر` : `${n} items`,
  }), [isRTL]);

  const [businessId, setBusinessId] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [status, setStatus] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [refQuery, setRefQuery] = useState('');

  const [events, setEvents] = useState<BusinessActivityEvent[]>([]);
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedRef = refQuery.trim();
  const refIsUuid = trimmedRef.length > 0 && UUID_SHAPE.test(trimmedRef);
  const refIsOfficial = trimmedRef.length === 0
    ? true
    : OFFICIAL_REF.test(trimmedRef.toUpperCase());

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [actRes, woRes] = await Promise.all([
      listAdminOperationalActivity({
        limit: 200,
        sourceType: source === 'all' ? undefined : source,
        businessId: businessId.trim() || undefined,
        refSearch: refIsOfficial && trimmedRef ? trimmedRef : undefined,
      }),
      listAdminWorkOrders({
        limit: 200,
        status: status === 'all' ? undefined : status,
        priority: priority === 'all' ? undefined : priority,
        businessId: businessId.trim() || undefined,
        search: refIsOfficial && trimmedRef ? trimmedRef : undefined,
      }),
    ]);
    if (actRes.error || woRes.error) setError(tx.err);
    setEvents(actRes.data ?? []);
    setOrders(woRes.data ?? []);
    setLoading(false);
  }, [source, status, priority, businessId, trimmedRef, refIsOfficial, tx.err]);

  useEffect(() => { void reload(); }, [reload]);

  const kpis = useMemo(() => computeWorkOrderKpis(orders), [orders]);
  const converted = useMemo(
    () => events.filter((e) => e.action.endsWith('.converted_to_work_order')),
    [events],
  );
  const overdue = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) =>
      o.due_at &&
      new Date(o.due_at).getTime() < now &&
      o.status !== 'completed' &&
      o.status !== 'cancelled',
    );
  }, [orders]);

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
        year: 'numeric', month: 'short', day: '2-digit',
      });
    } catch { return iso; }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-accent" aria-hidden="true" />
              {tx.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{tx.subtitle}</p>
            <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> {tx.safe}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl h-8"
            onClick={() => void reload()}
            aria-label={tx.refresh}
          >
            <RefreshCw className={`w-3.5 h-3.5 me-1 ${loading ? 'animate-spin' : ''}`} />
            {tx.refresh}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatCard label={tx.kpiOpen} value={kpis.openCount} tone="accent" />
          <StatCard label={tx.kpiOverdue} value={kpis.overdueCount} tone="danger" />
          <StatCard
            label={tx.kpiHigh}
            value={kpis.byPriority.high + kpis.byPriority.urgent}
            tone="warn"
          />
          <StatCard label={tx.kpiConverted} value={converted.length} tone="ok" />
          <StatCard label={tx.kpiActivity} value={events.length} />
        </div>

        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              {tx.filtersTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <Input
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder={tx.businessPh}
              aria-label={tx.business}
              className="h-9 text-xs tech-content"
            />
            <Select value={source} onValueChange={(v) => setSource(v as SourceFilter)}>
              <SelectTrigger className="h-9 text-xs" aria-label={tx.source}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx.all}</SelectItem>
                <SelectItem value="work_order">{tx.wo}</SelectItem>
                <SelectItem value="contract">{tx.cnt}</SelectItem>
                <SelectItem value="quote">{tx.qte}</SelectItem>
                <SelectItem value="lead">{tx.led}</SelectItem>
                <SelectItem value="booking">{tx.bkg}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs" aria-label={tx.status}>
                <SelectValue placeholder={tx.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx.all}</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="on_hold">on_hold</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9 text-xs" aria-label={tx.priority}>
                <SelectValue placeholder={tx.priority} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx.all}</SelectItem>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="medium">medium</SelectItem>
                <SelectItem value="high">high</SelectItem>
                <SelectItem value="urgent">urgent</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={refQuery}
              onChange={(e) => setRefQuery(e.target.value)}
              placeholder={tx.refSearchPh}
              aria-label={tx.refSearch}
              className="h-9 text-xs tech-content"
            />
          </CardContent>
          {trimmedRef && (refIsUuid || !refIsOfficial) ? (
            <div className="px-4 pb-3 text-[11px] text-destructive inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {tx.invalidRef}
            </div>
          ) : null}
        </Card>

        {error ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </span>
            <Button onClick={() => void reload()} size="sm" variant="outline" className="rounded-xl h-7">
              {tx.retry}
            </Button>
          </div>
        ) : null}

        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" /> {tx.feedTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedOperationsFeed
              businessId=""
              isRTL={isRTL}
              initialEvents={events}
            />
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" /> {tx.woTableTitle}
            </CardTitle>
            <span className="text-[11px] text-muted-foreground tech-content">
              {tx.rowsCount(orders.length)}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">{tx.empty}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tx.refCol}</TableHead>
                    <TableHead>{tx.titleCol}</TableHead>
                    <TableHead>{tx.statusCol}</TableHead>
                    <TableHead>{tx.priorityCol}</TableHead>
                    <TableHead>{tx.dueCol}</TableHead>
                    <TableHead>{tx.createdCol}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 100).map((o) => (
                    <TableRow key={o.id} data-testid="admin-wo-row">
                      <TableCell>
                        {o.ref_id && OFFICIAL_REF.test(o.ref_id) ? (
                          <Link
                            to={`/r/${o.ref_id}`}
                            className="hover:opacity-80"
                            aria-label={o.ref_id}
                          >
                            <ReferenceBadge refId={o.ref_id} />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={o.title ?? ''}>
                        {o.title || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="tech-content text-[10px]">
                          {o.status ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="tech-content text-[10px]">
                          {o.priority ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs tech-content">{formatDate(o.due_at)}</TableCell>
                      <TableCell className="text-xs tech-content">{formatDate(o.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {tx.recentConvTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {converted.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tx.empty}</p>
              ) : converted.slice(0, 20).map((c) => {
                const md = c.metadata ?? {};
                const wo = typeof md.work_order_ref_id === 'string' ? md.work_order_ref_id : null;
                const src = typeof md.ref_id === 'string' ? md.ref_id : null;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2 text-xs rounded-lg border border-border/40 px-2 py-1.5">
                    <span className="tech-content text-[10px] text-muted-foreground">{c.action}</span>
                    <div className="flex items-center gap-1">
                      {src && OFFICIAL_REF.test(src) && (
                        <Link to={`/r/${src}`} aria-label={src}><ReferenceBadge refId={src} /></Link>
                      )}
                      {wo && OFFICIAL_REF.test(wo) && (
                        <Link to={`/r/${wo}`} aria-label={wo}><ReferenceBadge refId={wo} /></Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-destructive" />
                {tx.overdueListTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {overdue.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tx.empty}</p>
              ) : overdue.slice(0, 20).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 text-xs rounded-lg border border-border/40 px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {o.ref_id && OFFICIAL_REF.test(o.ref_id) ? (
                      <Link to={`/r/${o.ref_id}`} aria-label={o.ref_id}>
                        <ReferenceBadge refId={o.ref_id} />
                      </Link>
                    ) : null}
                    <span className="truncate text-foreground">{o.title || '—'}</span>
                  </div>
                  <span className="text-[10px] text-destructive tech-content shrink-0">
                    {formatDate(o.due_at)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <AdminOperationalNotesPanel
          scopedRefId={refIsOfficial && trimmedRef ? trimmedRef.toUpperCase() : undefined}
          isRTL={isRTL}
        />
      </div>
    </DashboardLayout>
  );
}