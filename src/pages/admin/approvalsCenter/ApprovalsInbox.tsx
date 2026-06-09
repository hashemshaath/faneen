import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, AtSign, UserPlus, Building2, Crown,
  Search, RefreshCw, Loader2, Check, X, Pencil, Inbox,
  CheckCircle2, Clock, XCircle, Filter, ArrowUpDown, Layers, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  listPendingProviderReviewBusinesses,
  listPendingUsernameBusinesses,
  listAllBusinessesEnriched,
} from '@/modules/businesses/services/listPendingApprovalBusinesses';
import { getReviewer } from '@/pages/admin/approvalsCenter/categoryReviewers';
import { runBulkReview } from '@/pages/admin/approvalsCenter/bulkReview';

/**
 * ApprovalsInbox — extracted, layout-free unified approvals list.
 * Hosted by AdminIdentity (tab="approvals") so the Account Center and
 * Approvals Center are one merged surface. No header, no DashboardLayout.
 */

type CategoryKey =
  | 'provider_review'
  | 'username'
  | 'entity_access'
  | 'business_verification'
  | 'subscription'
  | 'all_businesses';

type StatusKey = 'pending' | 'approved' | 'rejected' | 'all';
type SortKey = 'newest' | 'oldest';

interface UnifiedItem {
  uid: string;
  id: string;
  businessId?: string | null;
  category: CategoryKey;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
  refId: string;
  primary: string;
  secondary?: string | null;
  createdAt: string | null;
  /** Optional enriched payload used by the "all_businesses" comprehensive view. */
  meta?: {
    approvalStatus?: string | null;
    usernameStatus?: string | null;
    isActive?: boolean | null;
    isVerified?: boolean | null;
    isDemo?: boolean | null;
    tier?: string | null;
    completion?: number | null;
    lastActiveAt?: string | null;
    username?: string | null;
  };
}

const PAGE_SIZE = 25;

const CATEGORY_META: Record<CategoryKey, {
  icon: React.ComponentType<{ className?: string }>;
  ar: string; en: string;
  toneBg: string; toneFg: string;
}> = {
  all_businesses:        { icon: Layers,      ar: 'كل الجهات',          en: 'All entities',        toneBg: 'bg-info/10',        toneFg: 'text-info' },
  provider_review:       { icon: ShieldCheck, ar: 'مراجعة مزوّد',     en: 'Provider review',     toneBg: 'bg-primary/10',     toneFg: 'text-primary' },
  username:              { icon: AtSign,      ar: 'اسم مستخدم',        en: 'Username',            toneBg: 'bg-accent/10',      toneFg: 'text-accent-foreground' },
  entity_access:         { icon: UserPlus,    ar: 'طلب انضمام',         en: 'Access request',      toneBg: 'bg-success/10',     toneFg: 'text-success' },
  business_verification: { icon: Building2,   ar: 'توثيق منشأة',       en: 'Verification',        toneBg: 'bg-warning/10',     toneFg: 'text-warning' },
  subscription:          { icon: Crown,       ar: 'اشتراك عضوية',      en: 'Subscription',        toneBg: 'bg-muted',          toneFg: 'text-muted-foreground' },
};

const STATUS_META: Record<string, { ar: string; en: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:   { ar: 'قيد المراجعة', en: 'Pending',   icon: Clock,        className: 'bg-warning/10 text-warning border-warning/30' },
  approved:  { ar: 'مُعتمد',        en: 'Approved',  icon: CheckCircle2, className: 'bg-success/10 text-success border-success/30' },
  rejected:  { ar: 'مرفوض',        en: 'Rejected',  icon: XCircle,      className: 'bg-destructive/10 text-destructive border-destructive/30' },
  cancelled: { ar: 'ملغى',         en: 'Cancelled', icon: XCircle,      className: 'bg-muted text-muted-foreground border-border' },
};

