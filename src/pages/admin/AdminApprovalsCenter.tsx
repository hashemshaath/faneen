import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, UserPlus, Crown, ArrowUp, AtSign, Inbox,
  ExternalLink, RefreshCw, Loader2, CheckCircle2, Clock, Building2,
  Check, X, History, ShieldAlert, Search, Filter,
  Download, FileText, FileSpreadsheet, Calendar as CalendarIcon, ChevronDown,
} from 'lucide-react';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { reviewEntityAccessRequest } from '@/modules/entities/services/access/reviewEntityAccessRequest';
import {
  listPendingProviderReviewBusinesses,
  listPendingUsernameBusinesses,
} from '@/modules/businesses/services/listPendingApprovalBusinesses';
import { toast } from 'sonner';
import {
  buildApprovalsCsv, buildAuditCsv, buildPdfHtml, downloadTextFile,
  filterAuditRows, type AuditRow, type ExportRow, type DateRangeKey,
} from '@/pages/admin/approvalsCenter/exportHelpers';
import { runBulkReview } from '@/pages/admin/approvalsCenter/bulkReview';
import { getReviewer, ACTIONABLE_CATEGORIES } from '@/pages/admin/approvalsCenter/categoryReviewers';

/**
 * UNIFIED-APPROVALS-CENTER-1
 * Single landing page that aggregates every pending approval across the
 * platform — replacing the previous scattered surfaces:
 *   - Provider review        (businesses.approval_status = submitted/under_review)
 *   - Username review        (businesses.username_status = pending)
 *   - Entity access requests (entity_access_requests.status = pending)
 *   - Membership subscriptions (membership_subscriptions.status = pending)
 *   - Membership upgrades    (membership_upgrade_requests.status = pending)
 *
 * Each section is read-only here and deep-links into its existing detail
 * page for the actual approve/reject action. This keeps business logic
 * unchanged while giving admins one organized command surface.
 */

type ApprovalCategoryKey =
  | 'provider_review' | 'username' | 'entity_access' | 'subscriptions' | 'upgrades';

interface ApprovalItem {
  id: string;
  refId: string;
  primary: string;          // e.g. business name
  secondary?: string | null; // e.g. ref / username / tier
  createdAt: string | null;
}

interface CategoryResult {
  count: number;
  items: ApprovalItem[];
}

const PREVIEW_LIMIT = 25;
const PAGE_SIZE = 20;
const FILTERS_STORAGE_KEY = 'qitaat_approvals_filters_v1';
const POLL_INTERVAL_MS = 60_000;

interface PersistedFilters {
  activeFilter: 'all' | ApprovalCategoryKey;
  search: string;
  dateRange: DateRangeKey;
}

function loadFilters(): PersistedFilters {
  if (typeof window === 'undefined') return { activeFilter: 'all', search: '', dateRange: 'all' };
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return { activeFilter: 'all', search: '', dateRange: 'all' };
    const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
    return {
      activeFilter: (parsed.activeFilter as PersistedFilters['activeFilter']) ?? 'all',
      search: typeof parsed.search === 'string' ? parsed.search : '',
      dateRange: (parsed.dateRange as DateRangeKey) ?? 'all',
    };
  } catch {
    return { activeFilter: 'all', search: '', dateRange: 'all' };
  }
}

async function fetchProviderReview(): Promise<CategoryResult> {
  const { data, count, error } = await listPendingProviderReviewBusinesses(PREVIEW_LIMIT);
  if (error) return { count: 0, items: [] };
  return {
    count,
    items: data.map((r) => ({
      id: r.id,
      refId: r.ref_id ?? '—',
      primary: r.name_ar ?? r.name_en ?? r.username ?? r.ref_id ?? '—',
      secondary: r.approval_status,
      createdAt: r.submitted_at,
    })),
  };
}

