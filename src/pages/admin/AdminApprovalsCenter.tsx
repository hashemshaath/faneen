import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, AtSign, UserPlus, Building2, Crown,
  Search, RefreshCw, Loader2, Check, X, Pencil, Inbox,
  CheckCircle2, Clock, XCircle, Filter, ArrowUpDown,
} from 'lucide-react';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  listPendingProviderReviewBusinesses,
  listPendingUsernameBusinesses,
} from '@/modules/businesses/services/listPendingApprovalBusinesses';
import { getReviewer } from '@/pages/admin/approvalsCenter/categoryReviewers';

/**
 * UNIFIED-APPROVALS-CENTER-FINAL
 * One screen, one filterable list. Merges the three previously separate
 * surfaces (Approvals Center, Businesses & Entities, Access Requests)
 * into a single command surface. No tabs, no "open" verbs — admins
 * filter, sort, search, and act inline on every pending item.
 */

type CategoryKey =
  | 'provider_review'
  | 'username'
  | 'entity_access'
  | 'business_verification'
  | 'subscription';

type StatusKey = 'pending' | 'approved' | 'rejected' | 'all';
type SortKey = 'newest' | 'oldest';

interface UnifiedItem {
  uid: string;                  // category + id (stable React key)
  id: string;                   // raw row id used by mutations
  businessId?: string | null;   // for deep CRUD link
  category: CategoryKey;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
  refId: string;
  primary: string;              // entity / business name
  secondary?: string | null;    // username / tier / ref
  createdAt: string | null;
}

const PAGE_SIZE = 25;

const CATEGORY_META: Record<CategoryKey, {
  icon: React.ComponentType<{ className?: string }>;
  ar: string; en: string;
  toneBg: string; toneFg: string;
}> = {
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

// ---------- Fetchers ----------------------------------------------------

async function fetchProviderReview(): Promise<UnifiedItem[]> {
  const { data } = await listPendingProviderReviewBusinesses(200);
  return data.map((r) => ({
    uid: `provider_review:${r.id}`,
    id: r.id,
    businessId: r.id,
    category: 'provider_review',
    status: 'pending',
    refId: r.ref_id ?? '—',
    primary: r.name_ar ?? r.name_en ?? r.username ?? r.ref_id ?? '—',
    secondary: r.approval_status,
    createdAt: r.submitted_at,
  }));
}

async function fetchUsername(): Promise<UnifiedItem[]> {
  const { data } = await listPendingUsernameBusinesses(200);
  return data.map((r) => ({
    uid: `username:${r.id}`,
    id: r.id,
    businessId: r.id,
    category: 'username',
    status: 'pending',
    refId: r.ref_id ?? '—',
    primary: r.name_ar ?? r.name_en ?? r.ref_id ?? '—',
    secondary: r.username ? `@${r.username}` : null,
    createdAt: r.created_at,
  }));
}

async function fetchEntityAccess(): Promise<UnifiedItem[]> {
  const { data } = await supabase
    .from('entity_access_requests')
    .select(
      'id, ref_id, status, target_business_id, target_ref, created_at, target_business:target_business_id(ref_id, name_ar, name_en)',
    )
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
    uid: `entity_access:${r.id}`,
    id: r.id,
    businessId: r.target_business_id,
    category: 'entity_access',
    status: r.status,
    refId: r.ref_id ?? '—',
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
    uid: `business_verification:${r.id}`,
    id: r.id,
    businessId: r.id,
    category: 'business_verification',
    status: 'pending',
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
    uid: `subscription:${r.id}`,
    id: r.id,
    businessId: r.business_id,
    category: 'subscription',
    status: r.status,
    refId: r.ref_id ?? '—',
    primary: r.business?.name_ar ?? r.business?.name_en ?? r.business?.ref_id ?? '—',
    secondary: r.plan?.name_ar ?? r.plan?.name_en ?? r.plan?.tier ?? null,
    createdAt: r.created_at,
  }));
}

