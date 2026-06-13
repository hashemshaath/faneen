import { pickBi } from '@/components/common/Bilingual';
import { useState, useMemo, useCallback, useTransition } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listAdminBusinesses, listBusinessesByIds } from '@/modules/businesses';
import { listProfilesByUserIds } from '@/modules/users';
import {
  cancelSubscription,
  adminUpgradeSubscription,
  subscribeToPlan,
  listAdminMembershipPlans,
  listAdminMembershipSubscriptions,
  adminListMembershipUsage,
  insertMembershipPlan,
  updateMembershipPlanById,
} from '@/modules/memberships';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CreditCard, Users, Building2, BarChart3, ArrowUpCircle, Activity,
  Download, Lock,
} from 'lucide-react';
import { TIERS } from '@/lib/membership-tiers';
import { parseLimits, limitsToJson } from '@/lib/membership-limits';
import { AdminUpgradeRequestsPanel } from '@/components/membership/AdminUpgradeRequestsPanel';
import { AdminPromoCodesPanel } from '@/components/membership/AdminPromoCodesPanel';
import {
  MembershipOverviewSection,
  MembershipPlansSection,
  MembershipSubscriptionsSection,
  MembershipBusinessLinksSection,
  MembershipUsageReportSection,
} from '@/components/admin/memberships/sections';
import type {
  AdminMembershipEditingPlan,
  AdminMembershipEnrichedSubscription,
  MembershipUsageRow,
} from '@/components/admin/memberships/sections';

import { useNoIndex } from "@/hooks/useNoIndex";
type Tab = 'overview' | 'plans' | 'subscriptions' | 'requests' | 'businesses' | 'usage';

/* ─── Admin Memberships local types (no `any`) ─── */
type AdminMembershipPlanRow = Database['public']['Tables']['membership_plans']['Row'];

type AdminMembershipLimitsInput = Record<string, unknown> | undefined;

