import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  listAdminOpsQuoteRequests,
  listAdminOpsQuoteRequestLeads,
  listAdminOpsQuoteRequestEvents,
  listAdminOpsQuoteRequestLeadEvents,
} from '@/modules/quotes';
import { Activity, AlertCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { QUOTE_STATUS_LABEL_AR, SECTOR_LABEL_AR, type QuoteStatus } from '@/lib/quoteRequests';
import {
  buildDailyQuoteOperationsSeries, rowsToCsv, downloadCsv, DAILY_OPS_CSV_HEADERS,
} from '@/lib/quoteOperationsAggregation';
import {
  QuoteOperationsFiltersBar,
  QuoteOperationsCsvExportButton,
  QuoteOperationsStatsSection,
  QuoteOperationsChartsSection,
  QuoteOperationsAttentionSection,
  QuoteOperationsMatchingSection,
  QuoteOperationsTableSection,
  type QuoteOperationsRange,
} from '@/components/admin/procurement/operations';

type Range = QuoteOperationsRange;

interface QuoteRow {
  id: string; ref_id: string | null; sector: string; city: string; status: string; created_at: string;
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
        quote_ref: a.quote.ref_id ?? `#${a.quote.id.slice(-6)}`,
        sector: SECTOR_LABEL_AR[a.quote.sector] ?? a.quote.sector,
        city: a.quote.city,
        status: QUOTE_STATUS_LABEL_AR[a.quote.status as QuoteStatus] ?? a.quote.status,
        reason: a.reason,
        request_age_hours: ageHours,
        last_event_type: last?.type ?? '',
        admin_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/admin/quote-requests/${a.quote.ref_id ?? a.quote.id}`,
      };
    });
    const headers = [
      'quote_ref', 'sector', 'city', 'status', 'reason',
      'request_age_hours', 'last_event_type', 'admin_url',
    ];
    downloadCsv(`qitaat-follow-up-requests-${today}.csv`, rowsToCsv(headers, rows));
  };


  const revealedCount = useMemo(
    () => (leadsQuery.data ?? []).filter((l) => l.contact_revealed).length,
    [leadsQuery.data],
  );

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5 max-w-7xl">
          <AdminPageHeader
            icon={Activity}
            tone="primary"
            title="لوحة تشغيل عروض الأسعار"
            subtitle="تابع سرعة معالجة الطلبات، جودة المطابقة، وتفاعل المزودين من مكان واحد."
            actions={(
              <QuoteOperationsFiltersBar
                range={range}
                onRangeChange={setRange}
                sector={sector}
                onSectorChange={setSector}
                sectorOptions={SECTOR_OPTIONS}
                city={city}
                onCityChange={setCity}
                cityOptions={cityOptions}
                onRefresh={refreshAll}
                refreshDisabled={loading}
                refreshSpinning={loading}
                exportSlot={
                  <QuoteOperationsCsvExportButton
                    label="تصدير CSV"
                    onClick={handleExportDaily}
                    disabled={loading || dailySeries.length === 0}
                    className="h-9 text-xs"
                  />
                }
              />
            )}
          />

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
              <QuoteOperationsStatsSection metrics={metrics} revealedCount={revealedCount} />
              <QuoteOperationsChartsSection dailySeries={dailySeries} />
              <QuoteOperationsAttentionSection
                items={metrics.attention}
                onExportFollowUp={handleExportFollowUp}
              />
              <QuoteOperationsMatchingSection
                matching={metrics.matching}
                providers={metrics.providers}
              />
              <QuoteOperationsTableSection rows={metrics.providers.topProviders} />
            </>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default AdminQuoteOperations;
