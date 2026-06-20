import React, { useMemo } from 'react';
import {
  Building2, CheckCircle2, FileEdit, Clock, ShieldCheck,
  Rocket, Phone, Link2, Activity, Layers, ListChecks,
} from 'lucide-react';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { pickBi } from '@/components/common/Bilingual';
import {
  computeOverviewMetrics,
  statusDistribution,
  entityTypeDistribution,
  completenessDistribution,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { MetricBarList } from './MetricBarList';
import { QuickActionsCard, type QuickActionKey } from './QuickActionsCard';
import { OverviewChartsSection } from './OverviewChartsSection';

interface OverviewTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow>;
  isRTL: boolean;
  onQuickAction?: (key: QuickActionKey) => void;
}

/**
 * Overview tab — phase 1 of the control center. Real KPI cards +
 * three visual-bar groups, all derived from `businesses` (no extra
 * Supabase calls, no fake data, semantic tokens only).
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ businesses, isRTL, onQuickAction }) => {
  const m = useMemo(() => computeOverviewMetrics(businesses), [businesses]);
  const statusBuckets = useMemo(() => statusDistribution(businesses, isRTL), [businesses, isRTL]);
  const entityBuckets = useMemo(() => entityTypeDistribution(businesses, isRTL), [businesses, isRTL]);
  const completenessBuckets = useMemo(
    () => completenessDistribution(businesses, isRTL),
    [businesses, isRTL],
  );

  const pct = (n: number) => (m.total ? `${Math.round((n / m.total) * 100)}%` : undefined);

  return (
    <div className="space-y-6" data-testid="business-control-center-overview">
      {onQuickAction ? (
        <QuickActionsCard metrics={m} isRTL={isRTL} onAction={onQuickAction} />
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <AdminKpiCard
          label={pickBi(isRTL, 'الإجمالي', 'Total')}
          value={m.total} icon={Building2} tone="primary"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'منشورة', 'Published')}
          value={m.published} icon={CheckCircle2} tone="success" trend={pct(m.published)}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'موثّقة', 'Verified')}
          value={m.verified} icon={ShieldCheck} tone="success" trend={pct(m.verified)}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'بانتظار المراجعة', 'Pending review')}
          value={m.pendingReview} icon={Clock} tone="warning"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'مسودة', 'Drafts')}
          value={m.drafts} icon={FileEdit} tone="muted"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'بدون تواصل', 'No contact')}
          value={m.missingContact} icon={Phone} tone="destructive"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'بدون رابط عام', 'No public link')}
          value={m.missingPublicLink} icon={Link2} tone="warning"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'مؤهلة للتشغيل', 'Pilot-ready')}
          value={m.pilotReady} icon={Rocket} tone="accent" trend={pct(m.pilotReady)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricBarList
          title={pickBi(isRTL, 'توزيع الحالات', 'Status distribution')}
          icon={Activity}
          buckets={statusBuckets}
          total={m.total}
          isRTL={isRTL}
          tone="primary"
        />
        <MetricBarList
          title={pickBi(isRTL, 'توزيع نوع الجهة', 'Entity-type distribution')}
          icon={Layers}
          buckets={entityBuckets}
          total={m.total}
          isRTL={isRTL}
          tone="accent"
        />
        <MetricBarList
          title={pickBi(isRTL, 'اكتمال البيانات', 'Data completeness')}
          icon={ListChecks}
          buckets={completenessBuckets}
          total={m.total}
          isRTL={isRTL}
          tone="warning"
        />
      </div>

      <OverviewChartsSection
        isRTL={isRTL}
        metrics={m}
        status={statusBuckets}
        entityType={entityBuckets}
        completeness={completenessBuckets}
      />

    </div>
  );
};

export default OverviewTab;