/* ═══════════════════════════════════════════════════════ */
/* ─── Main Component ─── */
/* ═══════════════════════════════════════════════════════ */
const AdminMemberships = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editingPlan, setEditingPlan] = useState<AdminMembershipEditingPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [featuresText, setFeaturesText] = useState('');
  const [editLimits, setEditLimits] = useState<Record<string, number | boolean>>({});
  const [upgradeSub, setUpgradeSub] = useState<AdminMembershipEnrichedSubscription | null>(null);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState('');
  const [upgradeCycle, setUpgradeCycle] = useState('monthly');
  const [form, setForm] = useState({
    name_ar: '', name_en: '', description_ar: '', description_en: '',
    price_monthly: 0, price_yearly: 0, is_active: true, sort_order: 0,
  });

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    startTransition(() => setDeferredSearch(val));
  }, []);

  /* ─── Queries ─── */
  type AdminPlanRow = Database['public']['Tables']['membership_plans']['Row'];
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-membership-plans'],
    queryFn: async () => {
      const { data, error } = await listAdminMembershipPlans<AdminPlanRow>();
      if (error) throw error;
      return data ?? [];
    },
  });

  type AdminSubRow = Database['public']['Tables']['membership_subscriptions']['Row'] & {
    plan: { name_ar: string | null; name_en: string | null; tier: string | null } | null;
  };
  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await listAdminMembershipSubscriptions<AdminSubRow>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const userIds = useMemo(() => [...new Set(subscriptions.map((s) => s.user_id))], [subscriptions]);
  const businessIds = useMemo(() => [...new Set(subscriptions.filter((s) => s.business_id).map((s) => s.business_id))], [subscriptions]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-sub-profiles', userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data } = await listProfilesByUserIds<{ user_id: string; full_name: string | null; email: string | null; avatar_url: string | null; membership_tier: string | null }>({
        userIds,
        select: 'user_id, full_name, email, avatar_url, membership_tier',
      });
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-sub-businesses', businessIds],
    queryFn: async () => {
      if (!businessIds.length) return [];
      const { data } = await listBusinessesByIds<{
        id: string;
        name_ar: string | null;
        name_en: string | null;
        membership_tier: string | null;
        logo_url: string | null;
        is_verified: boolean | null;
        is_active: boolean | null;
      }>({
        ids: businessIds,
        select: 'id, name_ar, name_en, membership_tier, logo_url, is_verified, is_active',
      });
      return data ?? [];
    },
    enabled: businessIds.length > 0,
  });

  const { data: allBusinesses = [], isLoading: loadingBiz } = useQuery({
    queryKey: ['admin-all-businesses-tiers'],
    queryFn: async () => {
      const { data } = await listAdminBusinesses<{
        id: string;
        name_ar: string | null;
        name_en: string | null;
        membership_tier: string | null;
        logo_url: string | null;
        is_verified: boolean | null;
        is_active: boolean | null;
        username: string | null;
        rating_avg: number | null;
        rating_count: number | null;
        created_at: string;
      }>({
        select: 'id, name_ar, name_en, membership_tier, logo_url, is_verified, is_active, username, rating_avg, rating_count, created_at',
        orderBy: { column: 'membership_tier', ascending: false },
      });
      return data ?? [];
    },
    enabled: activeTab === 'businesses',
  });

  /* ─── M3A: Admin usage report (over-limit & near-cap) ─── */
  const [usageOnlyFlagged, setUsageOnlyFlagged] = useState(true);
  const { data: usageReport = [], isLoading: loadingUsage } = useQuery({
    queryKey: ['admin-membership-usage', usageOnlyFlagged],
    queryFn: async () => {
      const { data, error } = await adminListMembershipUsage({
        _only_over_or_near: usageOnlyFlagged,
        _limit: 500,
      });
      if (error) throw error;
      return (data ?? []) as UsageReportRow[];
    },
    enabled: activeTab === 'usage' && isAdmin,
    staleTime: 60 * 1000,
  });

  /* ─── Enriched subscriptions ─── */
  const enrichedSubs = useMemo(() => {
    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    const bizMap = new Map(businesses.map((b) => [b.id, b]));
    return subscriptions.map((s) => ({
      ...s,
      profile: profileMap.get(s.user_id) || null,
      business: s.business_id ? bizMap.get(s.business_id) || null : null,
    }));
  }, [subscriptions, profiles, businesses]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const active = enrichedSubs.filter((s) => s.status === 'active');
    const cancelled = enrichedSubs.filter((s) => s.status === 'cancelled').length;
    const expired = enrichedSubs.filter((s) => s.status === 'expired').length;
    const expiringSoon = active.filter((s) => s.expires_at && new Date(s.expires_at) < new Date(Date.now() + 7 * 86400000)).length;
    const monthly = active.filter((s) => s.billing_cycle === 'monthly').length;
    const yearly = active.filter((s) => s.billing_cycle === 'yearly').length;
    const tierDist = TIERS.map(t => ({
      tier: t,
      count: active.filter((s) => s.plan?.tier === t).length,
    }));
    const revenue = active.reduce((sum: number, s) => {
      const plan = plans.find((p) => p.id === s.plan_id);
      if (!plan) return sum;
      return sum + (s.billing_cycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly);
    }, 0);
    const planSubCounts: Record<string, number> = {};
    active.forEach((s) => {
      planSubCounts[s.plan_id] = (planSubCounts[s.plan_id] || 0) + 1;
    });
    return { total: enrichedSubs.length, active: active.length, cancelled, expired, expiringSoon, monthly, yearly, tierDist, revenue, planSubCounts };
  }, [enrichedSubs, plans]);

  /* ─── Filtered subscriptions ─── */
  const filteredSubs = useMemo(() => {
    return enrichedSubs.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (tierFilter !== 'all' && s.plan?.tier !== tierFilter) return false;
      if (deferredSearch) {
        const q = deferredSearch.toLowerCase();
        return s.ref_id?.toLowerCase().includes(q)
          || s.plan?.name_ar?.toLowerCase().includes(q)
          || s.plan?.name_en?.toLowerCase().includes(q)
          || s.profile?.full_name?.toLowerCase().includes(q)
          || s.profile?.email?.toLowerCase().includes(q)
          || s.business?.name_ar?.toLowerCase().includes(q)
          || s.business?.name_en?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [enrichedSubs, statusFilter, tierFilter, deferredSearch]);

  /* ─── Filtered businesses ─── */
  const filteredBiz = useMemo(() => {
    if (!deferredSearch) return allBusinesses;
    const q = deferredSearch.toLowerCase();
    return allBusinesses.filter((b) => b.name_ar?.toLowerCase().includes(q) || b.name_en?.toLowerCase().includes(q) || b.username?.toLowerCase().includes(q));
  }, [allBusinesses, deferredSearch]);

  /* ─── Mutations ─── */
  const updatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlan) return;
      const features = featuresText.split('\n').map(l => l.trim()).filter(Boolean);
      const originalLimits = (editingPlan.limits ?? null) as Record<string, unknown> | null;
      const limits = limitsToJson(editLimits, originalLimits);
      const isNew = !editingPlan.id;
      if (isNew) {
        const tier = editingPlan.tier || 'free';
        const { error } = await insertMembershipPlan({
          tier,
          name_ar: form.name_ar, name_en: form.name_en,
          description_ar: form.description_ar || null, description_en: form.description_en || null,
          price_monthly: form.price_monthly, price_yearly: form.price_yearly,
          is_active: form.is_active, sort_order: form.sort_order,
          features, limits,
        });
        if (error) throw error;
      } else {
        const { error } = await updateMembershipPlanById({
          id: editingPlan.id as string,
          values: {
            name_ar: form.name_ar, name_en: form.name_en,
            description_ar: form.description_ar || null, description_en: form.description_en || null,
            price_monthly: form.price_monthly, price_yearly: form.price_yearly,
            is_active: form.is_active, sort_order: form.sort_order,
            features, limits,
          },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] });
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      queryClient.invalidateQueries({ queryKey: ['membership-plans-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['home-membership-plans'] });
      setEditingPlan(null);
      toast.success(pickBi(isRTL, 'تم حفظ الخطة بنجاح', 'Plan saved successfully'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelSubMutation = useMutation({
    mutationFn: async (sub: { id: string; profile?: { email?: string | null; full_name?: string | null } | null; business?: { name_ar?: string | null; name_en?: string | null } | null }) => {
      const { error } = await cancelSubscription({ _subscription_id: sub.id });
      if (error) throw error;
      // R4F-4-APPLY: fail-soft immediate-cancel email.
      const email = sub.profile?.email ?? undefined;
      if (email) {
        try {
          await sendTransactionalEmail({
            templateName: 'membership-cancelled-immediately',
            recipientEmail: email,
            idempotencyKey: `membership-cancelled-immediate-${sub.id}`,
            templateData: {
              recipientName: sub.profile?.full_name ?? undefined,
              businessName: sub.business?.name_ar || sub.business?.name_en || undefined,
            },
          });
        } catch (err) {
           
          console.warn('[AdminMemberships] immediate-cancel email failed', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses-tiers'] });
      toast.success(pickBi(isRTL, 'تم إلغاء الاشتراك', 'Subscription cancelled'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!upgradeSub || !upgradeTargetPlan) return;
      const { error } = await adminUpgradeSubscription({
        _subscription_id: upgradeSub.id,
        _new_plan_id: upgradeTargetPlan,
        _billing_cycle: upgradeCycle,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses-tiers'] });
      setUpgradeSub(null);
      setUpgradeTargetPlan('');
      toast.success(pickBi(isRTL, 'تمت الترقية بنجاح', 'Upgrade completed'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleRenew = useCallback(async (sub: AdminMembershipEnrichedSubscription) => {
    if (!sub.plan_id || !sub.user_id) return;
    try {
      const { error } = await subscribeToPlan({
        _user_id: sub.user_id,
        _plan_id: sub.plan_id,
        _business_id: sub.business_id || null,
        _billing_cycle: sub.billing_cycle,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses-tiers'] });
      toast.success(pickBi(isRTL, 'تم تجديد الاشتراك', 'Subscription renewed'));
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }, [isRTL, queryClient]);

  const openEdit = useCallback((plan: AdminMembershipPlanRow) => {
    setEditingPlan(plan);
    const features = Array.isArray(plan.features) ? (plan.features as string[]).join('\n') : '';
    setFeaturesText(features);
    setEditLimits(parseLimits(plan.limits as AdminMembershipLimitsInput));
    setForm({
      name_ar: plan.name_ar, name_en: plan.name_en,
      description_ar: plan.description_ar || '', description_en: plan.description_en || '',
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
      is_active: plan.is_active, sort_order: plan.sort_order,
    });
  }, []);

  const openCreate = useCallback((tier: typeof TIERS[number]) => {
    setEditingPlan({ tier, _new: true });
    setFeaturesText('');
    setEditLimits(parseLimits(undefined));
    setForm({
      name_ar: '', name_en: '',
      description_ar: '', description_en: '',
      price_monthly: 0, price_yearly: 0,
      is_active: true, sort_order: plans.length,
    });
  }, [plans.length]);

  /* ─── CSV Export ─── */
  const exportCSV = useCallback(() => {
    const bom = '\uFEFF';
    const headers = ['Ref ID', 'User', 'Email', 'Business', 'Plan', 'Tier', 'Status', 'Cycle', 'Starts', 'Expires'];
    const rows = enrichedSubs.map((s) => [
      s.ref_id, s.profile?.full_name || '', s.profile?.email || '',
      s.business?.name_ar || '', s.plan?.name_en || s.plan?.name_ar || '', s.plan?.tier || '',
      s.status, s.billing_cycle,
      format(new Date(s.starts_at), 'yyyy-MM-dd'), s.expires_at ? format(new Date(s.expires_at), 'yyyy-MM-dd') : '',
    ]);
    const csv = bom + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `subscriptions-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(pickBi(isRTL, 'تم التصدير', 'Exported'));
  }, [enrichedSubs, isRTL]);

  const tabs: { key: Tab; icon: React.ElementType; label: string; count?: number }[] = [
    { key: 'overview', icon: BarChart3, label: pickBi(isRTL, 'نظرة عامة', 'Overview') },
    { key: 'plans', icon: CreditCard, label: pickBi(isRTL, 'الخطط', 'Plans'), count: plans.length },
    { key: 'subscriptions', icon: Users, label: pickBi(isRTL, 'الاشتراكات', 'Subscriptions'), count: stats.active },
    { key: 'requests', icon: ArrowUpCircle, label: pickBi(isRTL, 'طلبات الترقية', 'Upgrade Requests') },
    { key: 'businesses', icon: Building2, label: pickBi(isRTL, 'الجهات', 'Businesses') },
    { key: 'usage', icon: Activity, label: pickBi(isRTL, 'الاستخدام', 'Usage') },
  ];

  // Defense-in-depth: ProtectedRoute requireAdmin already gates this route,
  // but render an explicit unauthorized state if somehow reached without admin.
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-16 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="font-heading font-bold text-base">
            {pickBi(isRTL, 'وصول غير مصرّح به', 'Unauthorized')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {pickBi(isRTL, 'هذه الصفحة متاحة لمسؤولي النظام فقط.', 'This page is restricted to administrators.')}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          {/* Sub-navigation pills — header is rendered once by TabbedShell to avoid duplication */}
          <div className="flex items-center justify-between gap-3 bg-background/60 backdrop-blur-sm border border-border/60 rounded-2xl p-1.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {tabs.map(t => {
                const isActive = activeTab === t.key;
                return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={cn(
                      'h-10 px-4 rounded-xl text-xs font-semibold transition-all shrink-0 inline-flex items-center gap-1.5',
                      isActive
                        ? 'bg-card shadow-sm text-primary border border-border/50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}>
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    {t.count !== undefined && (
                      <span className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded-md',
                        isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}>{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {activeTab === 'subscriptions' && (
              <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 shrink-0" onClick={exportCSV}>
                <Download className="w-3 h-3" />{pickBi(isRTL, 'تصدير CSV', 'Export CSV')}
              </Button>
            )}
          </div>

          {/* ═══════ OVERVIEW ═══════ */}
          {activeTab === 'overview' && (
            <MembershipOverviewSection stats={stats} isRTL={isRTL} onExport={exportCSV} />
          )}

          {/* ═══════ PLANS ═══════ */}
          {activeTab === 'plans' && (
            <MembershipPlansSection
              plans={plans}
              loadingPlans={loadingPlans}
              isRTL={isRTL}
              language={language}
              planSubCounts={stats.planSubCounts}
              editingPlan={editingPlan}
              form={form}
              setForm={setForm}
              featuresText={featuresText}
              setFeaturesText={setFeaturesText}
              editLimits={editLimits}
              setEditLimits={setEditLimits}
              onOpenCreate={openCreate}
              onOpenEdit={openEdit}
              onCloseEdit={() => setEditingPlan(null)}
              onSubmit={() => updatePlanMutation.mutate()}
              isSaving={updatePlanMutation.isPending}
            />
          )}

          {/* ═══════ SUBSCRIPTIONS ═══════ */}
          {activeTab === 'subscriptions' && (
            <MembershipSubscriptionsSection
              filteredSubs={filteredSubs as AdminMembershipEnrichedSubscription[]}
              loadingSubs={loadingSubs}
              plans={plans}
              isRTL={isRTL}
              language={language}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              tierFilter={tierFilter}
              onTierFilterChange={setTierFilter}
              upgradeSub={upgradeSub}
              onCloseUpgrade={() => setUpgradeSub(null)}
              upgradeTargetPlan={upgradeTargetPlan}
              onUpgradeTargetPlanChange={setUpgradeTargetPlan}
              upgradeCycle={upgradeCycle}
              onUpgradeCycleChange={setUpgradeCycle}
              isUpgrading={upgradeMutation.isPending}
              onUpgradeConfirm={() => upgradeMutation.mutate()}
              onCancelSub={(sub) => cancelSubMutation.mutate(sub)}
              onRenewSub={handleRenew}
              onOpenUpgrade={(sub) => { setUpgradeSub(sub); setUpgradeTargetPlan(''); }}
            />
          )}

          {/* ═══════ UPGRADE REQUESTS ═══════ */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <AdminUpgradeRequestsPanel isRTL={isRTL} />
              <AdminPromoCodesPanel isRTL={isRTL} />
            </div>
          )}

          {/* ═══════ BUSINESSES ═══════ */}
          {activeTab === 'businesses' && (
            <MembershipBusinessLinksSection
              allBusinesses={allBusinesses}
              filteredBiz={filteredBiz}
              loadingBiz={loadingBiz}
              isRTL={isRTL}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
            />
          )}

          {/* ═══════ USAGE (M3A read-only) ═══════ */}
          {activeTab === 'usage' && (
            <MembershipUsageReportSection
              usageReport={usageReport}
              loadingUsage={loadingUsage}
              usageOnlyFlagged={usageOnlyFlagged}
              onToggleUsageFlagged={setUsageOnlyFlagged}
              isRTL={isRTL}
            />
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default AdminMemberships;
