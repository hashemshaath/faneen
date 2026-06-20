import React, { useMemo } from 'react';
import {
  Building2, CheckCircle2, FileEdit, Clock, ShieldCheck,
  Rocket, Phone, Link2, Gauge, TrendingUp, TrendingDown, Beaker,
} from 'lucide-react';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { pickBi } from '@/components/common/Bilingual';
import {
  computeOverviewMetrics,
  computeAdvancedMetrics,
  statusDistribution,
  entityTypeDistribution,
  completenessDistribution,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { QuickActionsCard, type QuickActionKey } from './QuickActionsCard';
import { OverviewChartsSection } from './OverviewChartsSection';
import { OverviewTrendSection } from './OverviewTrendSection';
import { CompletenessSection } from './CompletenessSection';

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
  const adv = useMemo(() => computeAdvancedMetrics(businesses), [businesses]);
  const statusBuckets = useMemo(() => statusDistribution(businesses, isRTL), [businesses, isRTL]);
  const entityBuckets = useMemo(() => entityTypeDistribution(businesses, isRTL), [businesses, isRTL]);
  const completenessBuckets = useMemo(
    () => completenessDistribution(businesses, isRTL),
    [businesses, isRTL],
  );

  const pct = (n: number) => (m.total ? `${Math.round((n / m.total) * 100)}%` : undefined);
  const velocityHint = adv.prevWeeklyCreated
    ? `${adv.weeklyDelta >= 0 ? '+' : ''}${adv.weeklyDeltaPct}% ${pickBi(isRTL, 'مقارنة بالأسبوع السابق', 'vs previous week')}`
    : pickBi(isRTL, 'لا يوجد سجل سابق', 'No prior week');

  const SectionTitle: React.FC<{ ar: string; en: string; sub?: string }> = ({ ar, en, sub }) => (
    <div className="flex items-baseline justify-between gap-2 px-1">
      <h3 className="text-sm font-semibold text-foreground">{pickBi(isRTL, ar, en)}</h3>
      {sub ? <span className="text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="business-control-center-overview">
      {/* 1. Operational quick actions — always first */}
      {onQuickAction ? (
        <QuickActionsCard metrics={m} isRTL={isRTL} onAction={onQuickAction} />
      ) : null}

      {/* 2. Records status — counts by lifecycle stage */}
      <section className="space-y-2">
        <SectionTitle ar="حالة السجلات" en="Records status" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <AdminKpiCard
            label={pickBi(isRTL, 'الإجمالي', 'Total')}
            value={m.total} icon={Building2} tone="primary"
            hint={pickBi(isRTL, 'كل المنشآت المسجّلة', 'all registered entities')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'منشورة', 'Published')}
            value={m.published} icon={CheckCircle2} tone="success" trend={pct(m.published)}
            hint={pickBi(isRTL, 'ظاهرة للعموم', 'public-visible')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'موثّقة', 'Verified')}
            value={m.verified} icon={ShieldCheck} tone="success"
            hint={pickBi(isRTL, 'اجتازت التحقّق', 'passed verification')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'بانتظار المراجعة', 'Pending review')}
            value={m.pendingReview} icon={Clock} tone="warning"
            hint={pickBi(isRTL, 'بحاجة لقرار إداري', 'awaiting admin decision')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'مسودة', 'Drafts')}
            value={m.drafts} icon={FileEdit} tone="muted"
            hint={pickBi(isRTL, 'لم تُنشر بعد', 'not published yet')}
          />
        </div>
      </section>

      {/* 3. Data quality — gaps and integrity */}
      <section className="space-y-2">
        <SectionTitle ar="جودة البيانات" en="Data quality" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <AdminKpiCard
            label={pickBi(isRTL, 'معدل التحقق', 'Verification rate')}
            value={`${adv.verificationRate}%`} icon={ShieldCheck} tone="success"
            hint={pickBi(isRTL, 'موثّقة من الإجمالي', 'verified of total')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'متوسط الاكتمال', 'Avg completeness')}
            value={`${adv.avgCompleteness}%`} icon={Gauge} tone="primary"
            hint={pickBi(isRTL, 'تواصل · رابط · وصف · صور', 'contact · link · desc · media')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'بدون تواصل', 'No contact')}
            value={m.missingContact} icon={Phone} tone="destructive"
            hint={pickBi(isRTL, 'لا هاتف ولا بريد', 'no phone or email')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'بدون رابط عام', 'No public link')}
            value={m.missingPublicLink} icon={Link2} tone="warning"
            hint={pickBi(isRTL, 'يصعب اكتشافها', 'hard to discover')}
          />
        </div>
      </section>

      {/* 4. Activity & readiness — momentum signals */}
      <section className="space-y-2">
        <SectionTitle ar="النشاط والجاهزية" en="Activity & readiness" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <AdminKpiCard
            label={pickBi(isRTL, 'مؤهلة للتشغيل', 'Pilot-ready')}
            value={m.pilotReady} icon={Rocket} tone="accent" trend={pct(m.pilotReady)}
            hint={pickBi(isRTL, 'جاهزة لمرحلة التجربة', 'ready for pilot')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'سرعة الإضافة', 'Weekly velocity')}
            value={adv.weeklyCreated}
            icon={adv.weeklyDelta >= 0 ? TrendingUp : TrendingDown}
            tone={adv.weeklyDelta >= 0 ? 'accent' : 'warning'}
            hint={velocityHint}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'تراكم المراجعة', 'Review backlog')}
            value={adv.reviewBacklog} icon={Clock}
            tone={adv.reviewBacklog > 0 ? 'warning' : 'success'}
            hint={pickBi(isRTL, 'بحاجة لقرار إداري', 'awaiting admin decision')}
          />
          <AdminKpiCard
            label={pickBi(isRTL, 'نسبة التجريبية', 'Demo ratio')}
            value={`${adv.demoRatio}%`} icon={Beaker}
            tone={adv.demoRatio > 10 ? 'destructive' : 'muted'}
            hint={pickBi(isRTL, 'بيانات اختبار يجب تقليلها', 'test data to minimize')}
          />
        </div>
      </section>

      {/* 4. Composition: readiness gauge + status & entity donuts */}
      <OverviewChartsSection
        isRTL={isRTL}
        metrics={m}
        status={statusBuckets}
        entityType={entityBuckets}
      />

      {/* 5. Growth trend + geographic distribution */}
      <OverviewTrendSection isRTL={isRTL} rows={businesses} />

      {/* 6. Completeness gaps — single unified panel */}
      <CompletenessSection
        buckets={completenessBuckets}
        total={m.total}
        isRTL={isRTL}
        avgCompleteness={adv.avgCompleteness}
      />
    </div>
  );
};

export default OverviewTab;