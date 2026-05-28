import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Activity, RefreshCw, AlertCircle, Search, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useAuth } from '@/contexts/AuthContext';
import { OperationsBreadcrumbs } from '@/components/operations/OperationsBreadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UnifiedOperationsFeed } from '@/components/operations/UnifiedOperationsFeed';
import {
  listBusinessActivityTimeline,
  type BusinessActivityEvent,
} from '@/modules/businesses/notes';
import { OFFICIAL_REF } from '@/components/operations/normalizeOperationsFeed';

/**
 * BUSINESS-CORE-18 — Per-business Operations Feed page.
 *
 * Read-only page. Fetches business activity via the shared
 * `listBusinessActivityTimeline` wrapper (RLS-authoritative), applies
 * client-side source/action/reference filtering, and renders the result
 * through `UnifiedOperationsFeed` (with `initialEvents` so the embed does
 * not re-fetch). Manual refresh only — no realtime, no polling, no cron,
 * no notifications, no automation.
 */

type SourceFilter = 'all' | 'work_order' | 'contract' | 'quote' | 'lead' | 'booking';
type ActionFilter = 'all' | 'created' | 'updated' | 'status_changed' | 'converted';

function actionSource(action: string): Exclude<SourceFilter, 'all'> | 'other' {
  if (action.startsWith('work_order.')) return 'work_order';
  if (action.startsWith('contract.')) return 'contract';
  if (action.startsWith('quote.')) return 'quote';
  if (action.startsWith('lead.')) return 'lead';
  if (action.startsWith('booking.')) return 'booking';
  return 'other';
}

function actionCategory(action: string): Exclude<ActionFilter, 'all'> | 'other' {
  if (action.endsWith('.created') || action.includes('.created_from_')) return 'created';
  if (action.endsWith('.updated')) return 'updated';
  if (action.endsWith('.status_changed') || action.endsWith('.stage_updated')) return 'status_changed';
  if (action.endsWith('.converted_to_work_order')) return 'converted';
  return 'other';
}

/** Reference search: only honours official REF strings (rejects UUIDs/junk). */
function eventMatchesRef(ev: BusinessActivityEvent, query: string): boolean {
  const md = ev.metadata ?? {};
  const candidates = [
    md.ref_id, md.task_ref_id, md.contract_ref_id, md.quote_ref_id,
    md.lead_ref_id, md.booking_ref_id, md.work_order_ref_id,
  ];
  const q = query.trim().toUpperCase();
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const v = c.trim().toUpperCase();
    if (!OFFICIAL_REF.test(v)) continue;
    if (v.includes(q)) return true;
  }
  return false;
}

const VALID_SOURCES = new Set<SourceFilter>(['all', 'work_order', 'contract', 'quote', 'lead', 'booking']);
const VALID_ACTIONS = new Set<ActionFilter>(['all', 'created', 'updated', 'status_changed', 'converted']);

