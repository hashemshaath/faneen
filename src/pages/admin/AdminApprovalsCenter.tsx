import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, UserPlus, Crown, ArrowUp, AtSign, Inbox,
  ExternalLink, RefreshCw, Loader2, CheckCircle2, Clock, Building2,
  Check, X, History, ShieldAlert,
} from 'lucide-react';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { reviewEntityAccessRequest } from '@/modules/entities/services/access/reviewEntityAccessRequest';
import { toast } from 'sonner';

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

const PREVIEW_LIMIT = 5;

async function fetchProviderReview(): Promise<CategoryResult> {
  const { data, count, error } = await supabase
    .from('businesses')
    .select('id, ref_id, name_ar, name_en, username, submitted_at, approval_status', { count: 'exact' })
    .in('approval_status', ['submitted', 'under_review'] as never[])
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(PREVIEW_LIMIT);
  if (error) return { count: 0, items: [] };
  return {
    count: count ?? 0,
    items: (data ?? []).map((r) => ({
      id: r.id,
      refId: r.ref_id ?? '—',
      primary: r.name_ar ?? r.name_en ?? r.username ?? r.ref_id ?? '—',
      secondary: r.approval_status as string | null,
      createdAt: r.submitted_at as string | null,
    })),
  };
}

async function fetchUsername(): Promise<CategoryResult> {
  const { data, count, error } = await supabase
    .from('businesses')
    .select('id, ref_id, name_ar, name_en, username, created_at, username_status', { count: 'exact' })
    .eq('username_status', 'pending' as never)
    .order('created_at', { ascending: false })
    .limit(PREVIEW_LIMIT);
  if (error) return { count: 0, items: [] };
  return {
    count: count ?? 0,
    items: (data ?? []).map((r) => ({
      id: r.id,
      refId: r.ref_id ?? '—',
      primary: r.name_ar ?? r.name_en ?? r.ref_id ?? '—',
      secondary: r.username ? `qitaat.com/${r.username}` : null,
      createdAt: r.created_at as string | null,
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
    provider_review: useQuery({ queryKey: ['approvals', 'provider_review'], queryFn: fetchProviderReview, staleTime: 30_000 }),
    username:        useQuery({ queryKey: ['approvals', 'username'],        queryFn: fetchUsername,       staleTime: 30_000 }),
    entity_access:   useQuery({ queryKey: ['approvals', 'entity_access'],   queryFn: fetchEntityAccess,   staleTime: 30_000 }),
    subscriptions:   useQuery({ queryKey: ['approvals', 'subscriptions'],   queryFn: fetchSubscriptions,  staleTime: 30_000 }),
    upgrades:        useQuery({ queryKey: ['approvals', 'upgrades'],        queryFn: fetchUpgrades,       staleTime: 30_000 }),
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

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    if (!user?.id) return;
    setBusyId(id);
    const { ok, error } = await reviewEntityAccessRequest({
      requestId: id, reviewerUserId: user.id, action,
    });
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
    queries.entity_access.refetch();
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
                  ? 'نقطة دخول واحدة لكل طلبات الموافقة عبر المنصة — مراجعة المزودين، أسماء المستخدمين، الانضمام للمنشآت، الاشتراكات والترقيات.'
                  : 'A single entry point for every pending approval across the platform — provider reviews, usernames, entity access, subscriptions, and upgrades.'}
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
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={totals.anyLoading} className="rounded-xl gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${totals.anyLoading ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {CATEGORIES.map((c) => {
            const q = queries[c.key];
            const count = q.data?.count ?? 0;
            const Icon = c.icon;
            return (
              <Link
                key={c.key}
                to={c.href}
                className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br ${c.tone} p-4 transition-all hover-lift hover:border-border focus:outline-none focus-visible:ring-2 ${c.ring}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-card/70 backdrop-blur flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {q.isLoading ? (
                      <Skeleton className="h-7 w-10" />
                    ) : (
                      <p className="text-2xl font-bold font-heading leading-none tech-content text-foreground">{count}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">{isRTL ? c.ar : c.en}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {CATEGORIES.map((c) => {
            const q = queries[c.key];
            const data = q.data ?? { count: 0, items: [] };
            const Icon = c.icon;
            return (
              <section
                key={c.key}
                className="rounded-2xl border border-border/40 bg-card overflow-hidden"
                aria-labelledby={`section-${c.key}`}
              >
                <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-muted/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.tone} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 id={`section-${c.key}`} className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {isRTL ? c.ar : c.en}
                        <Badge variant="outline" className="text-[10px] tech-content">
                          {q.isLoading ? '…' : data.count}
                        </Badge>
                      </h2>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {isRTL ? c.description.ar : c.description.en}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={c.href}
                    className="inline-flex items-center gap-1 text-xs px-3 h-8 rounded-lg border border-border/60 bg-card hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {isRTL ? c.hint.ar : c.hint.en}
                  </Link>
                </header>

                <div className="p-3">
                  {q.isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                    </div>
                  ) : data.items.length === 0 ? (
                    <div className="flex items-center gap-3 px-3 py-5 text-xs text-muted-foreground">
                      <Inbox className="w-4 h-4" />
                      {isRTL ? 'لا توجد عناصر بانتظار الموافقة في هذا القسم.' : 'No pending items in this section.'}
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {data.items.map((it) => (
                        <li key={it.id}>
                          <Link
                            to={c.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-foreground truncate">{it.primary}</span>
                                <span className="tech-content text-[10px] text-muted-foreground">{it.refId}</span>
                                {it.secondary && (
                                  <Badge variant="outline" className="text-[10px] tech-content">{it.secondary}</Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground tech-content mt-0.5">{fmtDate(it.createdAt)}</p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </Link>
                        </li>
                      ))}
                      {data.count > data.items.length && (
                        <li className="pt-2">
                          <Link
                            to={c.href}
                            className="flex items-center justify-center gap-1.5 text-[11px] text-primary hover:underline px-3 py-2"
                          >
                            {isRTL
                              ? `عرض ${data.count - data.items.length}+ المزيد`
                              : `View ${data.count - data.items.length}+ more`}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer hint */}
        <p className="text-[10px] text-muted-foreground text-center">
          {isRTL
            ? 'الموافقات والرفض تنفّذ في الصفحات المتخصصة لضمان التحقق والتدقيق الكامل.'
            : 'Approve/reject actions are performed on the dedicated detail pages to preserve validation and full audit trail.'}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AdminApprovalsCenter;