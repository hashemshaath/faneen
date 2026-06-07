import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Inbox, Search, RefreshCw, ChevronDown, ChevronUp, Download,
  Sparkles, Clock, FileCheck2, TrendingUp, Flame, ArrowUpDown, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LeadStatusBadge, type LeadStatus } from '@/components/leads/LeadStatusBadge';
import { LeadDetailPanel, type LeadRow } from '@/components/leads/LeadDetailPanel';
import { trackEvent } from '@/lib/analytics-events';
import { listProviderLeadRequests } from '@/modules/leads/services/detail';
import { updateLeadRequestStatus } from '@/modules/leads/services/mutations';
import { checkLeadTransition, leadActionFromTargetStatus } from '@/modules/leads/services/lifecycle';
import { notifyCustomerLeadUpdate } from '@/modules/leads/services/notifyCustomerLeadUpdate';
import { createOrGetLeadConversation } from '@/modules/leads/services/createOrGetLeadConversation';
import { getManagedBusinessesForUser } from '@/modules/leads/services/getManagedBusinessesForUser';
import { LegacyReferenceHint } from '@/components/reference/LegacyReferenceHint';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/shared';

const FILTERS: Array<{ key: 'all' | LeadStatus; ar: string; en: string }> = [
  { key: 'all',        ar: 'الكل',           en: 'All' },
  { key: 'new',        ar: 'جديد',           en: 'New' },
  { key: 'viewed',     ar: 'تمت المشاهدة',    en: 'Viewed' },
  { key: 'needs_info', ar: 'بحاجة معلومات',   en: 'Needs info' },
  { key: 'accepted',   ar: 'مقبول',           en: 'Accepted' },
  { key: 'quoted',     ar: 'تم إرسال عرض',    en: 'Quoted' },
  { key: 'rejected',   ar: 'مرفوض',           en: 'Rejected' },
  { key: 'closed',     ar: 'مغلق',            en: 'Closed' },
];

type SortKey = 'newest' | 'oldest' | 'priority' | 'value';
const PRIORITY_RANK: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

function safeTrack(event: Parameters<typeof trackEvent>[0], payload: Parameters<typeof trackEvent>[1]) {
  try { trackEvent(event, payload); } catch { /* analytics must not throw */ }
}

function startOfToday(): number {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}

