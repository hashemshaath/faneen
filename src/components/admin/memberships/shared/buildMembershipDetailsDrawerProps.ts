/**
 * Pure adapter helpers for `MembershipDetailsDrawer`.
 *
 * - No Supabase, no React Query, no side effects.
 * - Given page-local data shapes, produce read-only drawer props.
 * - Used by `AdminProviderSubscriptions` and `AdminMembershipRejections`.
 */
import type { MembershipDetailsDrawerProps } from './MembershipDetailsDrawer';
import type { LifecycleStage } from './SubscriptionLifecycleCard';

/** Shape used by AdminProviderSubscriptions rows. Kept structural to avoid coupling. */
export interface ProviderSubscriptionDrawerInput {
  businessName?: string | null;
  businessRefId?: string | null;
  membershipTier?: string | null;
  planName?: string | null;
  status: string;
  leadCreditsBalance?: number | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  updatedAt?: string | null;
  isRTL?: boolean;
}

export function buildProviderSubscriptionDrawerProps(
  input: ProviderSubscriptionDrawerInput,
): Pick<MembershipDetailsDrawerProps, 'subject' | 'lifecycle'> {
  const isRTL = input.isRTL ?? true;
  const meta: NonNullable<MembershipDetailsDrawerProps['subject']['meta']> = [];
  if (input.planName) {
    meta.push({ label: isRTL ? 'خطة المزود' : 'Provider plan', value: input.planName });
  }
  if (typeof input.leadCreditsBalance === 'number') {
    meta.push({
      label: isRTL ? 'الرصيد' : 'Balance',
      value: <span className="tech-content">{input.leadCreditsBalance}</span> as React.ReactNode,
    });
  }
  if (input.currentPeriodStart) {
    meta.push({
      label: isRTL ? 'بداية الفترة' : 'Period start',
      value: new Date(input.currentPeriodStart).toLocaleDateString('en-US'),
    });
  }
  if (input.currentPeriodEnd) {
    meta.push({
      label: isRTL ? 'نهاية الفترة' : 'Period end',
      value: new Date(input.currentPeriodEnd).toLocaleDateString('en-US'),
    });
  }

  const lifecycle: LifecycleStage[] = [];
  if (input.currentPeriodStart) {
    lifecycle.push({
      kind: 'created',
      label: isRTL ? 'بدء الاشتراك' : 'Subscribed',
      at: input.currentPeriodStart,
    });
  }
  if (input.status === 'active') {
    lifecycle.push({ kind: 'active', label: isRTL ? 'نشط حاليًا' : 'Currently active' });
  } else if (input.status === 'paused') {
    lifecycle.push({ kind: 'paused', label: isRTL ? 'موقوف' : 'Paused' });
  } else if (input.status === 'cancelled' || input.status === 'canceled') {
    lifecycle.push({ kind: 'canceled', label: isRTL ? 'ملغى' : 'Canceled', at: input.updatedAt ?? undefined });
  } else if (input.status === 'expired') {
    lifecycle.push({ kind: 'expired', label: isRTL ? 'منتهٍ' : 'Expired', at: input.currentPeriodEnd ?? undefined });
  }

  return {
    subject: {
      title: input.businessName ?? (isRTL ? 'منشأة' : 'Business'),
      subtitle: input.planName ?? undefined,
      refId: input.businessRefId ?? undefined,
      tier: (input.membershipTier ?? 'free') as MembershipDetailsDrawerProps['subject']['tier'],
      status: input.status as MembershipDetailsDrawerProps['subject']['status'],
      meta,
    },
    lifecycle,
  };
}

/** Shape used by AdminMembershipRejections rows. */
export interface RejectionDrawerInput {
  reasonCode: string;
  errorMessage?: string | null;
  requestedTier?: string | null;
  billingCycle?: string | null;
  attemptedBusinessRefId?: string | null;
  actualBusinessRefId?: string | null;
  userRefId?: string | null;
  userId?: string | null;
  createdAt?: string | null;
  isRTL?: boolean;
}

export function buildRejectionDrawerProps(
  input: RejectionDrawerInput,
): Pick<MembershipDetailsDrawerProps, 'subject' | 'lastRejection' | 'lifecycle'> {
  const isRTL = input.isRTL ?? true;
  const meta: NonNullable<MembershipDetailsDrawerProps['subject']['meta']> = [];
  if (input.requestedTier) {
    meta.push({
      label: isRTL ? 'الباقة المطلوبة' : 'Requested tier',
      value: input.requestedTier + (input.billingCycle ? ` · ${input.billingCycle}` : ''),
    });
  }
  if (input.attemptedBusinessRefId) {
    meta.push({
      label: isRTL ? 'المنشأة (المحاولة)' : 'Business (attempt)',
      value: <span className="tech-content">{input.attemptedBusinessRefId}</span> as React.ReactNode,
    });
  }
  if (input.actualBusinessRefId) {
    meta.push({
      label: isRTL ? 'المنشأة (الفعلية)' : 'Business (actual)',
      value: <span className="tech-content">{input.actualBusinessRefId}</span> as React.ReactNode,
    });
  }
  if (input.userRefId || input.userId) {
    meta.push({
      label: isRTL ? 'المستخدم' : 'User',
      value: <span className="tech-content">{input.userRefId ?? input.userId}</span> as React.ReactNode,
    });
  }

  const lifecycle: LifecycleStage[] = [
    {
      kind: 'payment_failed',
      label: isRTL ? 'محاولة ترقية مرفوضة' : 'Upgrade attempt rejected',
      at: input.createdAt ?? undefined,
      tone: 'destructive',
    },
  ];

  return {
    subject: {
      title: isRTL ? 'سياق رفض الترقية' : 'Rejection context',
      subtitle: input.requestedTier ?? undefined,
      meta,
    },
    lastRejection: {
      code: input.reasonCode,
      message: input.errorMessage ?? undefined,
      at: input.createdAt ?? undefined,
    },
    lifecycle,
  };
}