// ---------- Page --------------------------------------------------------

const AdminApprovalsCenter: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'مركز الموافقات الموحد' : 'Unified Approvals Center', noindex: true });
  useNoIndex();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey | 'all'>('all');
  const [status, setStatus] = useState<StatusKey>('pending');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<Record<string, 'approve' | 'reject' | null>>({});

  const queries = [
    useQuery({ queryKey: ['ua', 'provider_review'],       queryFn: fetchProviderReview,       staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'username'],              queryFn: fetchUsername,             staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'entity_access'],         queryFn: fetchEntityAccess,         staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'business_verification'], queryFn: fetchBusinessVerification, staleTime: 30_000 }),
    useQuery({ queryKey: ['ua', 'subscription'],          queryFn: fetchSubscriptions,        staleTime: 30_000 }),
  ];
  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);

  const allItems = useMemo<UnifiedItem[]>(() => {
    return queries.flatMap((q) => q.data ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => q.dataUpdatedAt).join('|')]);

  // Stats per category (always show overall pending count)
  const stats = useMemo(() => {
    const counters: Record<CategoryKey, number> = {
      provider_review: 0, username: 0, entity_access: 0,
      business_verification: 0, subscription: 0,
    };
    let totalPending = 0;
    for (const it of allItems) {
      if (it.status === 'pending') {
        counters[it.category] += 1;
        totalPending += 1;
      }
    }
    return { counters, totalPending };
  }, [allItems]);

  // Filter pipeline
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
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
  }, [allItems, search, category, status, sort]);

  useEffect(() => { setPage(1); }, [search, category, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const refreshAll = () => {
    queries.forEach((q) => q.refetch());
    qc.invalidateQueries({ queryKey: ['unified-approvals-counts'] });
  };

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

  const categoryChips: Array<{ key: CategoryKey | 'all'; ar: string; en: string; count?: number }> = [
    { key: 'all', ar: 'الكل', en: 'All', count: stats.totalPending },
    { key: 'provider_review',       ar: 'مزوّدون',     en: 'Providers',     count: stats.counters.provider_review },
    { key: 'business_verification', ar: 'توثيق منشآت', en: 'Verification',  count: stats.counters.business_verification },
    { key: 'username',              ar: 'أسماء مستخدمين', en: 'Usernames', count: stats.counters.username },
    { key: 'entity_access',         ar: 'طلبات انضمام', en: 'Access',      count: stats.counters.entity_access },
    { key: 'subscription',          ar: 'اشتراكات',    en: 'Subscriptions', count: stats.counters.subscription },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AdminPageHeader
          icon={ShieldCheck}
          title={isRTL ? 'مركز الموافقات الموحد' : 'Unified Approvals Center'}
          subtitle={isRTL
            ? 'قائمة واحدة شاملة لكل ما يحتاج مراجعة: مزوّدون، توثيق منشآت، أسماء مستخدمين، طلبات انضمام، اشتراكات.'
            : 'Single command surface for every pending review: providers, verification, usernames, access, subscriptions.'}
          actions={
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={isFetching} className="gap-2">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          }
        />

        {/* Category chips with live counts */}
        <div className="flex flex-wrap gap-2">
          {categoryChips.map((c) => {
            const active = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 h-10 text-sm transition-all hover-lift ${
                  active ? 'bg-primary text-primary-foreground border-primary shadow-elev-1' : 'bg-card border-border hover:border-primary/40'
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
        <div className="rounded-2xl border bg-card p-3 md:p-4 shadow-elev-1">
          <div className="flex flex-wrap items-center gap-2">
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
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{isRTL ? `${filtered.length} عنصر` : `${filtered.length} items`}</span>
            <span>{isRTL ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
          </div>
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
                return (
                  <li key={it.uid} className="p-3 md:p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
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
                              {new Date(it.createdAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
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
    </DashboardLayout>
  );
};

export default AdminApprovalsCenter;