async function fetchProviderReview(): Promise<UnifiedItem[]> {
  const { data } = await listPendingProviderReviewBusinesses(200);
  return data.map((r) => ({
    uid: `provider_review:${r.id}`, id: r.id, businessId: r.id,
    category: 'provider_review', status: 'pending',
    refId: r.ref_id ?? '—',
    primary: r.name_ar ?? r.name_en ?? r.username ?? r.ref_id ?? '—',
    secondary: r.approval_status, createdAt: r.submitted_at,
  }));
}

async function fetchUsername(): Promise<UnifiedItem[]> {
  const { data } = await listPendingUsernameBusinesses(200);
  return data.map((r) => ({
    uid: `username:${r.id}`, id: r.id, businessId: r.id,
    category: 'username', status: 'pending',
    refId: r.ref_id ?? '—',
    primary: r.name_ar ?? r.name_en ?? r.ref_id ?? '—',
    secondary: r.username ? `@${r.username}` : null,
    createdAt: r.created_at,
  }));
}

async function fetchEntityAccess(): Promise<UnifiedItem[]> {
  const { data } = await supabase
    .from('entity_access_requests')
    .select('id, ref_id, status, target_business_id, target_ref, created_at, target_business:target_business_id(ref_id, name_ar, name_en)')
    .in('status', ['pending', 'approved', 'rejected', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Array<{
    id: string; ref_id: string | null; status: string;
    target_business_id: string | null; target_ref: string | null;
    created_at: string | null;
    target_business: { ref_id: string | null; name_ar: string | null; name_en: string | null } | null;
  }>;
  return rows.map((r) => ({
    uid: `entity_access:${r.id}`, id: r.id, businessId: r.target_business_id,
    category: 'entity_access', status: r.status, refId: r.ref_id ?? '—',
    primary: r.target_business?.name_ar ?? r.target_business?.name_en ?? r.target_ref ?? '—',
    secondary: r.target_business?.ref_id ?? r.target_ref ?? null,
    createdAt: r.created_at,
  }));
}

async function fetchBusinessVerification(): Promise<UnifiedItem[]> {
  const { data } = await supabase
    .from('businesses')
    .select('id, ref_id, name_ar, name_en, username, is_verified, approval_status, created_at')
    .eq('is_verified', false as never)
    .neq('approval_status', 'draft' as never)
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Array<{
    id: string; ref_id: string | null; name_ar: string | null; name_en: string | null;
    username: string | null; approval_status: string | null; created_at: string | null;
  }>;
  return rows.map((r) => ({
    uid: `business_verification:${r.id}`, id: r.id, businessId: r.id,
    category: 'business_verification', status: 'pending',
    refId: r.ref_id ?? '—',
    primary: r.name_ar ?? r.name_en ?? r.ref_id ?? '—',
    secondary: r.username ? `@${r.username}` : r.approval_status,
    createdAt: r.created_at,
  }));
}

async function fetchSubscriptions(): Promise<UnifiedItem[]> {
  const { data } = await supabase
    .from('membership_subscriptions')
    .select('id, ref_id, status, business_id, created_at, plan:plan_id(tier, name_ar, name_en), business:business_id(ref_id, name_ar, name_en)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Array<{
    id: string; ref_id: string | null; status: string; business_id: string | null; created_at: string | null;
    plan: { tier: string | null; name_ar: string | null; name_en: string | null } | null;
    business: { ref_id: string | null; name_ar: string | null; name_en: string | null } | null;
  }>;
  return rows.map((r) => ({
    uid: `subscription:${r.id}`, id: r.id, businessId: r.business_id,
    category: 'subscription', status: r.status, refId: r.ref_id ?? '—',
    primary: r.business?.name_ar ?? r.business?.name_en ?? r.business?.ref_id ?? '—',
    secondary: r.plan?.name_ar ?? r.plan?.name_en ?? r.plan?.tier ?? null,
    createdAt: r.created_at,
  }));
}

/**
 * Comprehensive enriched listing of every registered business — drives the
 * "All entities" category so admins see status, approval, username, tier,
 * verification, completion %, last activity and demo flag in one place.
 */
async function fetchAllBusinesses(): Promise<UnifiedItem[]> {
  const { data } = await listAllBusinessesEnriched(500);
  return data.map((r) => {
    // Map approval_status to the inbox' status taxonomy so the global
    // status filter still works on this category.
    const status: UnifiedItem['status'] =
      r.approval_status === 'published' || r.approval_status === 'approved'
        ? 'approved'
        : r.approval_status === 'rejected'
        ? 'rejected'
        : r.approval_status === 'submitted' || r.approval_status === 'under_review'
        ? 'pending'
        : (r.approval_status ?? 'pending');
    return {
      uid: `all_businesses:${r.id}`,
      id: r.id,
      businessId: r.id,
      category: 'all_businesses',
      status,
      refId: r.ref_id ?? '—',
      primary: r.name_ar ?? r.name_en ?? r.username ?? r.ref_id ?? '—',
      secondary: r.username ? `@${r.username}` : (r.name_en ?? null),
      createdAt: r.last_active_at ?? r.updated_at ?? r.created_at,
      meta: {
        approvalStatus: r.approval_status,
        usernameStatus: r.username_status,
        isActive: r.is_active,
        isVerified: r.is_verified,
        isDemo: r.is_demo,
        tier: r.membership_tier,
        completion: r.onboarding_completion,
        lastActiveAt: r.last_active_at,
        username: r.username,
      },
    };
  });
}

export interface ApprovalsInboxProps {
  /** Compact mode hides the secondary text helper at the bottom of the filter bar. */
  compact?: boolean;
  /** When provided, overrides the internal search box (unified tab search). */
  externalSearch?: string;
}

const FILTERS_KEY = 'qitaat_approvals_inbox_filters_v1';
interface PersistedFilters { category: CategoryKey | 'all'; status: StatusKey; sort: SortKey }
function loadFilters(): PersistedFilters | null {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    return raw ? JSON.parse(raw) as PersistedFilters : null;
  } catch { return null; }
}

export const ApprovalsInbox: React.FC<ApprovalsInboxProps> = ({ compact = false, externalSearch }) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const persisted = useMemo(() => loadFilters(), []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey | 'all'>(persisted?.category ?? 'all');
  const [status, setStatus] = useState<StatusKey>(persisted?.status ?? 'pending');
  const [sort, setSort] = useState<SortKey>(persisted?.sort ?? 'newest');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<Record<string, 'approve' | 'reject' | null>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<null | { action: 'approve' | 'reject'; items: UnifiedItem[] }>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const effectiveSearch = (externalSearch ?? '') || search;

  // Switching into "All entities" should not be hidden by the default
  // pending-only filter — auto-broaden to "all statuses" the first time.
  useEffect(() => {
    if (category === 'all_businesses' && status === 'pending') {
      setStatus('all');
    }
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist filter selections (per-tab feel; this tab's state lives here).
  useEffect(() => {
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify({ category, status, sort })); } catch { /* ignore */ }
  }, [category, status, sort]);

  const queries = [
    useQuery({ queryKey: ['ua', 'provider_review'],       queryFn: fetchProviderReview,       staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'username'],              queryFn: fetchUsername,             staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'entity_access'],         queryFn: fetchEntityAccess,         staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'business_verification'], queryFn: fetchBusinessVerification, staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'subscription'],          queryFn: fetchSubscriptions,        staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'all_businesses'],        queryFn: fetchAllBusinesses,        staleTime: 60_000 }),
  ];
  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);

  const allItems = useMemo<UnifiedItem[]>(
    () => queries.flatMap((q) => q.data ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries.map((q) => q.dataUpdatedAt).join('|')],
  );

  const stats = useMemo(() => {
    const counters: Record<CategoryKey, number> = {
      all_businesses: 0, provider_review: 0, username: 0, entity_access: 0,
      business_verification: 0, subscription: 0,
    };
    let totalPending = 0;
    for (const it of allItems) {
      if (it.status === 'pending') {
        counters[it.category] += 1;
        totalPending += 1;
      }
      // For the all-entities view we want the chip count to reflect total
      // registered businesses, not just pending ones.
      if (it.category === 'all_businesses' && it.status !== 'pending') {
        counters.all_businesses += 1;
      }
    }
    return { counters, totalPending };
  }, [allItems]);

  const filtered = useMemo(() => {
    const q = effectiveSearch.trim().toLowerCase();
    let arr = allItems;
    if (category !== 'all') arr = arr.filter((i) => i.category === category);
    if (status !== 'all') arr = arr.filter((i) => i.status === status);
    if (q) {
      arr = arr.filter((i) =>
        i.primary.toLowerCase().includes(q) ||
        i.refId.toLowerCase().includes(q) ||
        (i.secondary ?? '').toLowerCase().includes(q),
      );
    }
    arr = [...arr].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return sort === 'newest' ? tb - ta : ta - tb;
    });
    return arr;
  }, [allItems, effectiveSearch, category, status, sort]);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [effectiveSearch, category, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const refreshAll = () => {
    queries.forEach((q) => q.refetch());
    qc.invalidateQueries({ queryKey: ['unified-approvals-counts'] });
  };

  // Realtime: toast + refetch when a new pending item lands in any tracked surface.
  useEffect(() => {
    const notify = (msgAr: string, msgEn: string) => {
      toast.message(isRTL ? msgAr : msgEn, {
        description: isRTL ? 'تم تحديث صندوق الموافقات.' : 'Approvals inbox updated.',
      });
    };
    const ch = supabase
      .channel('approvals-inbox-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entity_access_requests' }, () => {
        notify('طلب انضمام جديد', 'New access request');
        qc.invalidateQueries({ queryKey: ['ua', 'entity_access'] });
        qc.invalidateQueries({ queryKey: ['unified-approvals-counts'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'entity_access_requests' }, () => {
        qc.invalidateQueries({ queryKey: ['ua', 'entity_access'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'businesses' }, () => {
        notify('منشأة جديدة بانتظار المراجعة', 'New business pending review');
        qc.invalidateQueries({ queryKey: ['ua', 'business_verification'] });
        qc.invalidateQueries({ queryKey: ['ua', 'provider_review'] });
        qc.invalidateQueries({ queryKey: ['unified-approvals-counts'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'businesses' }, () => {
        qc.invalidateQueries({ queryKey: ['ua', 'business_verification'] });
        qc.invalidateQueries({ queryKey: ['ua', 'provider_review'] });
        qc.invalidateQueries({ queryKey: ['ua', 'username'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'membership_subscriptions' }, () => {
        qc.invalidateQueries({ queryKey: ['ua', 'subscription'] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc, isRTL]);

  async function actOn(item: UnifiedItem, action: 'approve' | 'reject') {
    if (!user?.id) { toast.error(isRTL ? 'يلزم تسجيل الدخول' : 'Sign-in required'); return; }
    const fn = getReviewer(item.category);
    if (!fn) {
      toast.info(isRTL ? 'هذا النوع يحتاج صفحة التفاصيل' : 'This type opens in its detail page');
      return;
    }
    setBusy((b) => ({ ...b, [item.uid]: action }));
    try {
      const res = await fn({ requestId: item.id, reviewerUserId: user.id, action });
      if (res.ok) {
        toast.success(isRTL
          ? action === 'approve' ? 'تمت الموافقة' : 'تم الرفض'
          : action === 'approve' ? 'Approved' : 'Rejected');
        refreshAll();
      } else {
        const msg = (res.error as { message?: string } | null)?.message ?? '';
        toast.error((isRTL ? 'تعذّر التنفيذ: ' : 'Action failed: ') + msg);
      }
    } finally {
      setBusy((b) => ({ ...b, [item.uid]: null }));
    }
  }

  // Selection helpers
  const selectableOnPage = pageItems.filter((i) => i.status === 'pending' && !!getReviewer(i.category));
  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((i) => selected.has(i.uid));
  function toggleOne(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }
  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) selectableOnPage.forEach((i) => next.delete(i.uid));
      else selectableOnPage.forEach((i) => next.add(i.uid));
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }

  const selectedItems = useMemo(
    () => filtered.filter((i) => selected.has(i.uid) && !!getReviewer(i.category)),
    [filtered, selected],
  );

  function requestBulk(action: 'approve' | 'reject') {
    if (selectedItems.length === 0) return;
    setConfirm({ action, items: selectedItems });
  }

  async function runBulk() {
    if (!confirm || !user?.id) return;
    setBulkRunning(true);
    const summary = await runBulkReview({
      items: confirm.items.map((i) => ({ id: i.id, category: i.category })),
      action: confirm.action,
      reviewerUserId: user.id,
      getReviewer,
    });
    setBulkRunning(false);
    setConfirm(null);
    clearSelection();
    refreshAll();
    if (summary.fail === 0) {
      toast.success(isRTL
        ? `تم تنفيذ ${summary.ok} عنصر`
        : `Completed ${summary.ok} item(s)`);
    } else {
      toast.warning(isRTL
        ? `نجاح ${summary.ok} · فشل ${summary.fail}`
        : `${summary.ok} ok · ${summary.fail} failed`);
    }
  }

  /**
   * Quick-fix action that flips an `approved` business to `published`
   * so it becomes visible inside the public `businesses_public` view
   * (and therefore inside the user-facing search). Hidden on rows that
   * are already published, demo, or in a non-approved state.
   */
  async function publishNow(item: UnifiedItem) {
    if (!item.businessId) return;
    setPublishing((p) => ({ ...p, [item.uid]: true }));
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ approval_status: 'published' as never })
        .eq('id', item.businessId);
      if (error) {
        toast.error((isRTL ? 'تعذّر النشر: ' : 'Publish failed: ') + (error.message ?? ''));
      } else {
        toast.success(isRTL ? 'تم النشر — أصبحت الجهة ظاهرة في البحث' : 'Published — entity is now visible in search');
        refreshAll();
      }
    } finally {
      setPublishing((p) => ({ ...p, [item.uid]: false }));
    }
  }

  const categoryChips: Array<{ key: CategoryKey | 'all'; ar: string; en: string; count?: number }> = [
    { key: 'all', ar: 'الكل', en: 'All', count: stats.totalPending },
    { key: 'all_businesses',        ar: 'كل الجهات',        en: 'All entities',  count: stats.counters.all_businesses },
    { key: 'provider_review',       ar: 'مزوّدون',         en: 'Providers',     count: stats.counters.provider_review },
    { key: 'business_verification', ar: 'توثيق منشآت',     en: 'Verification',  count: stats.counters.business_verification },
    { key: 'username',              ar: 'أسماء مستخدمين',  en: 'Usernames',     count: stats.counters.username },
    { key: 'entity_access',         ar: 'طلبات انضمام',     en: 'Access',        count: stats.counters.entity_access },
    { key: 'subscription',          ar: 'اشتراكات',        en: 'Subscriptions', count: stats.counters.subscription },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar header (refresh) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Inbox className="h-4 w-4" />
          <span>{isRTL ? 'صندوق الموافقات الموحّد' : 'Unified approvals inbox'}</span>
          {stats.totalPending > 0 && (
            <Badge variant="outline" className="tech-content border-warning/40 text-warning">
              {stats.totalPending}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {isRTL ? `محدّد: ${selected.size}` : `${selected.size} selected`}
              </span>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 border-success/40 text-success hover:bg-success/10"
                onClick={() => requestBulk('approve')}>
                <Check className="h-4 w-4" /> {isRTL ? 'موافقة الكل' : 'Approve all'}
              </Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => requestBulk('reject')}>
                <X className="h-4 w-4" /> {isRTL ? 'رفض الكل' : 'Reject all'}
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={clearSelection}>
                {isRTL ? 'إلغاء' : 'Clear'}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={isFetching} className="gap-2 h-9">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {categoryChips.map((c) => {
          const active = category === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 h-10 text-sm transition-all hover-lift ${
                active ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/40'
              }`}
            >
              <span className="font-medium">{isRTL ? c.ar : c.en}</span>
              {typeof c.count === 'number' && c.count > 0 && (
                <span className={`tech-content rounded-full px-2 py-0.5 text-xs ${
                  active ? 'bg-primary-foreground/20' : 'bg-muted'
                }`}>{c.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border bg-card p-3 md:p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {externalSearch === undefined && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className={`h-4 w-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث بالاسم، الرقم التعريفي، أو اسم المستخدم…' : 'Search by name, reference, or username…'}
                className={`h-11 ${isRTL ? 'pr-9' : 'pl-9'}`}
                dir="auto"
              />
            </div>
          )}
          <Select value={status} onValueChange={(v) => setStatus(v as StatusKey)}>
            <SelectTrigger className="h-11 w-[160px] gap-2"><Filter className="h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{isRTL ? 'قيد المراجعة' : 'Pending'}</SelectItem>
              <SelectItem value="approved">{isRTL ? 'مُعتمد' : 'Approved'}</SelectItem>
              <SelectItem value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</SelectItem>
              <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-11 w-[150px] gap-2"><ArrowUpDown className="h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{isRTL ? 'الأحدث' : 'Newest'}</SelectItem>
              <SelectItem value="oldest">{isRTL ? 'الأقدم' : 'Oldest'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!compact && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-3">
              {selectableOnPage.length > 0 && (
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={allOnPageSelected} onCheckedChange={togglePage} aria-label="select page" />
                  <span>{isRTL ? 'تحديد كل ما في الصفحة' : 'Select all on page'}</span>
                </label>
              )}
              <span>{isRTL ? `${filtered.length} عنصر` : `${filtered.length} items`}</span>
            </span>
            <span>{isRTL ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
          </div>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-base font-medium">{isRTL ? 'لا توجد عناصر مطابقة' : 'No matching items'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'جرّب تغيير التصنيف أو الحالة أو البحث.' : 'Try a different category, status, or search.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {pageItems.map((it) => {
              const cat = CATEGORY_META[it.category];
              const st = STATUS_META[it.status] ?? STATUS_META.pending;
              const CatIcon = cat.icon;
              const StIcon = st.icon;
              const b = busy[it.uid];
              const canAct = it.status === 'pending' && !!getReviewer(it.category);
              const isSelected = selected.has(it.uid);
              return (
                <li key={it.uid} className="p-3 md:p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {canAct ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(it.uid)}
                        className="shrink-0"
                        aria-label="select row"
                      />
                    ) : (
                      <span className="w-4 h-4 shrink-0" aria-hidden />
                    )}
                    <div className={`shrink-0 h-10 w-10 rounded-xl grid place-items-center ${cat.toneBg} ${cat.toneFg}`}>
                      <CatIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate" dir="auto">{it.primary}</span>
                        <Badge variant="outline" className="tech-content text-[10px] font-normal">{it.refId}</Badge>
                        <Badge variant="outline" className={`gap-1 text-[10px] ${st.className}`}>
                          <StIcon className="h-3 w-3" />{isRTL ? st.ar : st.en}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{isRTL ? cat.ar : cat.en}</span>
                        {it.secondary && <span className="truncate" dir="auto">{it.secondary}</span>}
                        {it.createdAt && (
                          <span className="tech-content">
                            {new Date(it.createdAt).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                          </span>
                        )}
                      </div>
                      {it.meta && (
                        <div className="mt-2 flex items-center flex-wrap gap-1.5">
                          {it.meta.approvalStatus && (
                            <Badge variant="outline" className={`text-[10px] ${
                              it.meta.approvalStatus === 'published' ? 'border-success/40 text-success' :
                              it.meta.approvalStatus === 'approved' ? 'border-info/40 text-info' :
                              it.meta.approvalStatus === 'rejected' ? 'border-destructive/40 text-destructive' :
                              it.meta.approvalStatus === 'draft' ? 'border-border text-muted-foreground' :
                              'border-warning/40 text-warning'
                            }`}>
                              {isRTL ? 'الاعتماد: ' : 'Approval: '}{it.meta.approvalStatus}
                            </Badge>
                          )}
                          {it.meta.usernameStatus && it.meta.usernameStatus !== 'approved' && (
                            <Badge variant="outline" className="text-[10px] border-accent/40">
                              {isRTL ? 'اسم المستخدم: ' : 'Username: '}{it.meta.usernameStatus}
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] ${
                            it.meta.isActive ? 'border-success/40 text-success' : 'border-muted text-muted-foreground'
                          }`}>
                            {it.meta.isActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'موقوف' : 'Inactive')}
                          </Badge>
                          {it.meta.isVerified && (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">
                              <ShieldCheck className="h-2.5 w-2.5 me-1" />{isRTL ? 'موثّقة' : 'Verified'}
                            </Badge>
                          )}
                          {it.meta.isDemo && (
                            <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
                              {isRTL ? 'تجريبي' : 'Demo'}
                            </Badge>
                          )}
                          {it.meta.tier && (
                            <Badge variant="outline" className="text-[10px]">
                              <Crown className="h-2.5 w-2.5 me-1" />{it.meta.tier}
                            </Badge>
                          )}
                          {typeof it.meta.completion === 'number' && (
                            <Badge variant="outline" className={`text-[10px] tech-content ${
                              it.meta.completion >= 80 ? 'border-success/40 text-success' :
                              it.meta.completion >= 40 ? 'border-warning/40 text-warning' :
                              'border-destructive/40 text-destructive'
                            }`}>
                              {isRTL ? 'الاكتمال: ' : 'Completion: '}{it.meta.completion}%
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {it.meta && it.meta.approvalStatus === 'approved' && !it.meta.isDemo && (
                        <Button
                          size="sm" variant="outline"
                          className="h-9 px-3 gap-1.5 border-info/40 text-info hover:bg-info/10"
                          disabled={!!publishing[it.uid]}
                          onClick={() => publishNow(it)}
                          title={isRTL ? 'نشر الجهة لتظهر في البحث' : 'Publish to make it discoverable'}
                        >
                          {publishing[it.uid] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                          <span className="hidden md:inline">{isRTL ? 'نشر' : 'Publish'}</span>
                        </Button>
                      )}
                      {canAct && (
                        <>
                          <Button
                            size="sm" variant="outline"
                            className="h-9 px-3 gap-1.5 border-success/40 text-success hover:bg-success/10"
                            disabled={!!b}
                            onClick={() => actOn(it, 'approve')}
                            title={isRTL ? 'موافقة' : 'Approve'}
                          >
                            {b === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="h-9 px-3 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={!!b}
                            onClick={() => actOn(it, 'reject')}
                            title={isRTL ? 'رفض' : 'Reject'}
                          >
                            {b === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                      {it.businessId && (
                        <Button size="sm" variant="ghost" className="h-9 px-3" asChild title={isRTL ? 'تحرير' : 'Edit'}>
                          <Link to={`/admin/businesses?focus=${it.businessId}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bulk confirm dialog */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o && !bulkRunning) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === 'approve'
                ? (isRTL ? 'تأكيد الموافقة الجماعية' : 'Confirm bulk approval')
                : (isRTL ? 'تأكيد الرفض الجماعي' : 'Confirm bulk rejection')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `سيتم تنفيذ الإجراء على ${confirm?.items.length ?? 0} عنصر. لا يمكن التراجع.`
                : `This will run on ${confirm?.items.length ?? 0} item(s) and cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void runBulk(); }}
              disabled={bulkRunning}
              className={confirm?.action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {bulkRunning && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {confirm?.action === 'approve'
                ? (isRTL ? 'موافقة' : 'Approve')
                : (isRTL ? 'رفض' : 'Reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {isRTL ? 'السابق' : 'Previous'}
          </Button>
          <span className="text-sm text-muted-foreground tech-content px-3">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            {isRTL ? 'التالي' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ApprovalsInbox;