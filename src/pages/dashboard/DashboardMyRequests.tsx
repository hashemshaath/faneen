import React, { useMemo, useState, useCallback, useDeferredValue, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { subscribeMyRequestsChanges } from '@/modules/leads/services/subscribeMyRequestsChanges';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Inbox, ChevronDown, ChevronUp, Send, Eye, HelpCircle, CheckCircle2,
  XCircle, Archive, X, Wallet, FileText, MessageSquare, Loader2, ReceiptText, Calendar,
  Paperclip, MapPin, Tag, Search, Plus, RefreshCw, Download, ArrowUpDown, Rows3, LayoutGrid, Filter,
} from 'lucide-react';
import { Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { Star, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { trackEvent } from '@/lib/analytics-events';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { ReferenceLinkCopy } from '@/components/reference/ReferenceLinkCopy';
import type { LucideIcon } from 'lucide-react';

/** Premium KPI tile used on the executive hero. */
type HeroKpiAccent = 'emerald' | 'blue' | 'amber' | 'orange' | 'slate';
const HERO_KPI_ACCENTS: Record<HeroKpiAccent, { icon: string; ring: string; chip: string }> = {
  emerald: { icon: 'bg-emerald-500/15 text-emerald-300', ring: 'ring-emerald-400/20', chip: 'bg-emerald-400/15 text-emerald-200' },
  blue:    { icon: 'bg-blue-500/15 text-blue-300',       ring: 'ring-blue-400/20',    chip: 'bg-blue-400/15 text-blue-200' },
  amber:   { icon: 'bg-amber-500/15 text-amber-300',     ring: 'ring-amber-400/20',   chip: 'bg-amber-400/15 text-amber-200' },
  orange:  { icon: 'bg-orange-500/15 text-orange-300',   ring: 'ring-orange-400/20',  chip: 'bg-orange-400/15 text-orange-200' },
  slate:   { icon: 'bg-white/10 text-white/80',          ring: 'ring-white/10',       chip: 'bg-white/10 text-white/80' },
};

const HeroKpi: React.FC<{
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  accent: HeroKpiAccent;
}> = ({ icon: Icon, label, value, hint, accent }) => {
  const a = HERO_KPI_ACCENTS[accent];
  return (
    <div className={`group rounded-2xl bg-white/[0.04] backdrop-blur-sm ring-1 ${a.ring} p-3.5 sm:p-4 transition-all hover:bg-white/[0.07] hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${a.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        {hint && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.chip}`}>{hint}</span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-white tech-content leading-none">{value}</div>
        <div className="text-[11px] uppercase tracking-wide text-white/60 mt-1.5">{label}</div>
      </div>
    </div>
  );
};

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
const STORAGE_KEY_PINS = 'qitaat_my_requests_pins_v1';

function loadPins(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PINS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch { return new Set(); }
}

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
  const [urlParams, setUrlParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'quotes' | 'leads'>(() => (urlParams.get('tab') === 'leads' ? 'leads' : 'quotes'));
  const [statusFilter, setStatusFilter] = useState<string>(() => urlParams.get('status') ?? 'all');
  const [search, setSearch] = useState<string>(() => urlParams.get('q') ?? '');
  const deferredSearch = useDeferredValue(search);
  const [pins, setPins] = useState<Set<string>>(() => loadPins());
  const togglePin = useCallback((id: string) => {
    setPins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(STORAGE_KEY_PINS, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Sync URL <- state (shareable links)
  useEffect(() => {
    const next = new URLSearchParams(urlParams);
    tab === 'quotes' ? next.delete('tab') : next.set('tab', tab);
    statusFilter === 'all' ? next.delete('status') : next.set('status', statusFilter);
    deferredSearch ? next.set('q', deferredSearch) : next.delete('q');
    if (next.toString() !== urlParams.toString()) setUrlParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter, deferredSearch]);
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

  // === Smart insights: leads that need the user's attention ===
  const insights = useMemo(() => {
    const l = leads ?? [];
    const quotedAwaiting = l.filter((x) => x.status === 'quoted');
    const needsInfo = l.filter((x) => x.status === 'needs_info');
    return { quotedAwaiting, needsInfo };
  }, [leads]);

  // === Status distribution (for mini-bar) ===
  const distribution = useMemo(() => {
    const source = tab === 'quotes' ? (quoteRequests ?? []) : (leads ?? []);
    const counts = new Map<string, number>();
    source.forEach((r) => counts.set(r.status, (counts.get(r.status) ?? 0) + 1));
    const total = source.length;
    const palette: Record<string, string> = {
      new: 'bg-blue-500',
      viewed: 'bg-sky-500',
      under_review: 'bg-amber-500',
      needs_info: 'bg-amber-500',
      matched: 'bg-indigo-500',
      contacted: 'bg-violet-500',
      accepted: 'bg-emerald-500',
      quoted: 'bg-emerald-500',
      completed: 'bg-emerald-600',
      rejected: 'bg-rose-500',
      cancelled: 'bg-slate-400',
      closed: 'bg-slate-500',
    };
    const segments = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([status, n]) => ({
        status,
        n,
        pct: total ? (n / total) * 100 : 0,
        color: palette[status] ?? 'bg-muted-foreground/40',
      }));
    return { segments, total };
  }, [tab, quoteRequests, leads]);

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
      const ap = pins.has(a.id) ? 1 : 0;
      const bp = pins.has(b.id) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      const aT = new Date(sortBy === 'updated' ? a.updated_at ?? a.created_at : a.created_at).getTime();
      const bT = new Date(sortBy === 'updated' ? b.updated_at ?? b.created_at : b.created_at).getTime();
      return sortBy === 'oldest' ? aT - bT : bT - aT;
    });
    return arr;
  }, [filteredQuotes, sortBy, pins]);

  const sortedLeads = useMemo(() => {
    const arr = [...filteredLeads];
    arr.sort((a, b) => {
      const ap = pins.has(a.id) ? 1 : 0;
      const bp = pins.has(b.id) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      const aT = new Date(sortBy === 'updated' ? a.updated_at ?? a.created_at : a.created_at).getTime();
      const bT = new Date(sortBy === 'updated' ? b.updated_at ?? b.created_at : b.created_at).getTime();
      return sortBy === 'oldest' ? aT - bT : bT - aT;
    });
    return arr;
  }, [filteredLeads, sortBy, pins]);

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
    const unsubscribe = subscribeMyRequestsChanges({
      userId: user.id,
      onLeadChange: () => { qc.invalidateQueries({ queryKey: ['my-service-requests', user.id] }); },
      onQuoteChange: () => { qc.invalidateQueries({ queryKey: ['my-quote-requests', user.id] }); },
    });
    return unsubscribe;
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

  // === Keyboard shortcut: "/" focuses search ===
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        {/* === Executive dark hero === */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-elev-3">
          {/* Glow accents */}
          <div aria-hidden className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -start-16 h-72 w-72 rounded-full bg-orange-500/[0.07] blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_60%)]" />

          <div className="relative p-5 sm:p-7 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] ring-1 ring-white/10 text-[11px] font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isRTL ? 'الطلبات' : 'Requests'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {isRTL ? 'طلباتي' : 'My Requests'}
                </h1>
                <p className="text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">
                  {isRTL
                    ? 'تابع حالة طلبات الخدمة وعروض الأسعار التي أرسلتها للمنشآت، مع تحديثات لحظية وسجل زمني كامل.'
                    : 'Track the status of the service requests and quotes you sent to providers — live updates and full timeline.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[40px] bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white"
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
                  className="min-h-[40px] bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label={isRTL ? 'تحديث' : 'Refresh'}
                >
                  <RefreshCw className={refreshing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
                </Button>
                <Button asChild size="sm" className="min-h-[40px] bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                  <Link to="/quote">
                    <Plus />
                    <span>{isRTL ? 'طلب جديد' : 'New request'}</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* === Premium KPI grid === */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              <HeroKpi icon={ReceiptText} accent="blue"
                label={isRTL ? 'عروض الأسعار' : 'Quote requests'} value={kpis.totalQ} />
              <HeroKpi icon={CheckCircle2} accent="emerald"
                label={isRTL ? 'نشطة' : 'Active'} value={kpis.activeQuote}
                hint={isRTL ? 'عروض' : 'Quotes'} />
              <HeroKpi icon={Inbox} accent="slate"
                label={isRTL ? 'طلبات الخدمة' : 'Service requests'} value={kpis.totalL} />
              <HeroKpi icon={Send} accent="amber"
                label={isRTL ? 'نشطة' : 'Active'} value={kpis.activeLead}
                hint={isRTL ? 'خدمات' : 'Services'} />
              <HeroKpi icon={Wallet} accent="orange"
                label={isRTL ? 'عروض مستلمة' : 'Quotes received'} value={kpis.quoted} />
            </div>
          </div>
        </section>

        {/* === Smart insights banner === */}
        {(insights.quotedAwaiting.length > 0 || insights.needsInfo.length > 0) && (
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.04] to-transparent p-4 sm:p-5 flex flex-wrap items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold text-sm sm:text-base">
                {isRTL ? 'يتطلب اهتمامك' : 'Needs your attention'}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                {insights.quotedAwaiting.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <ReceiptText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {isRTL
                      ? `${insights.quotedAwaiting.length} عرض سعر بانتظار ردك`
                      : `${insights.quotedAwaiting.length} quote${insights.quotedAwaiting.length > 1 ? 's' : ''} awaiting your reply`}
                  </span>
                )}
                {insights.needsInfo.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    {isRTL
                      ? `${insights.needsInfo.length} طلب يحتاج معلومات إضافية`
                      : `${insights.needsInfo.length} request${insights.needsInfo.length > 1 ? 's' : ''} need more info`}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="min-h-[40px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => { setTab('leads'); setStatusFilter(insights.quotedAwaiting.length > 0 ? 'quoted' : 'needs_info'); }}
            >
              <span>{isRTL ? 'مراجعة الآن' : 'Review now'}</span>
              <ArrowRight className="rtl-flip" />
            </Button>
          </div>
        )}

        {/* === Status distribution mini-bar === */}
        {distribution.total > 0 && (
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{isRTL ? 'توزيع الحالات' : 'Status distribution'}</span>
              <span className="tech-content">{distribution.total}</span>
            </div>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
              {distribution.segments.map((s) => (
                <Tooltip key={s.status}>
                  <TooltipTrigger asChild>
                    <div
                      className={`${s.color} transition-all hover:opacity-80`}
                      style={{ width: `${s.pct}%` }}
                      aria-label={`${s.status}: ${s.n}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="tech-content">{s.status} · {s.n} ({s.pct.toFixed(0)}%)</span>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {distribution.segments.slice(0, 6).map((s) => (
                <span key={s.status} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  <span>{s.status}</span>
                  <span className="tech-content opacity-70">({s.n})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
          {/* Sticky toolbar */}
          <div className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-background/85 backdrop-blur-md border-b border-border/40 flex flex-col sm:flex-row sm:items-center gap-3">
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
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث في الطلبات…' : 'Search requests…'}
                className="ps-9 h-10"
                dir="auto"
                aria-label={isRTL ? 'بحث' : 'Search'}
              />
              <kbd className="hidden md:inline-flex absolute end-2 top-1/2 -translate-y-1/2 h-5 items-center px-1.5 rounded border border-border bg-muted text-[10px] text-muted-foreground tech-content pointer-events-none">/</kbd>
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
            {(statusFilter !== 'all' || search.trim() !== '') && (
              <button
                type="button"
                onClick={() => { setStatusFilter('all'); setSearch(''); }}
                className="text-xs px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:bg-muted/60 inline-flex items-center gap-1.5 ms-1"
                aria-label={isRTL ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
              >
                <RotateCcw className="h-3 w-3" />
                <span>{isRTL ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            )}
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
                       ? (isRTL ? 'لا توجد فرص حتى الآن' : 'No opportunities yet')
                      : (isRTL ? 'لا نتائج مطابقة' : 'No matching results')}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {(quoteRequests?.length ?? 0) === 0
                      ? (isRTL
                          ? 'ابدأ بإنشاء فرصة جديدة، وسنساعدك على تنظيم تفاصيلها حسب القطاع والمدينة.'
                          : 'Start a new opportunity and we will help organize the details by sector and city.')
                      : (isRTL ? 'جرّب تعديل البحث أو الفلاتر.' : 'Try adjusting search or filters.')}
                  </p>
                  {(quoteRequests?.length ?? 0) === 0 && (
                    <Button asChild className="min-h-[44px]">
                      <Link to="/quote"><Plus /> {isRTL ? 'ابدأ فرصة جديدة' : 'Start a new opportunity'}</Link>
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
                pinned={pins.has(q.id)}
                onTogglePin={togglePin}
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
                        ? (isRTL ? 'ابدأ بتصفح المنشآت أو القطاعات وأنشئ فرصتك.' : 'Browse providers or sectors and start an opportunity.')
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
  pinned?: boolean;
  onTogglePin?: (id: string) => void;
}> = ({ q, fileCount, isRTL, density = 'comfortable', pinned = false, onTogglePin }) => {
  const tone = QUOTE_STATUS_TONE[q.status] ?? 'bg-muted text-muted-foreground border-border';
  const compact = density === 'compact';
  const createdAbs = new Date(q.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US');
  return (
    <Card className={`overflow-hidden hover-lift transition-shadow ${pinned ? 'ring-1 ring-amber-400/40 bg-amber-50/30 dark:bg-amber-500/[0.04]' : ''}`}>
      <CardContent className={`${compact ? 'p-3 sm:p-3.5 space-y-2' : 'p-4 sm:p-5 space-y-3'}`}>
        <div className="flex flex-wrap items-center gap-2">
          {onTogglePin && (
            <button
              type="button"
              onClick={() => onTogglePin(q.id)}
              className={`h-7 w-7 -ms-1 rounded-md inline-flex items-center justify-center transition-colors ${pinned ? 'text-amber-500 hover:bg-amber-500/10' : 'text-muted-foreground/60 hover:text-amber-500 hover:bg-muted'}`}
              aria-label={pinned ? (isRTL ? 'إلغاء التثبيت' : 'Unpin') : (isRTL ? 'تثبيت' : 'Pin')}
              aria-pressed={pinned}
            >
              <Star className={`h-4 w-4 ${pinned ? 'fill-current' : ''}`} />
            </button>
          )}
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