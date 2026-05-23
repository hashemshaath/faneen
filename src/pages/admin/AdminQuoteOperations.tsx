import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  listAdminOpsQuoteRequests,
  listAdminOpsQuoteRequestLeads,
  listAdminOpsQuoteRequestEvents,
  listAdminOpsQuoteRequestLeadEvents,
} from '@/modules/quotes';
import {
  Activity, RefreshCw, AlertCircle, ArrowUpRight, Sparkles, Users, Clock, Target, Info,
  Download, TrendingUp,
} from 'lucide-react';
import { QUOTE_STATUS_LABEL_AR, SECTOR_LABEL_AR, type QuoteStatus } from '@/lib/quoteRequests';
import {
  buildDailyQuoteOperationsSeries, rowsToCsv, downloadCsv, DAILY_OPS_CSV_HEADERS,
} from '@/lib/quoteOperationsAggregation';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts';

type Range = 'today' | '7d' | '30d' | '90d' | 'all';

interface QuoteRow {
  id: string; sector: string; city: string; status: string; created_at: string;
}
interface LeadRow {
  id: string; quote_request_id: string; provider_id: string; status: string;
  match_score: number; match_reasons: string[] | null;
  viewed_at: string | null; responded_at: string | null;
  contact_revealed: boolean; contact_revealed_at: string | null;
  contact_view_count: number; created_at: string;
  provider?: { id: string; name_ar: string; city_id: string | null; last_active_at: string | null } | null;
}
interface QuoteEventRow {
  id: string; quote_request_id: string; event_type: string;
  metadata: Record<string, unknown> | null; created_at: string;
}
interface LeadEventRow {
  id: string; lead_id: string; quote_request_id: string; event_type: string;
  metadata: Record<string, unknown> | null; created_at: string;
}

const SECTOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'كل القطاعات' },
  { value: 'aluminum', label: 'ألمنيوم' },
  { value: 'iron', label: 'حديد' },
  { value: 'wood', label: 'خشب' },
  { value: 'glass', label: 'زجاج' },
  { value: 'stainless', label: 'ستانلس' },
  { value: 'fabrication', label: 'تصنيع وتركيب' },
  { value: 'storefronts', label: 'واجهات' },
  { value: 'project-fitout', label: 'تجهيزات مشاريع' },
  { value: 'other', label: 'أخرى' },
];

