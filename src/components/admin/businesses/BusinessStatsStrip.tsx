import React, { useMemo } from 'react';
import {
  Building2, CheckCircle2, Clock, FileText, Crown,
  XCircle, FileEdit, ShieldCheck,
} from 'lucide-react';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { pickBi } from '@/components/common/Bilingual';

/**
 * BusinessStatsStrip — semantic admin KPI grid for AdminBusinesses.
 *
 * Replaces the inline 5-card slot with a richer, color-coded set
 * of operational metrics. All counts are derived client-side from
 * the safe-column business list already in memory (no extra Supabase
 * queries, no sensitive-field reads).
 *
 * Semantic color mapping (tokens only — no hex):
 *   - primary    → totals / informational
 *   - success    → published / active / verified
 *   - warning    → pending / under review
 *   - destructive→ rejected / suspended
 *   - muted      → drafts / inactive
 *   - accent     → contracts (operational signal)
 */
export type BusinessStatsRow = {
  id: string;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  approval_status?: string | null;
  membership_tier?: string | null;
};

interface BusinessStatsStripProps {
  businesses: ReadonlyArray<BusinessStatsRow>;
  contractBusinessIds: ReadonlyArray<string>;
  isRTL: boolean;
  className?: string;
}

const isPending = (s?: string | null) => {
  const v = (s || '').toLowerCase();
  return v === 'pending' || v === 'in_review' || v === 'review';
};
const isRejected = (s?: string | null) => {
  const v = (s || '').toLowerCase();
  return v === 'rejected' || v === 'suspended';
};
const isDraft = (b: BusinessStatsRow) => {
  const v = (b.approval_status || '').toLowerCase();
  if (v === 'draft') return true;
  // No approval status set, never activated/verified → treat as draft
  return !v && b.is_active === false && b.is_verified === false;
};

export const BusinessStatsStrip: React.FC<BusinessStatsStripProps> = ({
  businesses, contractBusinessIds, isRTL, className,
}) => {
  const s = useMemo(() => {
    const total = businesses.length;
    const active = businesses.filter((b) => b.is_active).length;
    const verified = businesses.filter((b) => b.is_verified).length;
    const pending = businesses.filter((b) => isPending(b.approval_status)).length;
    const rejected = businesses.filter((b) => isRejected(b.approval_status)).length;
    const drafts = businesses.filter(isDraft).length;
    const premium = businesses.filter(
      (b) => b.membership_tier === 'premium' || b.membership_tier === 'enterprise',
    ).length;
    return { total, active, verified, pending, rejected, drafts, premium };
  }, [businesses]);

  const pct = (n: number) => (s.total ? `${Math.round((n / s.total) * 100)}%` : undefined);

  return (
    <div
      className={[
        'grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3',
        className ?? '',
      ].join(' ')}
      data-testid="business-stats-strip"
    >
      <AdminKpiCard
        label={pickBi(isRTL, 'الإجمالي', 'Total')}
        value={s.total}
        icon={Building2}
        tone="primary"
      />
      <AdminKpiCard
        label={pickBi(isRTL, 'منشورة', 'Published')}
        value={s.active}
        icon={CheckCircle2}
        tone="success"
        trend={pct(s.active)}
      />
      <AdminKpiCard
        label={pickBi(isRTL, 'موثّقة', 'Verified')}
        value={s.verified}
        icon={ShieldCheck}
        tone="success"
        trend={pct(s.verified)}
      />
      <AdminKpiCard
        label={pickBi(isRTL, 'قيد المراجعة', 'Under Review')}
        value={s.pending}
        icon={Clock}
        tone="warning"
      />
      <AdminKpiCard
        label={pickBi(isRTL, 'مسودات', 'Drafts')}
        value={s.drafts}
        icon={FileEdit}
        tone="muted"
      />
      <AdminKpiCard
        label={pickBi(isRTL, 'مرفوضة / معلّقة', 'Rejected / Suspended')}
        value={s.rejected}
        icon={XCircle}
        tone="destructive"
      />
      <AdminKpiCard
        label={pickBi(isRTL, 'بعقود فعّالة', 'With Contracts')}
        value={contractBusinessIds.length}
        icon={FileText}
        tone="accent"
      />
      <AdminKpiCard
        label={pickBi(isRTL, 'مميّز / مؤسسات', 'Premium / Enterprise')}
        value={s.premium}
        icon={Crown}
        tone="info"
      />
    </div>
  );
};

export default BusinessStatsStrip;