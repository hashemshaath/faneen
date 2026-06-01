/**
 * SERVICE-ACTIVATION-GOVERNANCE-2 — Phase D
 *
 * Single admin control surface for provider-service activations.
 * All mutations route through `@/modules/providerServices` — this page
 * never touches Supabase directly.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ShieldAlert, PauseCircle, Star, Crown, Search, RefreshCw } from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  adminListServiceActivations,
  adminApproveProviderService,
  adminRejectProviderService,
  adminSuspendProviderService,
  adminRestoreProviderService,
  adminSetRequiredPlanTier,
  adminClearRequiredPlanTier,
  adminSetRequiresReview,
  adminSetPremiumService,
  adminSetFeaturedService,
  adminUpdateServiceActivationNote,
  resolveServiceEntitlement,
  effectiveStatusLabel,
  effectiveStatusBadgeClass,
  type AdminServiceActivationRow,
  type AdminListFilters,
} from '@/modules/providerServices';
import { TIERS, type TierKey } from '@/lib/membership-tiers';

type AdminStatusFilter = 'all' | 'allowed' | 'suspended' | 'rejected' | 'pending_review';
type ProviderStatusFilter = 'all' | 'active' | 'paused';
type TierFilter = 'all' | 'not_null' | TierKey;

const AdminServiceActivations: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL ? 'تحكم تفعيل الخدمات — إدارة' : 'Service Activations — Admin',
    noindex: true,
  });
  const qc = useQueryClient();

  // SERVICE-ACTIVATION-GOVERNANCE-4 — URL query-param hydration.
  const [searchParams, setSearchParams] = useSearchParams();
  const businessId = searchParams.get('businessId') || '';
  const [search, setSearch] = useState('');
  const [adminStatus, setAdminStatus] = useState<AdminStatusFilter>(
    (searchParams.get('admin_status') as AdminStatusFilter) || 'all',
  );
  const [providerStatus, setProviderStatus] = useState<ProviderStatusFilter>(
    (searchParams.get('provider_status') as ProviderStatusFilter) || 'all',
  );
  const [requiresReviewOnly, setRequiresReviewOnly] = useState(
    searchParams.get('requires_admin_review') === 'true',
  );
  const [premiumOnly, setPremiumOnly] = useState(searchParams.get('is_premium_service') === 'true');
  const [featuredOnly, setFeaturedOnly] = useState(searchParams.get('is_featured') === 'true');
  const initialTier = searchParams.get('required_plan_tier');
  const [tierFilter, setTierFilter] = useState<TierFilter>(
    initialTier === 'not_null'
      ? 'not_null'
      : (TIERS as readonly string[]).includes(initialTier ?? '')
      ? (initialTier as TierKey)
      : 'all',
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const filters: AdminListFilters = useMemo(
    () => ({
      businessId: businessId || undefined,
      search: search || undefined,
      adminStatus: adminStatus === 'all' ? undefined : adminStatus,
      providerStatus: providerStatus === 'all' ? undefined : providerStatus,
      requiresAdminReview: requiresReviewOnly ? true : undefined,
      premiumOnly: premiumOnly || undefined,
      featuredOnly: featuredOnly || undefined,
      requiredPlanTierAny: tierFilter === 'not_null' ? true : undefined,
      requiredPlanTier:
        tierFilter !== 'all' && tierFilter !== 'not_null' ? (tierFilter as TierKey) : undefined,
    }),
    [businessId, search, adminStatus, providerStatus, requiresReviewOnly, premiumOnly, featuredOnly, tierFilter],
  );

  // Sync UI filter state back into URL so deep-links stay bookmarkable.
  React.useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (k: string, v: string | null) => {
      if (v && v !== 'all' && v !== 'false') next.set(k, v);
      else next.delete(k);
    };
    setOrDelete('admin_status', adminStatus);
    setOrDelete('provider_status', providerStatus);
    setOrDelete('requires_admin_review', requiresReviewOnly ? 'true' : null);
    setOrDelete('is_premium_service', premiumOnly ? 'true' : null);
    setOrDelete('is_featured', featuredOnly ? 'true' : null);
    setOrDelete('required_plan_tier', tierFilter === 'all' ? null : tierFilter);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminStatus, providerStatus, requiresReviewOnly, premiumOnly, featuredOnly, tierFilter]);

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-service-activations', filters],
    queryFn: () => adminListServiceActivations(filters),
    staleTime: 15_000,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['admin-service-activations'] });

  function useRunAction<TArgs extends unknown[]>(
    fn: (...a: TArgs) => Promise<void>,
    successMsg: string,
  ) {
    return useMutation({
      mutationFn: (args: TArgs) => fn(...args),
      onSuccess: () => {
        toast.success(successMsg);
        invalidate();
      },
      onError: (e: unknown) =>
        toast.error(e instanceof Error ? e.message : isRTL ? 'تعذر تنفيذ العملية' : 'Action failed'),
    });
  }

  const mApprove = useRunAction(adminApproveProviderService, isRTL ? 'تمت الموافقة' : 'Approved');
  const mReject = useRunAction(adminRejectProviderService, isRTL ? 'تم الرفض' : 'Rejected');
  const mSuspend = useRunAction(adminSuspendProviderService, isRTL ? 'تم التعليق' : 'Suspended');
  const mRestore = useRunAction(adminRestoreProviderService, isRTL ? 'تمت الاستعادة' : 'Restored');
  const mSetTier = useRunAction(adminSetRequiredPlanTier, isRTL ? 'تم تعيين الباقة المطلوبة' : 'Tier set');
  const mClearTier = useRunAction(adminClearRequiredPlanTier, isRTL ? 'تم مسح الباقة' : 'Tier cleared');
  const mReview = useRunAction(adminSetRequiresReview, isRTL ? 'تم التحديث' : 'Updated');
  const mPremium = useRunAction(adminSetPremiumService, isRTL ? 'تم التحديث' : 'Updated');
  const mFeatured = useRunAction(adminSetFeaturedService, isRTL ? 'تم التحديث' : 'Updated');
  const mNote = useRunAction(adminUpdateServiceActivationNote, isRTL ? 'تم حفظ الملاحظة' : 'Note saved');

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-[1400px]">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              {isRTL ? 'تحكم تفعيل الخدمات' : 'Service Activations'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'إدارة تفعيل خدمات المزوّدين، التعليق، متطلبات الباقات، والمراجعة الإدارية.'
                : 'Manage provider service activations, suspensions, plan requirements, and admin review.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''} me-2`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{isRTL ? 'تصفية' : 'Filters'}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {businessId && (
              <div className="md:col-span-2 lg:col-span-4 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                <span>
                  {isRTL ? 'مفلتر حسب الجهة: ' : 'Filtered by business: '}
                  <span className="tech-content font-mono">{businessId.slice(0, 8)}…</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('businessId');
                    setSearchParams(next, { replace: true });
                  }}
                >
                  {isRTL ? 'إزالة' : 'Clear'}
                </Button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث عن خدمة...' : 'Search service…'}
                className="ps-10"
              />
            </div>
            <Select value={adminStatus} onValueChange={(v) => setAdminStatus(v as AdminStatusFilter)}>
              <SelectTrigger><SelectValue placeholder={isRTL ? 'حالة الإدارة' : 'Admin status'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الحالات الإدارية' : 'All admin statuses'}</SelectItem>
                <SelectItem value="allowed">{isRTL ? 'مسموح' : 'Allowed'}</SelectItem>
                <SelectItem value="pending_review">{isRTL ? 'قيد المراجعة' : 'Pending review'}</SelectItem>
                <SelectItem value="suspended">{isRTL ? 'معلّق' : 'Suspended'}</SelectItem>
                <SelectItem value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerStatus} onValueChange={(v) => setProviderStatus(v as ProviderStatusFilter)}>
              <SelectTrigger><SelectValue placeholder={isRTL ? 'حالة المزوّد' : 'Provider status'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل حالات المزوّد' : 'All provider statuses'}</SelectItem>
                <SelectItem value="active">{isRTL ? 'مفعّلة' : 'Active'}</SelectItem>
                <SelectItem value="paused">{isRTL ? 'متوقفة' : 'Paused'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as TierFilter)}>
              <SelectTrigger><SelectValue placeholder={isRTL ? 'الباقة المطلوبة' : 'Required tier'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الباقات' : 'Any tier'}</SelectItem>
                <SelectItem value="not_null">{isRTL ? 'تتطلب ترقية (أي)' : 'Requires upgrade (any)'}</SelectItem>
                {TIERS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={requiresReviewOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRequiresReviewOnly((v) => !v)}
              >
                {isRTL ? 'تتطلب مراجعة' : 'Needs review'}
              </Button>
              <Button
                variant={premiumOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPremiumOnly((v) => !v)}
              >
                <Crown className="h-3.5 w-3.5 me-1" />
                {isRTL ? 'مميزة' : 'Premium'}
              </Button>
              <Button
                variant={featuredOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeaturedOnly((v) => !v)}
              >
                <Star className="h-3.5 w-3.5 me-1" />
                {isRTL ? 'منتقاة' : 'Featured'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            {isRTL ? 'لا توجد خدمات مطابقة.' : 'No matching services.'}
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <ActivationRow
                key={row.id}
                row={row}
                isRTL={isRTL}
                expanded={expandedId === row.id}
                onToggle={() => {
                  setExpandedId((cur) => (cur === row.id ? null : row.id));
                  setReasonDraft('');
                  setNoteDraft(row.admin_note ?? '');
                }}
                reasonDraft={reasonDraft}
                setReasonDraft={setReasonDraft}
                noteDraft={noteDraft}
                setNoteDraft={setNoteDraft}
                actions={{
                  approve: (note?: string) => mApprove.mutate([row.id, note]),
                  reject: (reason: string) => mReject.mutate([row.id, reason]),
                  suspend: (reason: string) => mSuspend.mutate([row.id, reason]),
                  restore: (note?: string) => mRestore.mutate([row.id, note]),
                  setTier: (tier: TierKey) => mSetTier.mutate([row.id, tier]),
                  clearTier: () => mClearTier.mutate([row.id]),
                  setReview: (v: boolean) => mReview.mutate([row.id, v]),
                  setPremium: (v: boolean) => mPremium.mutate([row.id, v]),
                  setFeatured: (v: boolean) => mFeatured.mutate([row.id, v]),
                  saveNote: (n: string) => mNote.mutate([row.id, n]),
                }}
                busy={
                  mApprove.isPending || mReject.isPending || mSuspend.isPending ||
                  mRestore.isPending || mSetTier.isPending || mClearTier.isPending ||
                  mReview.isPending || mPremium.isPending || mFeatured.isPending || mNote.isPending
                }
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

interface RowActions {
  approve: (note?: string) => void;
  reject: (reason: string) => void;
  suspend: (reason: string) => void;
  restore: (note?: string) => void;
  setTier: (tier: TierKey) => void;
  clearTier: () => void;
  setReview: (v: boolean) => void;
  setPremium: (v: boolean) => void;
  setFeatured: (v: boolean) => void;
  saveNote: (note: string) => void;
}

const ActivationRow: React.FC<{
  row: AdminServiceActivationRow;
  isRTL: boolean;
  expanded: boolean;
  onToggle: () => void;
  reasonDraft: string;
  setReasonDraft: (v: string) => void;
  noteDraft: string;
  setNoteDraft: (v: string) => void;
  actions: RowActions;
  busy: boolean;
}> = ({ row, isRTL, expanded, onToggle, reasonDraft, setReasonDraft, noteDraft, setNoteDraft, actions, busy }) => {
  const resolved = resolveServiceEntitlement({
    row: {
      id: row.id,
      provider_status: row.provider_status as 'active' | 'paused',
      admin_status: row.admin_status as 'allowed' | 'suspended' | 'rejected' | 'pending_review',
      required_plan_tier: row.required_plan_tier,
      is_active: row.is_active,
    },
    currentTier: row.current_tier ?? null,
  });
  const name = isRTL ? row.name_ar : (row.name_en || row.name_ar);
  const tierLabels: Record<string, { ar: string; en: string }> = {
    free: { ar: 'مجاني', en: 'Free' },
    basic: { ar: 'نمو', en: 'Growth' },
    premium: { ar: 'احترافي', en: 'Pro' },
    enterprise: { ar: 'مؤسسي', en: 'Enterprise' },
  };
  const tierChip = row.current_tier
    ? (isRTL ? tierLabels[row.current_tier].ar : tierLabels[row.current_tier].en)
    : (isRTL ? 'لا توجد عضوية' : 'No membership');

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-start p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0">
            <div className="font-semibold truncate">{name}</div>
            <div className="text-xs text-muted-foreground tech-content truncate">
              {row.business_id.slice(0, 8)}… · {row.id.slice(0, 8)}…
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={
              row.current_tier
                ? 'bg-info/10 text-info border-info/30'
                : 'bg-muted text-muted-foreground'
            }
            data-testid="provider-tier-chip"
          >
            <Crown className="h-3 w-3 me-1" />{tierChip}
          </Badge>
          <Badge className={effectiveStatusBadgeClass(resolved.effective_status)} variant="outline">
            {effectiveStatusLabel(resolved.effective_status, isRTL)}
          </Badge>
          {row.requires_admin_review && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              <ShieldAlert className="h-3 w-3 me-1" />{isRTL ? 'مراجعة' : 'Review'}
            </Badge>
          )}
          {row.required_plan_tier && (
            <Badge variant="outline">{row.required_plan_tier}</Badge>
          )}
          {row.is_premium_service && <Crown className="h-4 w-4 text-accent" />}
          {row.is_featured && <Star className="h-4 w-4 text-warning" />}
          {row.provider_status === 'paused' && <PauseCircle className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <CardContent className="border-t bg-muted/20 space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <Field label={isRTL ? 'حالة المزوّد' : 'Provider status'} value={row.provider_status} />
            <Field label={isRTL ? 'حالة الإدارة' : 'Admin status'} value={row.admin_status} />
            <Field label={isRTL ? 'الباقة المطلوبة' : 'Required tier'} value={row.required_plan_tier ?? '—'} />
            <Field label={isRTL ? 'سبب الرفض' : 'Rejection reason'} value={row.rejection_reason ?? '—'} />
            <Field label={isRTL ? 'تمت المراجعة بواسطة' : 'Reviewed by'} value={row.reviewed_by ?? '—'} />
            <Field label={isRTL ? 'وقت المراجعة' : 'Reviewed at'} value={row.reviewed_at ?? '—'} />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">
              {isRTL ? 'سبب التعليق/الرفض (مطلوب لهاتين العمليتين)' : 'Suspend/Reject reason (required)'}
            </div>
            <Textarea
              value={reasonDraft}
              onChange={(e) => setReasonDraft(e.target.value)}
              rows={2}
              placeholder={isRTL ? 'اكتب السبب...' : 'Enter reason…'}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => actions.approve(undefined)}>
              {isRTL ? 'موافقة' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !reasonDraft.trim()}
              onClick={() => actions.reject(reasonDraft.trim())}
            >
              {isRTL ? 'رفض' : 'Reject'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !reasonDraft.trim()}
              onClick={() => actions.suspend(reasonDraft.trim())}
            >
              {isRTL ? 'تعليق' : 'Suspend'}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => actions.restore()}>
              {isRTL ? 'استعادة' : 'Restore'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => actions.setReview(!row.requires_admin_review)}
            >
              {row.requires_admin_review
                ? (isRTL ? 'إلغاء طلب المراجعة' : 'Clear review flag')
                : (isRTL ? 'وضع علامة مراجعة' : 'Mark for review')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => actions.setPremium(!row.is_premium_service)}
            >
              <Crown className="h-3.5 w-3.5 me-1" />
              {row.is_premium_service ? (isRTL ? 'إلغاء مميزة' : 'Unmark premium') : (isRTL ? 'تعليم مميزة' : 'Mark premium')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => actions.setFeatured(!row.is_featured)}
            >
              <Star className="h-3.5 w-3.5 me-1" />
              {row.is_featured ? (isRTL ? 'إلغاء انتقاء' : 'Unfeature') : (isRTL ? 'انتقاء' : 'Feature')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{isRTL ? 'الباقة المطلوبة:' : 'Required tier:'}</span>
            {TIERS.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={row.required_plan_tier === t ? 'default' : 'outline'}
                disabled={busy}
                onClick={() => actions.setTier(t)}
              >
                {t}
              </Button>
            ))}
            <Button size="sm" variant="ghost" disabled={busy || !row.required_plan_tier} onClick={actions.clearTier}>
              {isRTL ? 'مسح' : 'Clear'}
            </Button>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'ملاحظة إدارية' : 'Admin note'}</div>
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={2}
              placeholder={isRTL ? 'ملاحظة للسجل...' : 'Note for the record…'}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => actions.saveNote(noteDraft)}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin me-2" />}
                {isRTL ? 'حفظ الملاحظة' : 'Save note'}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="space-y-0.5">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="font-medium break-all">{value}</div>
  </div>
);

export default AdminServiceActivations;