function rangeFrom(r: Range): Date | null {
  const now = new Date();
  if (r === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (r === '7d') return new Date(now.getTime() - 7 * 86400000);
  if (r === '30d') return new Date(now.getTime() - 30 * 86400000);
  if (r === '90d') return new Date(now.getTime() - 90 * 86400000);
  return null;
}

function fmtDuration(ms: number | null): string {
  if (ms === null || !isFinite(ms) || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'أقل من دقيقة';
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const AdminQuoteOperations: React.FC = () => {
  useNoIndex();
  const [range, setRange] = useState<Range>('30d');
  const [sector, setSector] = useState<string>('all');
  const [city, setCity] = useState<string>('all');

  const fromDateIso = useMemo(() => rangeFrom(range)?.toISOString() ?? null, [range]);

  const baseQuotes = useQuery({
    queryKey: ['admin-ops-quotes', fromDateIso, sector],
    queryFn: async () => {
      return (await listAdminOpsQuoteRequests({ fromDateIso, sector })) as QuoteRow[];
    },
  });

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    (baseQuotes.data ?? []).forEach((q) => q.city && set.add(q.city));
    return ['all', ...Array.from(set).sort()];
  }, [baseQuotes.data]);

  const quotes = useMemo(() => {
    const list = baseQuotes.data ?? [];
    if (city === 'all') return list;
    return list.filter((q) => q.city === city);
  }, [baseQuotes.data, city]);

  const quoteIds = useMemo(() => quotes.map((q) => q.id), [quotes]);

  const leadsQuery = useQuery({
    queryKey: ['admin-ops-leads', quoteIds],
    enabled: quoteIds.length > 0,
    queryFn: async () => {
      return await listAdminOpsQuoteRequestLeads<LeadRow>(quoteIds);
    },
  });

  const quoteEventsQuery = useQuery({
    queryKey: ['admin-ops-quote-events', quoteIds],
    enabled: quoteIds.length > 0,
    queryFn: async () => {
      return (await listAdminOpsQuoteRequestEvents(quoteIds)) as QuoteEventRow[];
    },
  });

  const leadEventsQuery = useQuery({
    queryKey: ['admin-ops-lead-events', quoteIds],
    enabled: quoteIds.length > 0,
    queryFn: async () => {
      return (await listAdminOpsQuoteRequestLeadEvents(quoteIds)) as LeadEventRow[];
    },
  });

  const loading = baseQuotes.isLoading || leadsQuery.isLoading || quoteEventsQuery.isLoading || leadEventsQuery.isLoading;
  const errored = baseQuotes.error || leadsQuery.error || quoteEventsQuery.error || leadEventsQuery.error;

  const refreshAll = () => {
    baseQuotes.refetch(); leadsQuery.refetch();
    quoteEventsQuery.refetch(); leadEventsQuery.refetch();
  };

  // ===== Aggregations =====
  const metrics = useMemo(() => {
    const leads = leadsQuery.data ?? [];
    const qe = quoteEventsQuery.data ?? [];
    const le = leadEventsQuery.data ?? [];

    const byStatus: Record<string, number> = {};
    quotes.forEach((q) => { byStatus[q.status] = (byStatus[q.status] ?? 0) + 1; });

    const quotesWithInterest = new Set(
      leads.filter((l) => l.status === 'interested' || l.status === 'contacted').map((l) => l.quote_request_id),
    ).size;

    // SLA — time_to_match per quote: created -> first quote_matched
    const createdMap = new Map(quotes.map((q) => [q.id, new Date(q.created_at).getTime()]));
    const firstMatched = new Map<string, number>();
    qe.filter((e) => e.event_type === 'quote_matched').forEach((e) => {
      const t = new Date(e.created_at).getTime();
      const cur = firstMatched.get(e.quote_request_id);
      if (cur === undefined || t < cur) firstMatched.set(e.quote_request_id, t);
    });
    const ttMatch: number[] = [];
    firstMatched.forEach((t, qId) => {
      const c = createdMap.get(qId); if (c) ttMatch.push(t - c);
    });

    // time_to_first_provider_view per lead
    const leadCreatedMap = new Map(leads.map((l) => [l.id, new Date(l.created_at).getTime()]));
    const firstView = new Map<string, number>();
    const firstInterest = new Map<string, number>();
    const firstReveal = new Map<string, number>();
    le.forEach((e) => {
      const t = new Date(e.created_at).getTime();
      if (e.event_type === 'lead_viewed') {
        const cur = firstView.get(e.lead_id);
        if (cur === undefined || t < cur) firstView.set(e.lead_id, t);
      } else if (e.event_type === 'provider_interested') {
        const cur = firstInterest.get(e.lead_id);
        if (cur === undefined || t < cur) firstInterest.set(e.lead_id, t);
      } else if (e.event_type === 'contact_revealed') {
        const cur = firstReveal.get(e.lead_id);
        if (cur === undefined || t < cur) firstReveal.set(e.lead_id, t);
      }
    });
    const ttView: number[] = [];
    firstView.forEach((t, lid) => { const c = leadCreatedMap.get(lid); if (c) ttView.push(t - c); });
    const ttInterest: number[] = [];
    firstInterest.forEach((t, lid) => { const c = leadCreatedMap.get(lid); if (c) ttInterest.push(t - c); });
    const ttReveal: number[] = [];
    firstReveal.forEach((t, lid) => {
      const i = firstInterest.get(lid);
      if (i && t > i) ttReveal.push(t - i);
    });

    // Matching performance
    const matchedEvents = qe.filter((e) => e.event_type === 'quote_matched');
    const matchFailedEvents = qe.filter((e) => e.event_type === 'quote_matching_failed');
    const leadsByQuote = new Map<string, LeadRow[]>();
    leads.forEach((l) => {
      const arr = leadsByQuote.get(l.quote_request_id) ?? [];
      arr.push(l); leadsByQuote.set(l.quote_request_id, arr);
    });
    const leadCounts = Array.from(leadsByQuote.values()).map((arr) => arr.length);
    const allScores = leads.map((l) => l.match_score ?? 0);
    const reasonCounts = new Map<string, number>();
    leads.forEach((l) => (l.match_reasons ?? []).forEach((r) => reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1)));
    const topReasons = Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Provider engagement
    const totalLeads = leads.length;
    const viewedLeads = leads.filter((l) => l.viewed_at).length;
    const interestedLeads = leads.filter((l) => l.status === 'interested' || l.status === 'contacted').length;
    const notInterestedLeads = leads.filter((l) => l.status === 'not_interested').length;

    // Top providers
    const providerStats = new Map<string, {
      id: string; name: string; cityId: string | null; lastActive: string | null;
      received: number; viewed: number; interested: number;
    }>();
    leads.forEach((l) => {
      const key = l.provider_id;
      const cur = providerStats.get(key) ?? {
        id: l.provider_id, name: l.provider?.name_ar ?? '—',
        cityId: l.provider?.city_id ?? null, lastActive: l.provider?.last_active_at ?? null,
        received: 0, viewed: 0, interested: 0,
      };
      cur.received += 1;
      if (l.viewed_at) cur.viewed += 1;
      if (l.status === 'interested' || l.status === 'contacted') cur.interested += 1;
      providerStats.set(key, cur);
    });
    const topProviders = Array.from(providerStats.values())
      .sort((a, b) => (b.interested - a.interested) || (b.viewed / Math.max(b.received, 1) - a.viewed / Math.max(a.received, 1)))
      .slice(0, 10);

    // Attention needed
    const now = Date.now();
    const matchedAtByQuote = firstMatched;
    const interestByQuote = new Map<string, boolean>();
    leads.forEach((l) => {
      if (l.status === 'interested' || l.status === 'contacted') interestByQuote.set(l.quote_request_id, true);
    });
    const viewedByQuote = new Map<string, boolean>();
    leads.forEach((l) => { if (l.viewed_at) viewedByQuote.set(l.quote_request_id, true); });

    type Attention = { quote: QuoteRow; reason: string; tone: string };
    const attention: Attention[] = [];
    quotes.forEach((q) => {
      const ageMs = now - new Date(q.created_at).getTime();
      const matchedAt = matchedAtByQuote.get(q.id);
      const hasLeads = (leadsByQuote.get(q.id)?.length ?? 0) > 0;
      const hasInterest = interestByQuote.get(q.id) ?? false;
      const hasViewed = viewedByQuote.get(q.id) ?? false;

      if (q.status === 'new' && ageMs > 24 * 3600 * 1000) {
        attention.push({ quote: q, reason: 'جديد منذ أكثر من 24 ساعة', tone: 'bg-warning/10 text-warning border-warning/30' });
      } else if (q.status === 'under_review' && (!matchedAt || !hasLeads)) {
        attention.push({ quote: q, reason: 'بانتظار التوجيه', tone: 'bg-info/10 text-info border-info/30' });
      } else if (q.status === 'matched' && matchedAt && !hasViewed && (now - matchedAt) > 24 * 3600 * 1000) {
        attention.push({ quote: q, reason: 'لم يشاهده المزودون', tone: 'bg-warning/10 text-warning border-warning/30' });
      } else if (q.status === 'matched' && matchedAt && !hasInterest && (now - matchedAt) > 48 * 3600 * 1000) {
        attention.push({ quote: q, reason: 'لا يوجد اهتمام', tone: 'bg-destructive/10 text-destructive border-destructive/30' });
      }
    });
    // Per-lead attention
    leads.forEach((l) => {
      if (l.status === 'interested' && !l.contact_revealed) {
        const q = quotes.find((x) => x.id === l.quote_request_id);
        if (q && !attention.some((a) => a.quote.id === q.id && a.reason.includes('إتاحة'))) {
          attention.push({ quote: q, reason: 'بانتظار إتاحة التواصل', tone: 'bg-primary/10 text-primary border-primary/30' });
        }
      }
      if (l.contact_revealed && (l.contact_view_count ?? 0) === 0 && l.contact_revealed_at &&
          (now - new Date(l.contact_revealed_at).getTime()) > 24 * 3600 * 1000) {
        const q = quotes.find((x) => x.id === l.quote_request_id);
        if (q) attention.push({ quote: q, reason: 'لم تُشاهد بيانات التواصل', tone: 'bg-muted text-muted-foreground border-border' });
      }
    });
    // dedupe by id+reason
    const seen = new Set<string>();
    const attentionUnique = attention.filter((a) => {
      const k = `${a.quote.id}::${a.reason}`;
      if (seen.has(k)) return false; seen.add(k); return true;
    }).slice(0, 30);

    return {
      total: quotes.length,
      byStatus,
      quotesWithInterest,
      sla: {
        ttMatch: avg(ttMatch), ttView: avg(ttView), ttInterest: avg(ttInterest), ttReveal: avg(ttReveal),
      },
      matching: {
        matchedQuotes: matchedEvents.length,
        failedQuotes: matchFailedEvents.length,
        avgLeadsPerQuote: avg(leadCounts),
        avgScore: avg(allScores),
        topScore: allScores.length ? Math.max(...allScores) : null,
        topReasons,
      },
      providers: {
        totalLeads, viewedLeads, interestedLeads, notInterestedLeads,
        viewRate: totalLeads ? viewedLeads / totalLeads : null,
        interestRate: totalLeads ? interestedLeads / totalLeads : null,
        rejectionRate: totalLeads ? notInterestedLeads / totalLeads : null,
        topProviders,
      },
      attention: attentionUnique,
    };
  }, [quotes, leadsQuery.data, quoteEventsQuery.data, leadEventsQuery.data]);

  // Daily aggregation for charts and CSV
  const dailySeries = useMemo(() => {
    return buildDailyQuoteOperationsSeries({
      quotes: quotes.map((q) => ({ id: q.id, status: q.status, created_at: q.created_at })),
      quoteEvents: (quoteEventsQuery.data ?? []).map((e) => ({
        quote_request_id: e.quote_request_id, event_type: e.event_type, created_at: e.created_at,
      })),
      leads: (leadsQuery.data ?? []).map((l) => ({
        id: l.id, quote_request_id: l.quote_request_id, status: l.status,
        viewed_at: l.viewed_at, contact_revealed: l.contact_revealed,
        contact_revealed_at: l.contact_revealed_at,
        contact_view_count: l.contact_view_count ?? 0, created_at: l.created_at,
      })),
      leadEvents: (leadEventsQuery.data ?? []).map((e) => ({
        lead_id: e.lead_id, quote_request_id: e.quote_request_id,
        event_type: e.event_type, created_at: e.created_at,
      })),
      maxDays: 60,
    });
  }, [quotes, leadsQuery.data, quoteEventsQuery.data, leadEventsQuery.data]);

  const fromLabel = useMemo(() => {
    if (dailySeries.length) return dailySeries[0].date;
    const d = rangeFrom(range); return d ? d.toISOString().slice(0, 10) : 'all';
  }, [dailySeries, range]);
  const toLabel = useMemo(() => {
    if (dailySeries.length) return dailySeries[dailySeries.length - 1].date;
    return new Date().toISOString().slice(0, 10);
  }, [dailySeries]);

  const handleExportDaily = () => {
    const headers = DAILY_OPS_CSV_HEADERS as unknown as string[];
    const csv = rowsToCsv(headers, dailySeries as unknown as Array<Record<string, unknown>>);
    downloadCsv(`qitaat-quote-operations-${fromLabel}-${toLabel}.csv`, csv);
  };

  const handleExportFollowUp = () => {
    const today = new Date().toISOString().slice(0, 10);
    const lastEventByQuote = new Map<string, { type: string; at: string }>();
    [...(quoteEventsQuery.data ?? [])].forEach((e) => {
      const cur = lastEventByQuote.get(e.quote_request_id);
      if (!cur || new Date(e.created_at).getTime() > new Date(cur.at).getTime()) {
        lastEventByQuote.set(e.quote_request_id, { type: e.event_type, at: e.created_at });
      }
    });
    const rows = metrics.attention.map((a) => {
      const ageHours = Math.round((Date.now() - new Date(a.quote.created_at).getTime()) / 3600000);
      const last = lastEventByQuote.get(a.quote.id);
      return {
        quote_id_short: `#${a.quote.id.slice(-6)}`,
        sector: SECTOR_LABEL_AR[a.quote.sector] ?? a.quote.sector,
        city: a.quote.city,
        status: QUOTE_STATUS_LABEL_AR[a.quote.status as QuoteStatus] ?? a.quote.status,
        reason: a.reason,
        request_age_hours: ageHours,
        last_event_type: last?.type ?? '',
        admin_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/admin/quote-requests/${a.quote.id}`,
      };
    });
    const headers = [
      'quote_id_short', 'sector', 'city', 'status', 'reason',
      'request_age_hours', 'last_event_type', 'admin_url',
    ];
    downloadCsv(`qitaat-follow-up-requests-${today}.csv`, rowsToCsv(headers, rows));
  };

  const pct = (num: number, den: number): string =>
    den === 0 ? '—' : `${Math.round(100 * num / den)}%`;

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5 max-w-7xl">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> لوحة تشغيل عروض الأسعار
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                تابع سرعة معالجة الطلبات، جودة المطابقة، وتفاعل المزودين من مكان واحد.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="7d">آخر 7 أيام</SelectItem>
                  <SelectItem value="30d">آخر 30 يوم</SelectItem>
                  <SelectItem value="90d">آخر 90 يوم</SelectItem>
                  <SelectItem value="all">كل الفترة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTOR_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="المدينة" /></SelectTrigger>
                <SelectContent>
                  {cityOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c === 'all' ? 'كل المدن' : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={refreshAll} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
              </Button>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={handleExportDaily} disabled={loading || dailySeries.length === 0}>
                <Download className="h-3.5 w-3.5" /> تصدير CSV
              </Button>
            </div>
          </div>

          {errored ? (
            <Card><CardContent className="py-10 text-center space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm">تعذر تحميل مؤشرات التشغيل حاليًا</p>
              <Button size="sm" variant="outline" onClick={refreshAll}>إعادة المحاولة</Button>
            </CardContent></Card>
          ) : loading && !baseQuotes.data ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Kpi label="إجمالي الطلبات" value={metrics.total} icon={<Sparkles className="h-4 w-4" />} />
                <Kpi label="جديدة" value={metrics.byStatus.new ?? 0} />
                <Kpi label="قيد المراجعة" value={metrics.byStatus.under_review ?? 0} />
                <Kpi label="موجّهة" value={metrics.byStatus.matched ?? 0} />
                <Kpi label="فيها مهتم" value={metrics.quotesWithInterest} />
                <Kpi label="تم التواصل" value={metrics.byStatus.contacted ?? 0} />
                <Kpi label="مكتملة" value={metrics.byStatus.completed ?? 0} />
                <Kpi label="ملغاة" value={metrics.byStatus.cancelled ?? 0} />
                <KpiText
                  label="متوسط وقت المطابقة"
                  value={fmtDuration(metrics.sla.ttMatch)}
                  tip="الوقت بين إنشاء الطلب وتوجيهه للمزودين."
                  icon={<Clock className="h-4 w-4" />}
                />
                <KpiText
                  label="متوسط أول مشاهدة"
                  value={fmtDuration(metrics.sla.ttView)}
                  tip="الوقت بين توجيه الفرصة للمزود وأول مشاهدة منه."
                  icon={<Clock className="h-4 w-4" />}
                />
              </div>

              {/* SLA detail row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SlaCard label="متوسط أول اهتمام" value={fmtDuration(metrics.sla.ttInterest)}
                  tip="الوقت بين إنشاء الفرصة وأول اهتمام من مزود." />
                <SlaCard label="متوسط إتاحة التواصل بعد الاهتمام" value={fmtDuration(metrics.sla.ttReveal)}
                  tip="الوقت بين إبداء المزود اهتمامه وإتاحة بيانات التواصل." />
                <SlaCard label="نسبة المطابقة الناجحة"
                  value={(metrics.matching.matchedQuotes + metrics.matching.failedQuotes) === 0 ? '—' :
                    `${Math.round(100 * metrics.matching.matchedQuotes / (metrics.matching.matchedQuotes + metrics.matching.failedQuotes))}%`}
                  tip="نسبة الطلبات التي وُجدت لها مزودون مطابقون." />
              </div>

              {/* Rates row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SlaCard label="معدل المطابقة"
                  value={pct(metrics.matching.matchedQuotes, metrics.total)}
                  tip="نسبة الطلبات التي تم توجيهها لمزودين." />
                <SlaCard label="معدل مشاهدة المزودين"
                  value={pct(metrics.providers.viewedLeads, metrics.providers.totalLeads)}
                  tip="نسبة الفرص التي شاهدها المزودون." />
                <SlaCard label="معدل الاهتمام"
                  value={pct(metrics.providers.interestedLeads, metrics.providers.totalLeads)}
                  tip="نسبة الفرص التي أبدى المزود اهتمامًا بها." />
                <SlaCard label="معدل إتاحة التواصل بعد الاهتمام"
                  value={pct(
                    (leadsQuery.data ?? []).filter((l) => l.contact_revealed).length,
                    metrics.providers.interestedLeads,
                  )}
                  tip="نسبة الفرص المهتمة التي أُتيحت بياناتها للمزود." />
              </div>

              {/* Trends section */}
              <Card><CardContent className="p-5 space-y-4">
                <div>
                  <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> اتجاهات التشغيل
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    راقب حركة الطلبات والمطابقة وتفاعل المزودين خلال الفترة المحددة.
                  </p>
                </div>
                {dailySeries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    لا توجد بيانات كافية لعرض الرسم خلال الفترة المحددة
                  </p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="حركة الطلبات اليومية">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="quotes_created" name="جديدة" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="quotes_matched" name="موجّهة" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="quotes_completed" name="مكتملة" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="تفاعل المزودين مع الفرص">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="leads_created" name="منشأة" fill="hsl(var(--primary))" />
                          <Bar dataKey="leads_viewed" name="مشاهدة" fill="hsl(var(--info))" />
                          <Bar dataKey="leads_interested" name="اهتمام" fill="hsl(var(--success))" />
                          <Bar dataKey="leads_not_interested" name="رفض" fill="hsl(var(--muted-foreground))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="متوسطات سرعة المعالجة (دقائق)" wide>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="avg_time_to_match_minutes" name="وقت المطابقة" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls />
                          <Line type="monotone" dataKey="avg_time_to_first_view_minutes" name="أول مشاهدة" stroke="hsl(var(--info))" strokeWidth={2} dot={false} connectNulls />
                          <Line type="monotone" dataKey="avg_time_to_first_interest_minutes" name="أول اهتمام" stroke="hsl(var(--success))" strokeWidth={2} dot={false} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>
                )}
              </CardContent></Card>

              {/* Attention */}
              <Card><CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" /> طلبات تحتاج متابعة
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tech-content">{metrics.attention.length}</span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleExportFollowUp} disabled={metrics.attention.length === 0}>
                      <Download className="h-3 w-3" /> تصدير قائمة المتابعة
                    </Button>
                  </div>
                </div>
                {metrics.attention.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد طلبات تحتاج متابعة في هذه الفترة.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {metrics.attention.map((a, i) => {
                      const ageMs = Date.now() - new Date(a.quote.created_at).getTime();
                      return (
                        <li key={`${a.quote.id}-${i}`} className="py-2.5 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground tech-content">#{a.quote.id.slice(-6)}</span>
                          <span className="text-xs text-muted-foreground">{SECTOR_LABEL_AR[a.quote.sector] ?? a.quote.sector} · {a.quote.city}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${a.tone}`}>{a.reason}</span>
                          <span className="text-[11px] text-muted-foreground tech-content">عمر: {fmtDuration(ageMs)}</span>
                          <span className="text-[10px] text-muted-foreground">{QUOTE_STATUS_LABEL_AR[a.quote.status as QuoteStatus] ?? a.quote.status}</span>
                          <Button size="sm" variant="ghost" asChild className="ms-auto h-7 text-xs">
                            <Link to={`/admin/quote-requests/${a.quote.id}`}>فتح <ArrowUpRight className="h-3 w-3" /></Link>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent></Card>

              {/* Matching performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card><CardContent className="p-5 space-y-3">
                  <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> أداء المطابقة
                  </h2>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="طلبات مُوجَّهة" value={metrics.matching.matchedQuotes} />
                    <Stat label="بدون مطابقة" value={metrics.matching.failedQuotes} />
                    <Stat label="متوسط مزودين/طلب" value={metrics.matching.avgLeadsPerQuote === null ? '—' : metrics.matching.avgLeadsPerQuote.toFixed(1)} />
                    <Stat label="متوسط درجة المطابقة" value={metrics.matching.avgScore === null ? '—' : Math.round(metrics.matching.avgScore)} />
                    <Stat label="أعلى درجة" value={metrics.matching.topScore ?? '—'} />
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">أكثر أسباب المطابقة تكرارًا</p>
                    {metrics.matching.topReasons.length === 0 ? (
                      <p className="text-xs text-muted-foreground">لا توجد بيانات كافية بعد.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {metrics.matching.topReasons.map(([r, n]) => (
                          <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground/80 border border-border">
                            {r} · <span className="tech-content">{n}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent></Card>

                <Card><CardContent className="p-5 space-y-3">
                  <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> تفاعل المزودين
                  </h2>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="إجمالي الفرص" value={metrics.providers.totalLeads} />
                    <Stat label="مشاهدات" value={metrics.providers.viewedLeads} />
                    <Stat label="اهتمام" value={metrics.providers.interestedLeads} />
                    <Stat label="غير مناسب" value={metrics.providers.notInterestedLeads} />
                    <Stat label="معدل المشاهدة" value={metrics.providers.viewRate === null ? '—' : `${Math.round(100 * metrics.providers.viewRate)}%`} />
                    <Stat label="معدل الاهتمام" value={metrics.providers.interestRate === null ? '—' : `${Math.round(100 * metrics.providers.interestRate)}%`} />
                    <Stat label="معدل الرفض" value={metrics.providers.rejectionRate === null ? '—' : `${Math.round(100 * metrics.providers.rejectionRate)}%`} />
                  </div>
                </CardContent></Card>
              </div>

              {/* Top providers */}
              <Card><CardContent className="p-5 space-y-3">
                <h2 className="font-heading font-semibold text-base">أعلى المزودين تفاعلًا</h2>
                {metrics.providers.topProviders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات كافية بعد.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="text-start">
                          <th className="text-start py-2 px-2">المزود</th>
                          <th className="text-start py-2 px-2">فرص</th>
                          <th className="text-start py-2 px-2">مشاهدات</th>
                          <th className="text-start py-2 px-2">مهتم</th>
                          <th className="text-start py-2 px-2">معدل الاهتمام</th>
                          <th className="text-start py-2 px-2">آخر نشاط</th>
                          <th className="text-end py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.providers.topProviders.map((p) => (
                          <tr key={p.id} className="border-t border-border">
                            <td className="py-2 px-2 font-medium truncate max-w-[200px]">{p.name}</td>
                            <td className="py-2 px-2 tech-content">{p.received}</td>
                            <td className="py-2 px-2 tech-content">{p.viewed}</td>
                            <td className="py-2 px-2 tech-content">{p.interested}</td>
                            <td className="py-2 px-2 tech-content">{p.received ? `${Math.round(100 * p.interested / p.received)}%` : '—'}</td>
                            <td className="py-2 px-2 tech-content text-muted-foreground">
                              {p.lastActive ? new Date(p.lastActive).toLocaleDateString('ar-SA-u-nu-latn') : '—'}
                            </td>
                            <td className="py-2 px-2 text-end">
                              <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
                                <Link to={`/admin/businesses?id=${p.id}`}>فتح</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent></Card>
            </>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

const Kpi: React.FC<{ label: string; value: number; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <Card><CardContent className="p-3">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      {icon && <span className="text-muted-foreground">{icon}</span>}
    </div>
    <div className="text-xl font-bold tech-content mt-1">{value}</div>
  </CardContent></Card>
);

const KpiText: React.FC<{ label: string; value: string; tip?: string; icon?: React.ReactNode }> = ({ label, value, tip, icon }) => (
  <Card><CardContent className="p-3">
    <div className="flex items-center justify-between gap-1">
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
        {label}
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild><span><Info className="h-3 w-3 text-muted-foreground/70" /></span></TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs">{tip}</TooltipContent>
          </Tooltip>
        )}
      </span>
      {icon && <span className="text-muted-foreground">{icon}</span>}
    </div>
    <div className="text-base font-bold mt-1">{value}</div>
  </CardContent></Card>
);

const SlaCard: React.FC<{ label: string; value: string; tip?: string }> = ({ label, value, tip }) => (
  <Card><CardContent className="p-4">
    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
      {label}
      {tip && (
        <Tooltip>
          <TooltipTrigger asChild><span><Info className="h-3 w-3 text-muted-foreground/70" /></span></TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs">{tip}</TooltipContent>
        </Tooltip>
      )}
    </div>
    <div className="text-lg font-bold mt-1">{value}</div>
  </CardContent></Card>
);

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-md border border-border bg-muted/30 p-2">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="text-base font-bold tech-content">{value}</div>
  </div>
);

const ChartCard: React.FC<{ title: string; wide?: boolean; children: React.ReactNode }> = ({ title, wide, children }) => (
  <div className={`rounded-lg border border-border bg-card/50 p-3 ${wide ? 'lg:col-span-2' : ''}`}>
    <p className="text-xs font-medium text-foreground/80 mb-2">{title}</p>
    {children}
  </div>
);

export default AdminQuoteOperations;