async function fetchUsername(): Promise<CategoryResult> {
  const { data, count, error } = await listPendingUsernameBusinesses(PREVIEW_LIMIT);
  if (error) return { count: 0, items: [] };
  return {
    count,
    items: data.map((r) => ({
      id: r.id,
      refId: r.ref_id ?? '—',
      primary: r.name_ar ?? r.name_en ?? r.ref_id ?? '—',
      secondary: r.username ? `qitaat.com/${r.username}` : null,
      createdAt: r.created_at,
    })),
  };
}

async function fetchEntityAccess(): Promise<CategoryResult> {
  const { data, count, error } = await supabase
    .from('entity_access_requests')
    .select(
      'id, ref_id, target_ref, created_at, target_business:target_business_id(ref_id, name_ar, name_en)',
      { count: 'exact' },
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(PREVIEW_LIMIT);
  if (error) return { count: 0, items: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  return {
    count: count ?? 0,
    items: rows.map((r) => ({
      id: r.id,
      refId: r.ref_id ?? '—',
      primary: r.target_business?.name_ar ?? r.target_business?.name_en ?? r.target_ref ?? '—',
      secondary: r.target_business?.ref_id ?? r.target_ref ?? null,
      createdAt: r.created_at,
    })),
  };
}

async function fetchSubscriptions(): Promise<CategoryResult> {
  const { data, count, error } = await supabase
    .from('membership_subscriptions')
    .select('id, ref_id, tier, created_at, business:business_id(ref_id, name_ar, name_en)', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(PREVIEW_LIMIT);
  if (error) return { count: 0, items: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  return {
    count: count ?? 0,
    items: rows.map((r) => ({
      id: r.id,
      refId: r.ref_id ?? '—',
      primary: r.business?.name_ar ?? r.business?.name_en ?? r.business?.ref_id ?? '—',
      secondary: r.tier ?? null,
      createdAt: r.created_at,
    })),
  };
}

async function fetchUpgrades(): Promise<CategoryResult> {
  const { data, count, error } = await supabase
    .from('membership_upgrade_requests')
    .select('id, requested_tier, created_at, business:business_id(ref_id, name_ar, name_en)', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(PREVIEW_LIMIT);
  if (error) return { count: 0, items: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  return {
    count: count ?? 0,
    items: rows.map((r) => ({
      id: r.id,
      refId: (r.id as string).slice(0, 8),
      primary: r.business?.name_ar ?? r.business?.name_en ?? r.business?.ref_id ?? '—',
      secondary: r.requested_tier ?? null,
      createdAt: r.created_at,
    })),
  };
}

interface CategoryConfig {
  key: ApprovalCategoryKey;
  ar: string;
  en: string;
  description: { ar: string; en: string };
  icon: typeof ShieldCheck;
  tone: string; // gradient + text tone
  ring: string;
  href: string;
  hint: { ar: string; en: string };
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'provider_review',
    ar: 'مراجعة المزودين', en: 'Provider Review',
    description: { ar: 'منشآت سلّمت ملفاتها وتنتظر الاعتماد', en: 'Businesses that submitted their profile' },
    icon: ShieldCheck,
    tone: 'from-primary/15 to-primary/5 text-primary',
    ring: 'ring-primary/30',
    href: '/admin/provider-review',
    hint: { ar: 'افتح مركز المراجعة', en: 'Open review center' },
  },
  {
    key: 'username',
    ar: 'موافقات اسم المستخدم', en: 'Username Approvals',
    description: { ar: 'منشآت تنتظر اعتماد اسم المستخدم العام', en: 'Businesses awaiting public username approval' },
    icon: AtSign,
    tone: 'from-warning/15 to-warning/5 text-warning',
    ring: 'ring-warning/30',
    href: '/admin/provider-review',
    hint: { ar: 'افتح صفحة المراجعة', en: 'Open review page' },
  },
  {
    key: 'entity_access',
    ar: 'طلبات الانضمام', en: 'Entity Access Requests',
    description: { ar: 'مستخدمون يطلبون الانضمام لمنشأة قائمة', en: 'Users requesting to join an existing entity' },
    icon: UserPlus,
    tone: 'from-accent/15 to-accent/5 text-foreground',
    ring: 'ring-border',
    href: '/admin/entity-access-requests',
    hint: { ar: 'افتح طلبات الانضمام', en: 'Open access requests' },
  },
  {
    key: 'subscriptions',
    ar: 'اشتراكات العضوية', en: 'Membership Subscriptions',
    description: { ar: 'اشتراكات بانتظار التفعيل أو الدفع', en: 'Subscriptions awaiting activation or payment' },
    icon: Crown,
    tone: 'from-success/15 to-success/5 text-success',
    ring: 'ring-success/30',
    href: '/admin/memberships',
    hint: { ar: 'افتح مركز العضويات', en: 'Open memberships center' },
  },
  {
    key: 'upgrades',
    ar: 'طلبات ترقية العضوية', en: 'Upgrade Requests',
    description: { ar: 'طلبات للانتقال إلى باقة أعلى', en: 'Requests to move to a higher tier' },
    icon: ArrowUp,
    tone: 'from-destructive/10 to-destructive/5 text-destructive',
    ring: 'ring-destructive/30',
    href: '/admin/memberships',
    hint: { ar: 'افتح مركز العضويات', en: 'Open memberships center' },
  },
];

const AdminApprovalsCenter: React.FC = () => {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  usePageMeta({ title: isRTL ? 'مركز الموافقات الموحّد' : 'Unified Approvals Center', noindex: true });
  useNoIndex();

  const queries = {
    provider_review: useQuery({ queryKey: ['approvals', 'provider_review'], queryFn: fetchProviderReview, staleTime: 30_000, refetchInterval: POLL_INTERVAL_MS, refetchOnWindowFocus: true }),
    username:        useQuery({ queryKey: ['approvals', 'username'],        queryFn: fetchUsername,       staleTime: 30_000, refetchInterval: POLL_INTERVAL_MS, refetchOnWindowFocus: true }),
    entity_access:   useQuery({ queryKey: ['approvals', 'entity_access'],   queryFn: fetchEntityAccess,   staleTime: 30_000, refetchInterval: POLL_INTERVAL_MS, refetchOnWindowFocus: true }),
    subscriptions:   useQuery({ queryKey: ['approvals', 'subscriptions'],   queryFn: fetchSubscriptions,  staleTime: 30_000, refetchInterval: POLL_INTERVAL_MS, refetchOnWindowFocus: true }),
    upgrades:        useQuery({ queryKey: ['approvals', 'upgrades'],        queryFn: fetchUpgrades,       staleTime: 30_000, refetchInterval: POLL_INTERVAL_MS, refetchOnWindowFocus: true }),
  } as const;

  const totals = useMemo(() => {
    let total = 0;
    let anyLoading = false;
    for (const k of Object.keys(queries) as ApprovalCategoryKey[]) {
      const q = queries[k];
      if (q.isLoading) anyLoading = true;
      total += q.data?.count ?? 0;
    }
    return { total, anyLoading };
  }, [queries]);

  const refreshAll = () => {
    (Object.keys(queries) as ApprovalCategoryKey[]).forEach((k) => queries[k].refetch());
    queryClient.invalidateQueries({ queryKey: ['approvals-audit'] });
  };

  // Recent admin decisions — read-only audit timeline.
  const auditQuery = useQuery({
    queryKey: ['approvals-audit'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('id, action, entity_type, entity_id, details, created_at, user_id')
        .in('action', [
          'role_assigned', 'role_removed', 'role_updated',
          'membership_tier.admin_override', 'business_tier_change',
          'business_is_verified_true', 'business_sensitive_update',
          'business_created', 'cleanup_super_admin_business_link',
          'entity_access_request.approved', 'entity_access_request.rejected',
          'service_activation.approved', 'service_activation.rejected',
          'membership_subscription_activated',
        ])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data ?? [];
    },
  });

  const handleReview = async (
    id: string,
    category: ApprovalCategoryKey,
    action: 'approve' | 'reject',
  ) => {
    if (!user?.id) return;
    const fn = getReviewer(category);
    if (!fn) return;
    setBusyId(id);
    const { ok, error } = await fn({ requestId: id, reviewerUserId: user.id, action });
    setBusyId(null);
    if (!ok) {
      const msg = (error as { message?: string } | null)?.message ?? 'error';
      toast.error(isRTL ? `فشل التنفيذ: ${msg}` : `Action failed: ${msg}`);
      return;
    }
    toast.success(
      isRTL
        ? action === 'approve' ? 'تمت الموافقة' : 'تم الرفض'
        : action === 'approve' ? 'Approved' : 'Rejected',
    );
    queries[category].refetch();
    queryClient.invalidateQueries({ queryKey: ['approvals-audit'] });
  };

  if (!isAdmin && !isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-muted-foreground">
          {isRTL ? 'هذه الصفحة للمشرفين فقط.' : 'This page is admin-only.'}
        </div>
      </DashboardLayout>
    );
  }

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }) : '—';

  // ── Unified feed: merge all categories into a single sortable/filterable list ──
  const initialFilters = React.useRef<PersistedFilters>(loadFilters()).current;
  const [activeFilter, setActiveFilter] = React.useState<'all' | ApprovalCategoryKey>(initialFilters.activeFilter);
  const [search, setSearch] = React.useState(initialFilters.search);
  const [dateRange, setDateRange] = React.useState<DateRangeKey>(initialFilters.dateRange);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [auditSearch, setAuditSearch] = React.useState('');

  // Persist filter settings
  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ activeFilter, search, dateRange }),
      );
    } catch { /* ignore quota */ }
  }, [activeFilter, search, dateRange]);

  // Reset pagination when filters change
  React.useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeFilter, search, dateRange]);

  type UnifiedRow = ApprovalItem & { category: ApprovalCategoryKey };
  const unified = useMemo<UnifiedRow[]>(() => {
    const rows: UnifiedRow[] = [];
    (Object.keys(queries) as ApprovalCategoryKey[]).forEach((k) => {
      const items = queries[k].data?.items ?? [];
      items.forEach((it) => rows.push({ ...it, category: k }));
    });
    rows.sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const rangeMs: Record<DateRangeKey, number | null> = {
      all: null, '24h': 24 * 3600_000, '7d': 7 * 24 * 3600_000, '30d': 30 * 24 * 3600_000,
    };
    const cutoff = rangeMs[dateRange];
    return rows.filter((r) => {
      if (activeFilter !== 'all' && r.category !== activeFilter) return false;
      if (cutoff !== null) {
        const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        if (!t || now - t > cutoff) return false;
      }
      if (!q) return true;
      return (
        r.primary.toLowerCase().includes(q) ||
        r.refId.toLowerCase().includes(q) ||
        (r.secondary ?? '').toString().toLowerCase().includes(q)
      );
    });
  }, [queries, activeFilter, search, dateRange]);

  const visibleRows = useMemo(() => unified.slice(0, visibleCount), [unified, visibleCount]);
  const hasMore = unified.length > visibleCount;

  // ── Selection helpers ──
  const rowKey = (it: UnifiedRow) => `${it.category}-${it.id}`;
  const selectedRows = useMemo(
    () => unified.filter((r) => selected[rowKey(r)]),
    [unified, selected],
  );
  const selectedActionable = useMemo(
    () => selectedRows.filter((r) => ACTIONABLE_CATEGORIES.has(r.category)),
    [selectedRows],
  );
  const toggleRow = (it: UnifiedRow) =>
    setSelected((s) => ({ ...s, [rowKey(it)]: !s[rowKey(it)] }));
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selected[rowKey(r)]);
  const toggleAllVisible = () => {
    const next = { ...selected };
    const turnOn = !allVisibleSelected;
    visibleRows.forEach((r) => { next[rowKey(r)] = turnOn; });
    setSelected(next);
  };
  const clearSelection = () => setSelected({});

  // ── Bulk approve/reject across all actionable categories ──
  const handleBulk = async (action: 'approve' | 'reject') => {
    if (!user?.id || selectedActionable.length === 0) return;
    setBulkBusy(true);
    const { ok, fail } = await runBulkReview({
      items: selectedActionable.map((r) => ({ id: r.id, category: r.category })),
      action,
      reviewerUserId: user.id,
      getReviewer,
    });
    setBulkBusy(false);
    if (ok > 0) {
      toast.success(
        isRTL
          ? `تم تنفيذ ${ok} ${action === 'approve' ? 'موافقة' : 'رفض'}${fail ? ` — فشل ${fail}` : ''}`
          : `${ok} ${action === 'approve' ? 'approved' : 'rejected'}${fail ? ` — ${fail} failed` : ''}`,
      );
    } else if (fail > 0) {
      toast.error(isRTL ? `فشل التنفيذ على ${fail} عناصر` : `Failed on ${fail} items`);
    }
    clearSelection();
    // Refetch every category whose items were affected (cheap; only 5 queries total)
    const affected = new Set(selectedActionable.map((r) => r.category));
    affected.forEach((cat) => queries[cat as ApprovalCategoryKey].refetch());
    queryClient.invalidateQueries({ queryKey: ['approvals-audit'] });
  };

  // ── Export helpers (respect current filter/search/date range) ──
  const exportRows = useMemo<ExportRow[]>(() => unified.map((r) => {
    const c = CATEGORIES.find((cc) => cc.key === r.category)!;
    return {
      category: isRTL ? c.ar : c.en,
      ref_id: r.refId,
      name: r.primary,
      detail: r.secondary ?? '',
      created_at: r.createdAt ?? '',
    };
  }), [unified, isRTL]);

  const downloadCSV = () => {
    const csv = buildApprovalsCsv(exportRows, isRTL);
    downloadTextFile(csv, `approvals-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isRTL ? `تم تصدير ${exportRows.length} صف` : `Exported ${exportRows.length} rows`);
  };

  const downloadPDF = () => {
    const title = isRTL ? 'سجل قرارات الموافقات' : 'Approvals Decision Log';
    const headers = isRTL
      ? ['النوع', 'المعرف', 'الاسم', 'التفاصيل', 'تاريخ الإنشاء']
      : ['Category', 'Ref ID', 'Name', 'Detail', 'Created At'];
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast.error(isRTL ? 'تعذّر فتح نافذة الطباعة' : 'Print window blocked'); return; }
    const meta = `${isRTL ? 'تاريخ التصدير' : 'Exported'}: ${new Date().toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')} · ${exportRows.length} ${isRTL ? 'سجل' : 'records'}`;
    w.document.write(buildPdfHtml({
      title, isRTL, headers, meta,
      rows: exportRows.map((r) => [r.category, r.ref_id, r.name, r.detail, r.created_at]),
    }));
    w.document.close();
  };

  // ── Audit log: filter + export (uses shared dateRange + own search) ──
  const filteredAudit = useMemo<AuditRow[]>(
    () => filterAuditRows((auditQuery.data ?? []) as AuditRow[], auditSearch, dateRange),
    [auditQuery.data, auditSearch, dateRange],
  );

  const downloadAuditCSV = () => {
    const csv = buildAuditCsv(filteredAudit, isRTL);
    downloadTextFile(csv, `approvals-audit-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isRTL ? `تم تصدير ${filteredAudit.length} قرار` : `Exported ${filteredAudit.length} decisions`);
  };

  const downloadAuditPDF = () => {
    const title = isRTL ? 'سجل تدقيق قرارات الموافقات' : 'Approvals Audit Log';
    const headers = isRTL
      ? ['الإجراء', 'نوع الكيان', 'معرف الكيان', 'المستخدم', 'تاريخ القرار']
      : ['Action', 'Entity Type', 'Entity ID', 'User', 'Decision At'];
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast.error(isRTL ? 'تعذّر فتح نافذة الطباعة' : 'Print window blocked'); return; }
    const meta = `${isRTL ? 'تاريخ التصدير' : 'Exported'}: ${new Date().toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')} · ${filteredAudit.length} ${isRTL ? 'سجل' : 'records'}`;
    w.document.write(buildPdfHtml({
      title, isRTL, headers, meta,
      rows: filteredAudit.map((r) => [
        r.action, r.entity_type ?? '', r.entity_id ?? '', r.user_id ?? '', r.created_at ?? '',
      ]),
    }));
    w.document.close();
  };

  const catMap = useMemo(() => {
    const m = new Map<ApprovalCategoryKey, CategoryConfig>();
    CATEGORIES.forEach((c) => m.set(c.key, c));
    return m;
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading">
                {isRTL ? 'مركز الموافقات الموحّد' : 'Unified Approvals Center'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                {isRTL
                  ? 'كل طلبات الموافقة في قائمة واحدة — مرتبة حسب الأحدث، قابلة للتصفية والبحث، مع إجراءات مباشرة.'
                  : 'Every pending approval in one feed — sorted by recency, filterable, with inline actions.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-xl gap-1 px-3 h-9 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span className="tech-content font-semibold">{totals.total}</span>
              <span className="text-muted-foreground">
                {isRTL ? 'إجمالي قيد الانتظار' : 'pending total'}
              </span>
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5" disabled={unified.length === 0}>
                  <Download className="w-3.5 h-3.5" />
                  {isRTL ? 'تصدير' : 'Export'}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[11px]">
                  {isRTL ? `تصدير ${unified.length} صف` : `Export ${unified.length} rows`}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={downloadCSV} className="gap-2 text-xs">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadPDF} className="gap-2 text-xs">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={totals.anyLoading} className="rounded-xl gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${totals.anyLoading ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Filter chips + Search */}
        <div className="rounded-2xl border border-border/40 bg-card p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const chips: Array<{ key: 'all' | ApprovalCategoryKey; label: string; count: number; Icon: typeof ShieldCheck; tone: string }> = [
                { key: 'all', label: isRTL ? 'الكل' : 'All', count: totals.total, Icon: Filter, tone: 'from-primary/15 to-primary/5 text-primary' },
                ...CATEGORIES.map((c) => ({
                  key: c.key,
                  label: isRTL ? c.ar : c.en,
                  count: queries[c.key].data?.count ?? 0,
                  Icon: c.icon,
                  tone: c.tone,
                })),
              ];
              return chips.map((chip) => {
                const active = activeFilter === chip.key;
                const Icon = chip.Icon;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setActiveFilter(chip.key)}
                    className={`inline-flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium border transition-all ${
                      active
                        ? `bg-gradient-to-br ${chip.tone} border-transparent shadow-sm`
                        : 'border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{chip.label}</span>
                    <Badge
                      variant={active ? 'default' : 'outline'}
                      className="text-[10px] tech-content h-5 px-1.5"
                    >
                      {chip.count}
                    </Badge>
                  </button>
                );
              });
            })()}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 ms-3 text-muted-foreground pointer-events-none" style={{ insetInlineStart: '0.75rem' }} />
            <Input
              dir="auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? 'بحث بالاسم، المعرف، أو القيمة…' : 'Search name, ref, or value…'}
              className="h-10 ps-9 rounded-xl"
              style={{ paddingInlineStart: '2.25rem' }}
            />
          </div>
          {/* Date range chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-1">
              <CalendarIcon className="w-3 h-3" />
              {isRTL ? 'النطاق' : 'Range'}
            </span>
            {([
              { k: 'all', ar: 'الكل', en: 'All time' },
              { k: '24h', ar: 'آخر 24 ساعة', en: 'Last 24h' },
              { k: '7d', ar: 'آخر 7 أيام', en: 'Last 7d' },
              { k: '30d', ar: 'آخر 30 يوم', en: 'Last 30d' },
            ] as Array<{ k: DateRangeKey; ar: string; en: string }>).map((r) => (
              <button
                key={r.k}
                type="button"
                onClick={() => setDateRange(r.k)}
                className={`h-7 px-2.5 rounded-lg text-[11px] border transition-all ${
                  dateRange === r.k
                    ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                    : 'border-border/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {isRTL ? r.ar : r.en}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedRows.length > 0 && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-foreground">
              {isRTL
                ? `${selectedRows.length} محدد${selectedEntityAccess.length !== selectedRows.length ? ` (قابل للتنفيذ: ${selectedEntityAccess.length})` : ''}`
                : `${selectedRows.length} selected${selectedEntityAccess.length !== selectedRows.length ? ` (actionable: ${selectedEntityAccess.length})` : ''}`}
            </span>
            <div className="flex items-center gap-1.5 ms-auto">
              <Button
                size="sm" variant="outline"
                className="h-8 rounded-lg gap-1 text-success hover:text-success hover:border-success/40"
                disabled={bulkBusy || selectedEntityAccess.length === 0}
                onClick={() => handleBulk('approve')}
              >
                {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{isRTL ? 'موافقة دفعة' : 'Approve all'}</span>
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-8 rounded-lg gap-1 text-destructive hover:text-destructive hover:border-destructive/40"
                disabled={bulkBusy || selectedEntityAccess.length === 0}
                onClick={() => handleBulk('reject')}
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-[11px]">{isRTL ? 'رفض دفعة' : 'Reject all'}</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[11px]" onClick={clearSelection}>
                {isRTL ? 'إلغاء التحديد' : 'Clear'}
              </Button>
            </div>
          </div>
        )}

        {/* Unified feed */}
        <section className="rounded-2xl border border-border/40 bg-card overflow-hidden" aria-label={isRTL ? 'قائمة الموافقات' : 'Approvals feed'}>
          {totals.anyLoading && unified.length === 0 ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : unified.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                <Inbox className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isRTL ? 'لا توجد طلبات بانتظار الموافقة' : 'No pending approvals'}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {isRTL
                  ? 'كل الطلبات تمت معالجتها — جرّب تغيير التصفية أو البحث.'
                  : 'Everything is handled — try a different filter or search.'}
              </p>
            </div>
          ) : (
            <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleAllVisible}
                aria-label={isRTL ? 'تحديد الكل المرئي' : 'Select all visible'}
              />
              <span className="text-[11px] text-muted-foreground">
                {isRTL
                  ? `عرض ${visibleRows.length} من ${unified.length}`
                  : `Showing ${visibleRows.length} of ${unified.length}`}
              </span>
            </div>
            <ul className="divide-y divide-border/40">
              {visibleRows.map((it) => {
                const c = catMap.get(it.category)!;
                const Icon = c.icon;
                const isSelected = !!selected[rowKey(it)];
                return (
                  <li key={`${it.category}-${it.id}`}>
                    <div className={`flex items-center gap-3 px-4 py-3 transition-colors group ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(it)}
                        aria-label={isRTL ? 'تحديد' : 'Select'}
                      />
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.tone} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">{it.primary}</span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {isRTL ? c.ar : c.en}
                          </Badge>
                          <span className="tech-content text-[10px] text-muted-foreground">{it.refId}</span>
                          {it.secondary && (
                            <Badge variant="outline" className="text-[10px] tech-content h-5">{it.secondary}</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground tech-content mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {fmtDate(it.createdAt)}
                        </p>
                      </div>
                      {ACTIONABLE_CATEGORIES.has(it.category) ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 rounded-lg gap-1 text-success hover:text-success hover:border-success/40"
                            disabled={busyId === it.id}
                            onClick={() => handleReview(it.id, it.category, 'approve')}
                          >
                            {busyId === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span className="text-[11px]">{isRTL ? 'موافقة' : 'Approve'}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 rounded-lg gap-1 text-destructive hover:text-destructive hover:border-destructive/40"
                            disabled={busyId === it.id}
                            onClick={() => handleReview(it.id, it.category, 'reject')}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span className="text-[11px]">{isRTL ? 'رفض' : 'Reject'}</span>
                          </Button>
                        </div>
                      ) : (
                        <Link
                          to={c.href}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 h-8 rounded-lg border border-border/60 bg-card hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {isRTL ? 'فتح' : 'Open'}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="p-3 border-t border-border/40 flex justify-center">
                <Button
                  variant="outline" size="sm" className="rounded-xl gap-1.5"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  {isRTL ? `تحميل المزيد (${unified.length - visibleCount})` : `Load more (${unified.length - visibleCount})`}
                </Button>
              </div>
            )}
            </>
          )}
        </section>

        {/* Recent decisions — audit timeline */}
        <section className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0">
                <History className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {isRTL ? 'آخر القرارات الإدارية' : 'Recent admin decisions'}
                  <Badge variant="outline" className="text-[10px] tech-content">
                    {auditQuery.isLoading ? '…' : filteredAudit.length}
                  </Badge>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {isRTL
                    ? 'سجل تدقيق للموافقات والترقيات والأدوار — للقراءة فقط.'
                    : 'Read-only audit trail for approvals, tier overrides, and role changes.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-8" disabled={filteredAudit.length === 0}>
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{isRTL ? 'تصدير' : 'Export'}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-[11px]">
                    {isRTL ? `تصدير ${filteredAudit.length} قرار` : `Export ${filteredAudit.length} decisions`}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadAuditCSV} className="gap-2 text-xs">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadAuditPDF} className="gap-2 text-xs">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link
                to="/admin/audit-log"
                className="inline-flex items-center gap-1 text-xs px-3 h-8 rounded-lg border border-border/60 bg-card hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3 h-3" />
                {isRTL ? 'السجل الكامل' : 'Full log'}
              </Link>
            </div>
          </header>
          <div className="px-4 py-2 border-b border-border/40 bg-muted/10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" style={{ insetInlineStart: '0.75rem' }} />
              <Input
                dir="auto"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder={isRTL ? 'بحث في الإجراءات أو نوع الكيان أو المعرف…' : 'Search actions, entity type, or ID…'}
                className="h-8 rounded-lg text-xs"
                style={{ paddingInlineStart: '2rem' }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {isRTL
                ? `يطبّق نفس نطاق التاريخ المحدد أعلاه (${dateRange === 'all' ? 'الكل' : dateRange}).`
                : `Same date range as the feed above (${dateRange}).`}
            </p>
          </div>
          <div className="p-3">
            {auditQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            ) : filteredAudit.length === 0 ? (
              <div className="flex items-center gap-3 px-3 py-5 text-xs text-muted-foreground">
                <ShieldAlert className="w-4 h-4" />
                {isRTL ? 'لا توجد قرارات حديثة.' : 'No recent decisions.'}
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {filteredAudit.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate tech-content">{row.action}</span>
                        {row.entity_type && (
                          <Badge variant="outline" className="text-[10px] tech-content">{row.entity_type}</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground tech-content mt-0.5">
                        {fmtDate(row.created_at)}
                        {row.entity_id ? ` · ${(row.entity_id as string).slice(0, 8)}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Footer hint */}
        <p className="text-[10px] text-muted-foreground text-center">
          {isRTL
            ? 'الموافقة/الرفض المباشر متاح لطلبات الانضمام؛ بقية الأقسام تفتح صفحاتها المتخصصة لضمان التحقق الكامل.'
            : 'Inline approve/reject is enabled for entity access requests; other sections open their dedicated pages for full validation.'}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AdminApprovalsCenter;