function exportLeadsCsv(rows: LeadRow[], businessNameMap: Map<string, string>): void {
  const headers = [
    'ref_id', 'business', 'status', 'priority', 'name', 'email', 'phone',
    'subject', 'budget_range', 'quote_amount', 'quote_currency',
    'created_at', 'responded_at', 'quoted_at', 'converted_contract_id',
  ];
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => [
      r.ref_id ?? '',
      businessNameMap.get(r.business_id) ?? '',
      r.status, r.priority, r.name, r.email, r.phone ?? '',
      r.subject ?? '', r.budget_range ?? '',
      (r as unknown as { quote_amount?: number | string | null }).quote_amount ?? '',
      (r as unknown as { quote_currency?: string | null }).quote_currency ?? '',
      r.created_at,
      (r as unknown as { responded_at?: string | null }).responded_at ?? '',
      (r as unknown as { quoted_at?: string | null }).quoted_at ?? '',
      (r as unknown as { converted_contract_id?: string | null }).converted_contract_id ?? '',
    ].map(esc).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qitaat-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const DashboardLeads: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');
  const [searchParams] = useSearchParams();

  // WORKSPACE-CONTEXT-4D: provider leads are staff-safe today —
  // `getManagedBusinessesForUser` already returns owner + active
  // manager memberships and `listProviderLeadRequests` is keyed by
  // those business ids (RLS stays authoritative). When the user picks
  // a specific workspace entity, narrow the lead query to that entity
  // only; otherwise fall back to all managed businesses so multi-
  // business owners and single-business users keep current behavior.
  // `active_location_id` is intentionally NOT applied — leads have no
  // branch column today.
  const { active_entity_id } = useActiveWorkspace();

  // Resolve user's businesses (owner or manager)
  const { data: bizIds } = useQuery({
    queryKey: ['my-managed-businesses', user?.id],
    enabled: !!user?.id,
    queryFn: () => getManagedBusinessesForUser(user!.id),
  });

  const businessNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (bizIds ?? []).forEach((b) => m.set(b.id, (isRTL ? b.name_ar : b.name_en) ?? b.name_ar ?? b.name_en ?? ''));
    return m;
  }, [bizIds, isRTL]);

  const allIds = (bizIds ?? []).map((b) => b.id);
  const ids = useMemo(() => {
    if (active_entity_id && allIds.includes(active_entity_id)) {
      return [active_entity_id];
    }
    return allIds;
  }, [active_entity_id, allIds]);

  // Always pull the full window (filter is applied client-side so we can
  // compute live counts, KPI strip, and sparkline accurately).
  const { data: leads, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['provider-leads', ids.join(','), active_entity_id],
    enabled: ids.length > 0,
    queryFn: () =>
      listProviderLeadRequests(ids, 'all') as unknown as Promise<LeadRow[]>,
  });

  // Per-status counts for filter pills (computed from the full window).
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: leads?.length ?? 0 };
    for (const l of leads ?? []) m[l.status] = (m[l.status] ?? 0) + 1;
    return m;
  }, [leads]);

  // KPIs
  const kpis = useMemo(() => {
    const list = leads ?? [];
    const today0 = startOfToday();
    const todayNew = list.filter((l) => new Date(l.created_at).getTime() >= today0).length;
    const awaiting = list.filter((l) => l.status === 'new' || l.status === 'viewed' || l.status === 'needs_info').length;
    const quoted = list.filter((l) => l.status === 'quoted').length;
    const converted = list.filter((l) => !!(l as unknown as { converted_contract_id?: string | null }).converted_contract_id).length;
    const convRate = list.length ? (converted / list.length) * 100 : 0;
    // Average first-response time (created_at → responded_at) in hours.
    const responded = list.filter((l) => (l as unknown as { responded_at?: string | null }).responded_at);
    const avgHours = responded.length
      ? responded.reduce((sum, l) => {
          const r = (l as unknown as { responded_at: string }).responded_at;
          return sum + (new Date(r).getTime() - new Date(l.created_at).getTime()) / 3_600_000;
        }, 0) / responded.length
      : null;
    return { total: list.length, todayNew, awaiting, quoted, converted, convRate, avgHours };
  }, [leads]);

  // 30-day sparkline buckets
  const sparkline = useMemo(() => {
    const buckets: { d: string; count: number }[] = [];
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now); day.setDate(day.getDate() - i);
      buckets.push({ d: day.toISOString().slice(0, 10), count: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.d, i]));
    for (const l of leads ?? []) {
      const k = l.created_at.slice(0, 10);
      const j = idx.get(k); if (j !== undefined) buckets[j].count++;
    }
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, max };
  }, [leads]);

  // Apply status filter + search + sort
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = (leads ?? []).slice();
    if (filter !== 'all') list = list.filter((l) => l.status === filter);
    if (s) {
      list = list.filter((l) =>
        (l.ref_id ?? '').toLowerCase().includes(s) ||
        ((l as unknown as { legacy_ref_id?: string | null }).legacy_ref_id ?? '').toLowerCase().includes(s) ||
        (l.name ?? '').toLowerCase().includes(s) ||
        (l.subject ?? '').toLowerCase().includes(s) ||
        (l.email ?? '').toLowerCase().includes(s) ||
        (l.phone ?? '').toLowerCase().includes(s),
      );
    }
    list.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'priority': {
          const pa = PRIORITY_RANK[a.priority] ?? 0;
          const pb = PRIORITY_RANK[b.priority] ?? 0;
          if (pa !== pb) return pb - pa;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case 'value': {
          const va = Number((a as unknown as { quote_amount?: number | string | null }).quote_amount ?? 0);
          const vb = Number((b as unknown as { quote_amount?: number | string | null }).quote_amount ?? 0);
          if (va !== vb) return vb - va;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [leads, search, filter, sort]);

  // Realtime: refetch on any change to lead_requests for my businesses, and
  // toast when a brand-new lead arrives so the provider notices immediately.
  useEffect(() => {
    if (ids.length === 0) return;
    const ch = supabase
      .channel(`provider-leads-${ids.join('-').slice(0, 24)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_requests', filter: `business_id=in.(${ids.join(',')})` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.success(isRTL ? 'وصل طلب جديد' : 'New service request received', { duration: 4000 });
        }
        qc.invalidateQueries({ queryKey: ['provider-leads'] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [ids, qc, isRTL]);

  // Deep-link: ?ref=LR-... or ?id=<uuid> auto-opens the matching lead.
  useEffect(() => {
    if (!leads?.length) return;
    const ref = searchParams.get('ref');
    const id = searchParams.get('id');
    if (!ref && !id) return;
    const match = leads.find((l) => (id && l.id === id) || (ref && (l.ref_id === ref || (l as unknown as { legacy_ref_id?: string | null }).legacy_ref_id === ref)));
    if (match) {
      setOpenId(match.id);
      setFilter('all');
      setTimeout(() => {
        const el = document.getElementById(`lead-card-${match.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, [leads, searchParams]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: LeadStatus }) => {
      await updateLeadRequestStatus(id, next);
      // Fire-and-forget lifecycle notifier — must not block the optimistic UX.
      try {
        await notifyCustomerLeadUpdate({ lead_id: id, status: next });
      } catch { /* fail-soft */ }
      // SR-3A: when provider engages, ensure a conversation exists so both
      // sides can chat. Fail-soft — never block status update.
      if (next === 'accepted' || next === 'needs_info') {
        try {
          const lead = leads?.find((l) => l.id === id);
          if (lead?.user_id) {
            const { data: convId } = await createOrGetLeadConversation({ _lead_id: id });
            if (convId) {
              safeTrack('service_request_conversation_created', {
                source_page: 'dashboard_leads',
                outcome: next,
                is_authenticated: true,
                has_budget: !!lead?.budget_range,
              } as Parameters<typeof trackEvent>[1]);
            }
          }
        } catch { /* fail-soft */ }
      }
      return next;
    },
    onMutate: ({ id }) => setPendingId(id),
    onSuccess: (next, { id }) => {
      const lead = leads?.find((l) => l.id === id);
      const eventMap: Partial<Record<string, string>> = {
        viewed: 'service_request_viewed',
        accepted: 'service_request_accepted',
        rejected: 'service_request_rejected',
        needs_info: 'service_request_needs_info',
        closed: 'service_request_closed',
      };
      const ev = eventMap[next];
      if (ev) {
        safeTrack(ev as Parameters<typeof trackEvent>[0], {
          source_page: 'dashboard_leads',
          outcome: next,
          has_budget: !!lead?.budget_range,
        } as Parameters<typeof trackEvent>[1]);
      }
      toast.success(isRTL ? 'تم تحديث حالة الطلب' : 'Request status updated');
      qc.invalidateQueries({ queryKey: ['provider-leads'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast.error(isRTL ? `تعذر التحديث: ${msg}` : `Update failed: ${msg}`);
    },
    onSettled: () => setPendingId(null),
  });

  const handleAction = (id: string, next: LeadStatus) => {
    // BUSINESS-OPERATIONS-1C: Additive client-side lifecycle guard.
    // Only gates low-risk archive/lost transitions; other actions are
    // unaffected. Server-side RLS remains authoritative.
    const action = leadActionFromTargetStatus(next);
    if (action) {
      const current = leads?.find((l) => l.id === id)?.status;
      const check = checkLeadTransition(current, action);
      if (!check.allowed) {
        toast.error(isRTL ? check.reasonAr! : check.reasonEn!);
        return;
      }
    }
    updateStatus.mutate({ id, next });
  };

  const ensureConversation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await createOrGetLeadConversation({ _lead_id: id });
      if (error) throw error;
      return data as string;
    },
    onMutate: (id) => setPendingId(id),
    onSuccess: (convId, id) => {
      const lead = leads?.find((l) => l.id === id);
      safeTrack('service_request_conversation_opened', {
        source_page: 'dashboard_leads',
        outcome: lead?.status ?? 'unknown',
        is_authenticated: true,
      } as Parameters<typeof trackEvent>[1]);
      qc.invalidateQueries({ queryKey: ['provider-leads'] });
      window.location.assign(`/dashboard/messages?conversation=${convId}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to open conversation';
      toast.error(isRTL ? `تعذر فتح المحادثة: ${msg}` : `Could not open conversation: ${msg}`);
    },
    onSettled: () => setPendingId(null),
  });

  // SR-3B: Send a quote — updates lead_requests with quote fields and status=quoted.
  const sendQuote = useMutation({
    mutationFn: async (input: { id: string; amount: number; currency: 'SAR'; note: string | null; valid_until: string | null }) => {
      await updateLeadRequestStatus(input.id, 'quoted', {
        quote_amount: input.amount,
        quote_currency: input.currency,
        quote_note: input.note,
        quote_valid_until: input.valid_until,
      });
      // Lifecycle email + in-app notification (fail-soft).
      try {
        await notifyCustomerLeadUpdate({ lead_id: input.id, status: 'quoted' });
      } catch { /* fail-soft */ }
      // Ensure conversation exists for registered customer (fail-soft).
      const lead = leads?.find((l) => l.id === input.id);
      if (lead?.user_id) {
        try { await createOrGetLeadConversation({ _lead_id: input.id }); } catch { /* fail-soft */ }
      }
      return input;
    },
    onMutate: ({ id }) => setPendingId(id),
    onSuccess: (input) => {
      const lead = leads?.find((l) => l.id === input.id);
      const validityBucket: 'none' | '1-7d' | '8-30d' | '30d_plus' = (() => {
        if (!input.valid_until) return 'none';
        const days = Math.ceil((new Date(input.valid_until).getTime() - Date.now()) / 86_400_000);
        if (days <= 7) return '1-7d';
        if (days <= 30) return '8-30d';
        return '30d_plus';
      })();
      safeTrack('service_request_quoted', {
        source_page: 'dashboard_leads',
        outcome: 'quoted',
        has_budget: !!lead?.budget_range,
        has_quote_amount: true,
        quote_validity_bucket: validityBucket,
      } as Parameters<typeof trackEvent>[1]);
      toast.success(isRTL ? 'تم إرسال عرض السعر' : 'Quote sent');
      qc.invalidateQueries({ queryKey: ['provider-leads'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to send quote';
      toast.error(isRTL ? `تعذر الإرسال: ${msg}` : `Could not send quote: ${msg}`);
    },
    onSettled: () => setPendingId(null),
  });

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          icon={Inbox}
          tone="primary"
          eyebrow={isRTL ? 'الواردات' : 'Inbox'}
          title={isRTL ? 'طلبات الخدمة' : 'Service Requests'}
          subtitle={isRTL ? 'استقبل وأدر طلبات العملاء لمنشآتك' : 'Receive and manage customer requests for your businesses'}
          actions={
            <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowUpDown className="h-4 w-4" />
                  {isRTL ? 'فرز' : 'Sort'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[180px]">
                <DropdownMenuLabel>{isRTL ? 'ترتيب القائمة' : 'Order list by'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {([
                  ['newest',   isRTL ? 'الأحدث أولاً'        : 'Newest first'],
                  ['oldest',   isRTL ? 'الأقدم أولاً'         : 'Oldest first'],
                  ['priority', isRTL ? 'الأولوية (عالية أولاً)' : 'Priority (high first)'],
                  ['value',    isRTL ? 'قيمة العرض (أعلى أولاً)' : 'Quote value (high first)'],
                ] as const).map(([k, label]) => (
                  <DropdownMenuItem key={k} onClick={() => setSort(k)} className={sort === k ? 'bg-muted font-semibold' : ''}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => exportLeadsCsv(filtered, businessNameMap)}
              disabled={!filtered.length}
            >
              <Download className="h-4 w-4" />
              <span>{isRTL ? 'تصدير CSV' : 'Export CSV'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label={isRTL ? 'تحديث' : 'Refresh'} className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isRTL ? 'تحديث' : 'Refresh'}</span>
            </Button>
            </>
          }
        />

        {/* KPI strip — real-data only, hidden until we know there are managed businesses. */}
        {ids.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { icon: Inbox,      tone: 'text-foreground',  label: isRTL ? 'الإجمالي'        : 'Total',          value: kpis.total },
              { icon: Sparkles,   tone: 'text-primary',     label: isRTL ? 'جديد اليوم'      : 'New today',      value: kpis.todayNew },
              { icon: Clock,      tone: 'text-warning',     label: isRTL ? 'بانتظار الرد'    : 'Awaiting reply', value: kpis.awaiting },
              { icon: FileCheck2, tone: 'text-primary',     label: isRTL ? 'عروض مرسلة'      : 'Quoted',         value: kpis.quoted },
              { icon: Flame,      tone: 'text-success',     label: isRTL ? 'تحوّلت لعقود'   : 'Converted',      value: kpis.converted },
              { icon: TrendingUp, tone: 'text-success',     label: isRTL ? 'معدّل التحويل'  : 'Conv. rate',     value: `${kpis.convRate.toFixed(1)}%` },
            ].map((k) => (
              <Card key={k.label} className="hover-lift">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <k.icon className="h-3 w-3" />{k.label}
                  </div>
                  <div className={`mt-1 text-xl font-heading font-bold tech-content ${k.tone}`}>{k.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 30-day sparkline + avg response time */}
        {ids.length > 0 && kpis.total > 0 && (
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  {isRTL ? 'الطلبات خلال 30 يومًا' : 'Requests · last 30 days'}
                </div>
                <svg viewBox="0 0 300 48" preserveAspectRatio="none" className="w-full h-12" aria-hidden="true">
                  {sparkline.buckets.map((b, i) => {
                    const w = 300 / sparkline.buckets.length;
                    const h = (b.count / sparkline.max) * 44;
                    return (
                      <rect
                        key={b.d}
                        x={i * w + 1}
                        y={48 - h - 2}
                        width={Math.max(1, w - 2)}
                        height={Math.max(1, h)}
                        rx={1.5}
                        className="fill-primary/60"
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="shrink-0 rounded-xl border bg-muted/30 px-4 py-2.5 min-w-[160px]">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {isRTL ? 'متوسط زمن الرد' : 'Avg response time'}
                </div>
                <div className="mt-0.5 text-lg font-heading font-bold tech-content">
                  {kpis.avgHours === null
                    ? '—'
                    : kpis.avgHours < 1
                      ? (isRTL ? `${Math.round(kpis.avgHours * 60)} دقيقة` : `${Math.round(kpis.avgHours * 60)} min`)
                      : kpis.avgHours < 48
                        ? (isRTL ? `${kpis.avgHours.toFixed(1)} ساعة` : `${kpis.avgHours.toFixed(1)} h`)
                        : (isRTL ? `${(kpis.avgHours / 24).toFixed(1)} يوم` : `${(kpis.avgHours / 24).toFixed(1)} d`)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL
                ? 'ابحث بالرقم التعريفي، الاسم، الموضوع، البريد، أو الجوال'
                : 'Search by ref ID, name, subject, email, or phone'}
              className="ps-9 h-11"
              dir="auto"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'outline'}
              onClick={() => setFilter(f.key)}
              className="min-h-[40px] gap-1.5"
            >
              <span>{isRTL ? f.ar : f.en}</span>
              <span className={`tech-content text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {counts[f.key] ?? 0}
              </span>
            </Button>
          ))}
        </div>

        {ids.length === 0 && !isLoading && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            {isRTL ? 'لا توجد منشأة مرتبطة بحسابك بعد.' : 'No business linked to your account yet.'}
          </CardContent></Card>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[0,1,2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        )}

        {!isLoading && ids.length > 0 && filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا توجد طلبات مطابقة' : 'No matching requests'}
            </p>
          </CardContent></Card>
        )}

        <div className="space-y-3">
          {filtered.map((lead) => {
            const open = openId === lead.id;
            const convertedContractId = (lead as unknown as { converted_contract_id?: string | null }).converted_contract_id ?? null;
            return (
              <Card key={lead.id} id={`lead-card-${lead.id}`} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : lead.id)}
                    className="w-full text-start p-4 sm:p-5 flex flex-wrap items-center gap-3 hover:bg-muted/40 transition-colors min-h-[64px]"
                    aria-expanded={open}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground tech-content">{lead.ref_id ?? '—'}</span>
                        <LegacyReferenceHint legacyRefId={(lead as { legacy_ref_id?: string | null }).legacy_ref_id ?? null} isRTL={isRTL} />
                        <LeadStatusBadge status={lead.status} />
                        {lead.priority && lead.priority !== 'normal' && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">{lead.priority}</span>
                        )}
                        {convertedContractId && (
                          <Link
                            to={`/contracts/${convertedContractId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30 inline-flex items-center gap-1 hover:bg-success/20"
                          >
                            <Link2 className="h-3 w-3" />
                            {isRTL ? 'عقد مرتبط' : 'Contract'}
                          </Link>
                        )}
                      </div>
                      <div className="font-medium truncate">{lead.subject || lead.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {businessNameMap.get(lead.business_id) ?? ''} · {new Date(lead.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                      </div>
                    </div>
                    {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {open && (
                    <div className="p-4 sm:p-5 border-t border-border">
                      <LeadDetailPanel
                        lead={{ ...lead, business_name: businessNameMap.get(lead.business_id) ?? null }}
                        pending={pendingId === lead.id}
                        onAction={(next) => handleAction(lead.id, next)}
                        onOpenConversation={() => ensureConversation.mutate(lead.id)}
                        onSendQuote={(input) => sendQuote.mutate({ id: lead.id, ...input })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardLeads;