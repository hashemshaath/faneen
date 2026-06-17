import React, { useMemo, useState, useCallback, useDeferredValue, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBusinessesForMyRequests } from '@/modules/leads/services/getBusinessesForMyRequests';
import {
  listMyLeadRequests,
  listMyQuoteRequests,
  countQuoteRequestFiles,
} from '@/modules/leads/services/list';
import { updateLeadRequestStatus } from '@/modules/leads/services/mutations';
import { notifyCustomerLeadUpdate } from '@/modules/leads/services/notifyCustomerLeadUpdate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { KpiStrip } from '@/components/dashboard/KpiCard';
import {
  Inbox, ChevronDown, ChevronUp, Send, Eye, HelpCircle, CheckCircle2,
  XCircle, Archive, X, Wallet, FileText, MessageSquare, Loader2, ReceiptText, Calendar,
  Paperclip, MapPin, Tag, Search, Plus, RefreshCw, Download, ArrowUpDown, Rows3, LayoutGrid, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { trackEvent } from '@/lib/analytics-events';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { ReferenceLinkCopy } from '@/components/reference/ReferenceLinkCopy';
import { PageHeader } from '@/components/shared';
import { supabase } from '@/integrations/supabase/client';

interface MyLeadRow {
  id: string;
  ref_id: string | null;
  business_id: string;
  user_id: string | null;
  subject: string | null;
  status: string;
  contact_preference: string | null;
  budget_range: string | null;
  project_scope: string | null;
  created_at: string;
  updated_at: string | null;
  viewed_at: string | null;
  needs_info_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  conversation_id: string | null;
  quoted_at: string | null;
  quote_amount: number | string | null;
  quote_currency: string | null;
  quote_note: string | null;
  quote_valid_until: string | null;
}

function safeTrack(event: Parameters<typeof trackEvent>[0], payload: Parameters<typeof trackEvent>[1]) {
  try { trackEvent(event, payload); } catch { /* analytics must not throw */ }
}

const CANCELLABLE = new Set(['new', 'viewed', 'needs_info']);

interface QuoteRequestRow {
  id: string;
  ref_id: string | null;
  sector: string;
  city: string;
  district: string | null;
  project_description: string;
  status: string;
  preferred_contact_method: string;
  created_at: string;
  updated_at: string;
}

const QUOTE_STATUS_LABEL_AR: Record<string, string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  matched: 'تم توجيهه لمزودين',
  contacted: 'تم التواصل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};
const QUOTE_STATUS_LABEL_EN: Record<string, string> = {
  new: 'New',
  under_review: 'Under review',
  matched: 'Matched',
  contacted: 'Contacted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const QUOTE_STATUS_TONE: Record<string, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  under_review: 'bg-warning/10 text-warning border-warning/30',
  matched: 'bg-info/10 text-info border-info/30',
  contacted: 'bg-success/10 text-success border-success/30',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

type SortKey = 'newest' | 'oldest' | 'updated' | 'status';
type Density = 'comfortable' | 'compact';

const STORAGE_KEY_SORT = 'qitaat_my_requests_sort_v1';
const STORAGE_KEY_DENSITY = 'qitaat_my_requests_density_v1';

function formatRelative(iso: string | null, isRTL: boolean): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const diff = (Date.now() - date.getTime()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(isRTL ? 'ar' : 'en', { numeric: 'auto' });
  if (abs < 60) return rtf.format(-Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (abs < 604800) return rtf.format(-Math.round(diff / 86400), 'day');
  if (abs < 2592000) return rtf.format(-Math.round(diff / 604800), 'week');
  if (abs < 31536000) return rtf.format(-Math.round(diff / 2592000), 'month');
  return rtf.format(-Math.round(diff / 31536000), 'year');
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = String(value).replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const bom = '\uFEFF'; // for Arabic in Excel
  const csv = bom + rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const DashboardMyRequests: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'quotes' | 'leads'>('quotes');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const deferredSearch = useDeferredValue(search);
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    if (typeof window === 'undefined') return 'newest';
    return (localStorage.getItem(STORAGE_KEY_SORT) as SortKey | null) ?? 'newest';
  });
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    return (localStorage.getItem(STORAGE_KEY_DENSITY) as Density | null) ?? 'comfortable';
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY_SORT, sortBy); } catch { /* ignore */ } }, [sortBy]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY_DENSITY, density); } catch { /* ignore */ } }, [density]);

  const { data: leads, isLoading, isFetching: leadsFetching, refetch: refetchLeads } = useQuery({
    queryKey: ['my-service-requests', user?.id],
    enabled: !!user?.id,
    queryFn: () => listMyLeadRequests(user!.id) as unknown as Promise<MyLeadRow[]>,
  });

  const { data: quoteRequests, isLoading: loadingQuotes, isFetching: quotesFetching, refetch: refetchQuotes } = useQuery({
    queryKey: ['my-quote-requests', user?.id],
    enabled: !!user?.id,
    queryFn: () => listMyQuoteRequests(user!.id) as unknown as Promise<QuoteRequestRow[]>,
  });

  const quoteIds = useMemo(() => (quoteRequests ?? []).map((q) => q.id), [quoteRequests]);
  const { data: quoteFileCounts } = useQuery({
    queryKey: ['my-quote-file-counts', user?.id, quoteIds.join(',')],
    enabled: quoteIds.length > 0,
    queryFn: () => countQuoteRequestFiles(quoteIds),
  });

  const businessIds = useMemo(
    () => Array.from(new Set((leads ?? []).map((l) => l.business_id))).filter(Boolean),
    [leads],
  );

  const { data: businesses } = useQuery({
    queryKey: ['my-requests-businesses', user?.id, businessIds.join(',')],
    enabled: businessIds.length > 0,
    queryFn: () => getBusinessesForMyRequests(businessIds),
  });

  const businessMap = useMemo(() => {
    const m = new Map<string, { name: string; username: string | null }>();
    (businesses ?? []).forEach((b) => {
      const name = (isRTL ? b.name_ar : b.name_en) ?? b.name_ar ?? b.name_en ?? '—';
      m.set(b.id, { name, username: b.username ?? null });
    });
    return m;
  }, [businesses, isRTL]);

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await updateLeadRequestStatus(id, 'cancelled');
      try {
        await notifyCustomerLeadUpdate({ lead_id: id, status: 'cancelled' });
      } catch { /* fail-soft */ }
    },
    onMutate: (id) => setPendingId(id),
    onSuccess: (_void, id) => {
      const lead = leads?.find((l) => l.id === id);
      safeTrack('service_request_cancelled', {
        source_page: 'dashboard_my_requests',
        outcome: 'cancelled',
        has_budget: !!lead?.budget_range,
      } as Parameters<typeof trackEvent>[1]);
      toast.success(isRTL ? 'تم إلغاء الطلب' : 'Request cancelled');
      qc.invalidateQueries({ queryKey: ['my-service-requests'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Cancel failed';
      toast.error(isRTL ? `تعذر الإلغاء: ${msg}` : `Cancel failed: ${msg}`);
    },
    onSettled: () => setPendingId(null),
  });

  const handleToggle = useCallback((id: string) => {
    setOpenId((curr) => {
      if (curr === id) return null;
      safeTrack('service_request_customer_viewed', {
        source_page: 'dashboard_my_requests',
      } as Parameters<typeof trackEvent>[1]);
      return id;
    });
  }, []);

  // === Derived: KPI counters ===
  const kpis = useMemo(() => {
    const q = quoteRequests ?? [];
    const l = leads ?? [];
    const activeQuote = q.filter((x) => !['completed', 'cancelled'].includes(x.status)).length;
    const activeLead = l.filter((x) => !['cancelled', 'closed', 'rejected'].includes(x.status)).length;
    const quoted = l.filter((x) => x.status === 'quoted').length;
    return { totalQ: q.length, totalL: l.length, activeQuote, activeLead, quoted };
  }, [quoteRequests, leads]);

  // === Filters ===
  const quoteStatuses = useMemo(() => {
    const set = new Set<string>((quoteRequests ?? []).map((q) => q.status));
    return ['all', ...Array.from(set)];
  }, [quoteRequests]);
  const leadStatuses = useMemo(() => {
    const set = new Set<string>((leads ?? []).map((l) => l.status));
    return ['all', ...Array.from(set)];
  }, [leads]);

  const filteredQuotes = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return (quoteRequests ?? []).filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (!term) return true;
      return (
        (q.ref_id ?? '').toLowerCase().includes(term) ||
        (q.project_description ?? '').toLowerCase().includes(term) ||
        (q.sector ?? '').toLowerCase().includes(term) ||
        (q.city ?? '').toLowerCase().includes(term)
      );
    });
  }, [quoteRequests, statusFilter, deferredSearch]);

  const filteredLeads = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return (leads ?? []).filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!term) return true;
      const biz = businessMap.get(l.business_id);
      return (
        (l.ref_id ?? '').toLowerCase().includes(term) ||
        (l.subject ?? '').toLowerCase().includes(term) ||
        (biz?.name ?? '').toLowerCase().includes(term)
      );
    });
  }, [leads, statusFilter, deferredSearch, businessMap]);

  // === Sort ===
  const sortedQuotes = useMemo(() => {
    const arr = [...filteredQuotes];
    arr.sort((a, b) => {
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      const aT = new Date(sortBy === 'updated' ? a.updated_at ?? a.created_at : a.created_at).getTime();
      const bT = new Date(sortBy === 'updated' ? b.updated_at ?? b.created_at : b.created_at).getTime();
      return sortBy === 'oldest' ? aT - bT : bT - aT;
    });
    return arr;
  }, [filteredQuotes, sortBy]);

  const sortedLeads = useMemo(() => {
    const arr = [...filteredLeads];
    arr.sort((a, b) => {
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      const aT = new Date(sortBy === 'updated' ? a.updated_at ?? a.created_at : a.created_at).getTime();
      const bT = new Date(sortBy === 'updated' ? b.updated_at ?? b.created_at : b.created_at).getTime();
      return sortBy === 'oldest' ? aT - bT : bT - aT;
    });
    return arr;
  }, [filteredLeads, sortBy]);

  // === Status counts (for chip badges) ===
  const quoteStatusCounts = useMemo(() => {
    const m = new Map<string, number>();
    (quoteRequests ?? []).forEach((q) => m.set(q.status, (m.get(q.status) ?? 0) + 1));
    m.set('all', quoteRequests?.length ?? 0);
    return m;
  }, [quoteRequests]);
  const leadStatusCounts = useMemo(() => {
    const m = new Map<string, number>();
    (leads ?? []).forEach((l) => m.set(l.status, (m.get(l.status) ?? 0) + 1));
    m.set('all', leads?.length ?? 0);
    return m;
  }, [leads]);

  // === Real-time: refetch when this user's rows change ===
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`my-requests-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_requests', filter: `user_id=eq.${user.id}` },
          () => { qc.invalidateQueries({ queryKey: ['my-service-requests', user.id] }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests', filter: `user_id=eq.${user.id}` },
          () => { qc.invalidateQueries({ queryKey: ['my-quote-requests', user.id] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  // === Export to CSV ===
  const handleExport = useCallback(() => {
    if (tab === 'quotes') {
      const header = ['ref_id', 'status', 'sector', 'city', 'district', 'contact_method', 'created_at', 'updated_at', 'description'];
      const rows = [header, ...sortedQuotes.map((q) => [
        q.ref_id ?? q.id, q.status, q.sector, q.city, q.district ?? '', q.preferred_contact_method,
        q.created_at, q.updated_at, q.project_description,
      ])];
      downloadCsv(`quote-requests-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } else {
      const header = ['ref_id', 'status', 'business', 'subject', 'budget', 'contact', 'created_at', 'updated_at'];
      const rows = [header, ...sortedLeads.map((l) => [
        l.ref_id ?? l.id, l.status, businessMap.get(l.business_id)?.name ?? '', l.subject ?? '',
        l.budget_range ?? '', l.contact_preference ?? '', l.created_at, l.updated_at ?? '',
      ])];
      downloadCsv(`service-requests-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }
    toast.success(isRTL ? 'تم تصدير الطلبات' : 'Requests exported');
  }, [tab, sortedQuotes, sortedLeads, businessMap, isRTL]);

  // Reset status filter when switching tabs so options stay valid
  const handleTabChange = useCallback((v: string) => {
    setTab(v as 'quotes' | 'leads');
    setStatusFilter('all');
  }, []);

  const refreshing = leadsFetching || quotesFetching;
  const handleRefresh = useCallback(() => {
    refetchLeads();
    refetchQuotes();
  }, [refetchLeads, refetchQuotes]);

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        <PageHeader
          icon={Inbox}
          tone="primary"
          eyebrow={isRTL ? 'الطلبات' : 'Requests'}
          title={isRTL ? 'طلباتي' : 'My Requests'}
          subtitle={isRTL ? 'تابع حالة طلبات الخدمة التي أرسلتها للمنشآت' : 'Track the status of the service requests you sent to providers'}
          actions={
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[40px]"
                    onClick={handleExport}
                    disabled={(tab === 'quotes' ? sortedQuotes.length : sortedLeads.length) === 0}
                    aria-label={isRTL ? 'تصدير CSV' : 'Export CSV'}
                  >
                    <Download />
                    <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRTL ? 'تصدير CSV' : 'Export CSV'}</TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[40px]"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label={isRTL ? 'تحديث' : 'Refresh'}
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
              </Button>
              <Button asChild size="sm" className="min-h-[40px]">
                <Link to="/quote">
                  <Plus />
                  <span>{isRTL ? 'طلب جديد' : 'New request'}</span>
                </Link>
              </Button>
            </>
          }
        />

        {/* KPI strip */}
        <KpiStrip
          items={[
            { label: isRTL ? 'عروض الأسعار' : 'Quote requests', value: kpis.totalQ, tone: 'info' },
            { label: isRTL ? 'نشطة' : 'Active', value: kpis.activeQuote, tone: 'success', hint: isRTL ? 'عروض الأسعار' : 'Quotes' },
            { label: isRTL ? 'طلبات الخدمة' : 'Service requests', value: kpis.totalL, tone: 'neutral' },
            { label: isRTL ? 'نشطة' : 'Active', value: kpis.activeLead, tone: 'success', hint: isRTL ? 'الخدمات' : 'Services' },
            { label: isRTL ? 'عروض مستلمة' : 'Quotes received', value: kpis.quoted, tone: 'warning' },
          ]}
        />

        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <TabsList className="grid grid-cols-2 sm:inline-flex">
              <TabsTrigger value="quotes" className="gap-2">
                <ReceiptText className="h-4 w-4" />
                <span>{isRTL ? 'عروض الأسعار' : 'Quote requests'}</span>
                <span className="ms-1 text-xs opacity-70 tech-content">({kpis.totalQ})</span>
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-2">
                <Inbox className="h-4 w-4" />
                <span>{isRTL ? 'طلبات الخدمة' : 'Service requests'}</span>
                <span className="ms-1 text-xs opacity-70 tech-content">({kpis.totalL})</span>
              </TabsTrigger>
            </TabsList>

            <div className="relative flex-1 sm:max-w-xs sm:ms-auto">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث في الطلبات…' : 'Search requests…'}
                className="ps-9 h-10"
                dir="auto"
                aria-label={isRTL ? 'بحث' : 'Search'}
              />
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="h-10 w-[160px]" aria-label={isRTL ? 'الترتيب' : 'Sort'}>
                <ArrowUpDown className="h-4 w-4 me-2 opacity-70" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{isRTL ? 'الأحدث أولاً' : 'Newest first'}</SelectItem>
                <SelectItem value="oldest">{isRTL ? 'الأقدم أولاً' : 'Oldest first'}</SelectItem>
                <SelectItem value="updated">{isRTL ? 'آخر تحديث' : 'Last updated'}</SelectItem>
                <SelectItem value="status">{isRTL ? 'حسب الحالة' : 'By status'}</SelectItem>
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              value={density}
              onValueChange={(v) => v && setDensity(v as Density)}
              className="hidden md:inline-flex border border-border rounded-lg"
              aria-label={isRTL ? 'كثافة العرض' : 'Density'}
            >
              <ToggleGroupItem value="comfortable" className="h-10 px-2.5" aria-label={isRTL ? 'مريح' : 'Comfortable'}>
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="compact" className="h-10 px-2.5" aria-label={isRTL ? 'مدمج' : 'Compact'}>
                <Rows3 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground me-1" aria-hidden />
            {(tab === 'quotes' ? quoteStatuses : leadStatuses).map((s) => {
              const active = statusFilter === s;
              const count = (tab === 'quotes' ? quoteStatusCounts : leadStatusCounts).get(s) ?? 0;
              const label = s === 'all'
                ? (isRTL ? 'الكل' : 'All')
                : (tab === 'quotes'
                    ? (isRTL ? QUOTE_STATUS_LABEL_AR[s] ?? s : QUOTE_STATUS_LABEL_EN[s] ?? s)
                    : s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted/60 border-border text-muted-foreground'
                  }`}
                  aria-pressed={active}
                >
                  <span>{label}</span>
                  <span className={`tech-content text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* === QUOTES TAB === */}
          <TabsContent value="quotes" className="space-y-3 mt-0">
            {loadingQuotes && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            )}

            {!loadingQuotes && filteredQuotes.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">
                    {(quoteRequests?.length ?? 0) === 0
                      ? (isRTL ? 'لا توجد طلبات حتى الآن' : 'No quote requests yet')
                      : (isRTL ? 'لا نتائج مطابقة' : 'No matching results')}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {(quoteRequests?.length ?? 0) === 0
                      ? (isRTL
                          ? 'ابدأ بإرسال طلب عرض سعر، وسنساعدك على تنظيم تفاصيله حسب القطاع والمدينة.'
                          : 'Send a quote request and we will help organize the details by sector and city.')
                      : (isRTL ? 'جرّب تعديل البحث أو الفلاتر.' : 'Try adjusting search or filters.')}
                  </p>
                  {(quoteRequests?.length ?? 0) === 0 && (
                    <Button asChild className="min-h-[44px]">
                      <Link to="/quote"><Plus /> {isRTL ? 'اطلب عرض سعر' : 'Request a quote'}</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {sortedQuotes.map((q) => (
              <QuoteRequestRowCard
                key={q.id}
                q={q}
                fileCount={quoteFileCounts?.get(q.id) ?? 0}
                isRTL={isRTL}
                density={density}
              />
            ))}
          </TabsContent>

          {/* === LEADS TAB === */}
          <TabsContent value="leads" className="space-y-3 mt-0">
            {isLoading && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            )}

            {!isLoading && filteredLeads.length === 0 && (
              <Card>
                <CardContent className="py-14 text-center space-y-4">
                  <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {(leads?.length ?? 0) === 0
                        ? (isRTL ? 'لا توجد طلبات خدمة حتى الآن' : 'No service requests yet')
                        : (isRTL ? 'لا نتائج مطابقة' : 'No matching results')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(leads?.length ?? 0) === 0
                        ? (isRTL ? 'ابدأ بتصفح المنشآت أو القطاعات وأرسل طلب عرض سعر.' : 'Browse providers or sectors to send a quote request.')
                        : (isRTL ? 'جرّب تعديل البحث أو الفلاتر.' : 'Try adjusting search or filters.')}
                    </p>
                  </div>
                  {(leads?.length ?? 0) === 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button asChild className="min-h-[44px]">
                        <Link to="/search">{isRTL ? 'البحث عن مزودين' : 'Search providers'}</Link>
                      </Button>
                      <Button asChild variant="outline" className="min-h-[44px]">
                        <Link to="/sectors">{isRTL ? 'القطاعات' : 'Sectors'}</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {sortedLeads.map((lead) => {
            const open = openId === lead.id;
            const biz = businessMap.get(lead.business_id);
            const canCancel = CANCELLABLE.has(lead.status);
            return (
              <Card key={lead.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(lead.id)}
                    className={`w-full text-start ${density === 'compact' ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'} flex flex-wrap items-center gap-3 hover:bg-muted/40 transition-colors min-h-[64px]`}
                    aria-expanded={open}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground tech-content">{lead.ref_id ?? '—'}</span>
                        <LeadStatusBadge status={lead.status} />
                      </div>
                      <div className="font-medium truncate">
                        {lead.subject || (biz?.name ?? (isRTL ? 'طلب خدمة' : 'Service request'))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                        <span className="truncate">{biz?.name ?? '—'}</span>
                        <span aria-hidden>·</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="tech-content cursor-help">{formatRelative(lead.created_at, isRTL)}</span>
                          </TooltipTrigger>
                          <TooltipContent>{new Date(lead.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {open && (
                    <div className="border-t border-border p-4 sm:p-5 space-y-5 bg-muted/20">
                      {/* Timeline */}
                      <ol className="space-y-2.5" aria-label={isRTL ? 'الجدول الزمني' : 'Timeline'}>
                        <TimelineItem icon={<Send className="h-4 w-4" />} label={isRTL ? 'تم الإرسال' : 'Sent'} at={lead.created_at} done isRTL={isRTL} />
                        <TimelineItem icon={<Eye className="h-4 w-4" />} label={isRTL ? 'تمت المشاهدة' : 'Viewed by provider'} at={lead.viewed_at} done={!!lead.viewed_at} isRTL={isRTL} />
                        {lead.needs_info_at && (
                          <TimelineItem icon={<HelpCircle className="h-4 w-4" />} label={isRTL ? 'بحاجة معلومات' : 'Needs info'} at={lead.needs_info_at} done isRTL={isRTL} tone="warning" />
                        )}
                        {lead.accepted_at && (
                          <TimelineItem icon={<CheckCircle2 className="h-4 w-4" />} label={isRTL ? 'تم القبول' : 'Accepted'} at={lead.accepted_at} done isRTL={isRTL} tone="success" />
                        )}
                        {lead.rejected_at && (
                          <TimelineItem icon={<XCircle className="h-4 w-4" />} label={isRTL ? 'تم الرفض' : 'Rejected'} at={lead.rejected_at} done isRTL={isRTL} tone="danger" />
                        )}
                        {lead.cancelled_at && (
                          <TimelineItem icon={<X className="h-4 w-4" />} label={isRTL ? 'تم الإلغاء' : 'Cancelled'} at={lead.cancelled_at} done isRTL={isRTL} />
                        )}
                        {lead.quoted_at && (
                          <TimelineItem icon={<ReceiptText className="h-4 w-4" />} label={isRTL ? 'تم إرسال عرض سعر' : 'Quote sent'} at={lead.quoted_at} done isRTL={isRTL} tone="success" />
                        )}
                        {lead.closed_at && (
                          <TimelineItem icon={<Archive className="h-4 w-4" />} label={isRTL ? 'مغلق' : 'Closed'} at={lead.closed_at} done isRTL={isRTL} />
                        )}
                      </ol>

                      {lead.status === 'quoted' && lead.quote_amount != null && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <ReceiptText className="h-4 w-4 text-primary" />
                            <h4 className="font-medium text-sm">{isRTL ? 'عرض السعر المستلم' : 'Quote received'}</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                              <span className="tech-content font-medium">
                                {Number(lead.quote_amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} {lead.quote_currency ?? 'SAR'}
                              </span>
                            </div>
                            {lead.quote_valid_until && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="tech-content">{isRTL ? 'صالح حتى: ' : 'Valid until: '}{lead.quote_valid_until}</span>
                              </div>
                            )}
                            {lead.quote_note && (
                              <div className="sm:col-span-2 flex items-start gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <p className="leading-6 whitespace-pre-wrap text-foreground/90">{lead.quote_note}</p>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground pt-1">
                            {isRTL ? 'يمكنك التواصل مع المزود عبر المحادثة لمناقشة التفاصيل.' : 'You can chat with the provider to discuss the details.'}
                          </p>
                        </div>
                      )}

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {lead.contact_preference && (
                          <DetailRow icon={<MessageSquare className="h-4 w-4" />} label={isRTL ? 'وسيلة التواصل' : 'Contact preference'} value={lead.contact_preference} />
                        )}
                        {lead.budget_range && (
                          <DetailRow icon={<Wallet className="h-4 w-4" />} label={isRTL ? 'الميزانية' : 'Budget'} value={lead.budget_range} />
                        )}
                        {lead.project_scope && (
                          <div className="sm:col-span-2 flex items-start gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 mt-0.5" />
                            <span className="leading-6 text-foreground/90">{lead.project_scope}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {lead.conversation_id && (lead.status === 'accepted' || lead.status === 'needs_info' || lead.status === 'quoted') && (
                          <Button
                            asChild
                            variant="default"
                            className="min-h-[44px]"
                            onClick={() => safeTrack('service_request_conversation_opened', {
                              source_page: 'dashboard_my_requests',
                              outcome: lead.status,
                              is_authenticated: true,
                            } as Parameters<typeof trackEvent>[1])}
                          >
                            <Link to={`/dashboard/messages?conversation=${lead.conversation_id}`}>
                              <MessageSquare />
                              <span>{isRTL ? 'فتح المحادثة' : 'Open conversation'}</span>
                            </Link>
                          </Button>
                        )}
                        {biz?.username && (
                          <Button asChild variant="outline" className="min-h-[44px]">
                            <Link to={`/${biz.username}`}>
                              {isRTL ? 'فتح ملف المنشأة' : 'Open provider profile'}
                            </Link>
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            variant="outline"
                            className="min-h-[44px] text-destructive hover:text-destructive"
                            disabled={pendingId === lead.id}
                            onClick={() => {
                              if (window.confirm(isRTL ? 'هل تريد إلغاء هذا الطلب؟' : 'Cancel this request?')) {
                                cancelMutation.mutate(lead.id);
                              }
                            }}
                            aria-label={isRTL ? 'إلغاء الطلب' : 'Cancel request'}
                          >
                            {pendingId === lead.id ? <Loader2 className="animate-spin" /> : <X />}
                            <span>{isRTL ? 'إلغاء الطلب' : 'Cancel request'}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </TabsContent>
        </Tabs>
      </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

const TimelineItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  at: string | null;
  done: boolean;
  isRTL: boolean;
  tone?: 'success' | 'danger' | 'warning';
}> = ({ icon, label, at, done, isRTL, tone }) => {
  const toneCls =
    tone === 'success' ? 'bg-success/10 text-success border-success/30' :
    tone === 'danger' ? 'bg-destructive/10 text-destructive border-destructive/30' :
    tone === 'warning' ? 'bg-warning/10 text-warning border-warning/30' :
    done ? 'bg-muted text-foreground border-border' : 'bg-background text-muted-foreground border-border';
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${toneCls}`}>
        {icon}
      </span>
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      {at && (
        <span className="text-xs text-muted-foreground tech-content">
          · {new Date(at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
        </span>
      )}
    </li>
  );
};

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    {icon}
    <span className="text-foreground/80"><strong className="font-medium text-foreground">{label}:</strong> {value}</span>
  </div>
);

const QuoteRequestRowCardImpl: React.FC<{
  q: QuoteRequestRow;
  fileCount: number;
  isRTL: boolean;
  density?: Density;
}> = ({ q, fileCount, isRTL, density = 'comfortable' }) => {
  const tone = QUOTE_STATUS_TONE[q.status] ?? 'bg-muted text-muted-foreground border-border';
  const compact = density === 'compact';
  const createdAbs = new Date(q.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US');
  return (
    <Card className="overflow-hidden hover-lift transition-shadow">
      <CardContent className={`${compact ? 'p-3 sm:p-3.5 space-y-2' : 'p-4 sm:p-5 space-y-3'}`}>
        <div className="flex flex-wrap items-center gap-2">
          {q.ref_id ? (
            <>
              <ReferenceBadge refId={q.ref_id} />
              <ReferenceLinkCopy refId={q.ref_id} isRTL={isRTL} />
            </>
          ) : (
            <span className="font-mono text-xs text-muted-foreground tech-content">#{q.id.slice(0, 8)}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${tone}`}>
            {isRTL ? QUOTE_STATUS_LABEL_AR[q.status] : QUOTE_STATUS_LABEL_EN[q.status]}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground tech-content ms-auto cursor-help">
                {formatRelative(q.created_at, isRTL)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{createdAbs}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Tag className="h-4 w-4" /> {q.sector}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4" /> {q.city}{q.district ? ` · ${q.district}` : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="h-4 w-4" /> {q.preferred_contact_method}
          </span>
          {fileCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Paperclip className="h-4 w-4" /> {fileCount}
            </span>
          )}
        </div>
        {!compact && <p className="text-sm text-foreground/80 line-clamp-2">{q.project_description}</p>}
        <div className="pt-1">
          <Button asChild size="sm" variant="outline" className="min-h-[36px]">
            <Link to={`/dashboard/my-requests/${q.ref_id ?? q.id}`}>
              {isRTL ? 'عرض التفاصيل' : 'View details'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
const QuoteRequestRowCard = React.memo(QuoteRequestRowCardImpl);
QuoteRequestRowCard.displayName = 'QuoteRequestRowCard';

export default DashboardMyRequests;