export default function DashboardOperationsFeed() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { active_entity_id, isLoading: wsLoading } = useActiveWorkspace();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const tx = useMemo(() => ({
    title: isRTL ? 'سجل العمليات' : 'Operations Feed',
    subtitle: isRTL
      ? 'نشاط موحّد عبر أوامر العمل والعقود وعروض الأسعار والطلبات والحجوزات.'
      : 'Unified activity across work orders, contracts, quotes, leads, and bookings.',
    needBiz: isRTL
      ? 'اختر منشأة نشطة من مبدّل الحساب لعرض سجل العمليات.'
      : 'Select an active business from the workspace switcher to view the operations feed.',
    refresh: isRTL ? 'تحديث' : 'Refresh',
    retry: isRTL ? 'إعادة المحاولة' : 'Retry',
    err: isRTL ? 'تعذّر تحميل النشاط.' : 'Failed to load activity.',
    source: isRTL ? 'المصدر' : 'Source',
    action: isRTL ? 'الإجراء' : 'Action',
    searchPh: isRTL ? 'ابحث برقم مرجعي (WO-, TASK-, CNT-, QTE-, LED-, BKG-)…'
                    : 'Search by reference (WO-, TASK-, CNT-, QTE-, LED-, BKG-)…',
    all: isRTL ? 'الكل' : 'All',
    wo: isRTL ? 'أوامر العمل' : 'Work Orders',
    cnt: isRTL ? 'العقود' : 'Contracts',
    qte: isRTL ? 'عروض الأسعار' : 'Quotes',
    led: isRTL ? 'الطلبات' : 'Leads',
    bkg: isRTL ? 'الحجوزات' : 'Bookings',
    created: isRTL ? 'إنشاء' : 'Created',
    updated: isRTL ? 'تحديث' : 'Updated',
    status: isRTL ? 'تغيير حالة' : 'Status changed',
    converted: isRTL ? 'تحويل إلى أمر عمل' : 'Converted to Work Order',
    showing: (n: number, t: number) =>
      isRTL ? `يعرض ${n} من ${t} حدثًا` : `Showing ${n} of ${t} events`,
    crumbOps: isRTL ? 'العمليات' : 'Operations',
    crumbFeed: isRTL ? 'سجل العمليات' : 'Operations Feed',
    backOverview: isRTL ? 'نظرة عامة' : 'Overview',
    openInspector: isRTL ? 'فتح في مستكشف المراجع' : 'Open in Admin Ref Inspector',
    empty: isRTL ? 'لا توجد أحداث مطابقة للمرشحات.' : 'No events match the current filters.',
  }), [isRTL]);

  const [source, setSource] = useState<SourceFilter>('all');
  const [action, setAction] = useState<ActionFilter>('all');
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<BusinessActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise filters from URL query params (safe fallback on invalid values).
  useEffect(() => {
    const src = searchParams.get('source') as SourceFilter;
    const act = searchParams.get('action') as ActionFilter;
    const ref = searchParams.get('ref');
    if (src && VALID_SOURCES.has(src)) setSource(src);
    if (act && VALID_ACTIONS.has(act)) setAction(act);
    if (ref !== null) setQuery(ref);
  }, [searchParams]);

  const reload = useCallback(async () => {
    if (!active_entity_id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await listBusinessActivityTimeline({
      businessId: active_entity_id,
      limit: 200,
    });
    if (err) setError(tx.err);
    setEvents(data ?? []);
    setLoading(false);
  }, [active_entity_id, tx.err]);

  useEffect(() => { void reload(); }, [reload]);

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    return events.filter((ev) => {
      if (source !== 'all' && actionSource(ev.action) !== source) return false;
      if (action !== 'all' && actionCategory(ev.action) !== action) return false;
      if (trimmed.length > 0 && !eventMatchesRef(ev, trimmed)) return false;
      return true;
    });
  }, [events, source, action, query]);

  if (!wsLoading && !active_entity_id) {
    return (
      <DashboardLayout>
        <OperationsBreadcrumbs
          crumbs={[
            { labelEn: tx.crumbOps, labelAr: tx.crumbOps, to: '/dashboard/work-orders' },
            { labelEn: tx.crumbFeed, labelAr: tx.crumbFeed },
          ]}
        />
        <Card className="border-dashed border-2 mt-3">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {tx.needBiz}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const trimmedQ = query.trim().toUpperCase();
  const queryIsOfficialRef = OFFICIAL_REF.test(trimmedQ);

  return (
    <DashboardLayout>
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <OperationsBreadcrumbs
          crumbs={[
            { labelEn: tx.crumbOps, labelAr: tx.crumbOps, to: '/dashboard/work-orders' },
            { labelEn: tx.crumbFeed, labelAr: tx.crumbFeed },
          ]}
        />
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-accent" aria-hidden="true" />
              {tx.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{tx.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-xl h-8">
              <Link to="/dashboard/work-orders/overview">
                <ArrowUpRight className="w-3.5 h-3.5 me-1" />
                {tx.backOverview}
              </Link>
            </Button>
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
        </div>

        <Card className="border-border/40">
          <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx.searchPh}
                aria-label={tx.searchPh}
                className="ps-9 h-9 text-xs tech-content"
              />
            </div>
            <Select value={source} onValueChange={(v) => setSource(v as SourceFilter)}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs" aria-label={tx.source}>
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
            <Select value={action} onValueChange={(v) => setAction(v as ActionFilter)}>
              <SelectTrigger className="w-full sm:w-52 h-9 text-xs" aria-label={tx.action}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx.all}</SelectItem>
                <SelectItem value="created">{tx.created}</SelectItem>
                <SelectItem value="updated">{tx.updated}</SelectItem>
                <SelectItem value="status_changed">{tx.status}</SelectItem>
                <SelectItem value="converted">{tx.converted}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {error ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </span>
            <Button onClick={() => void reload()} size="sm" variant="outline" className="rounded-xl h-7">
              {tx.retry}
            </Button>
          </div>
        ) : null}

        <p className="text-[10px] text-muted-foreground tech-content">
          {tx.showing(filtered.length, events.length)}
        </p>

        {isAdmin && queryIsOfficialRef && (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm" className="rounded-xl h-8 gap-1.5">
              <Link to={`/admin/ref/${trimmedQ}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="tech-content">{trimmedQ}</span>
                <span>·</span>
                <span>{tx.openInspector}</span>
              </Link>
            </Button>
          </div>
        )}

        {active_entity_id ? (
          filtered.length === 0 && !loading && !error ? (
            <Card className="border-dashed border-2 border-border/60">
              <CardContent className="py-10 text-center text-xs text-muted-foreground">
                {tx.empty}
              </CardContent>
            </Card>
          ) : (
            <UnifiedOperationsFeed
              businessId={active_entity_id}
              isRTL={isRTL}
              initialEvents={filtered}
            />
          )
        ) : null}
      </div>
    </DashboardLayout>
  );
}