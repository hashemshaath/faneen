import React, { useMemo } from 'react';
import {
  Building2, CheckCircle2, FileEdit, Clock, ShieldCheck,
  Rocket, Phone, Link2, Gauge, TrendingUp, TrendingDown, Beaker,
} from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { StatTile } from './StatTile';
import {
  computeOverviewMetrics,
  computeAdvancedMetrics,
  computeHealthScore,
  weeklyCreationSeries,
  statusDistribution,
  entityTypeDistribution,
  completenessDistribution,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { QuickActionsCard, type QuickActionKey } from './QuickActionsCard';
import { OverviewChartsSection } from './OverviewChartsSection';
import { OverviewTrendSection } from './OverviewTrendSection';
import { CompletenessSection } from './CompletenessSection';
import { HealthScoreCard } from './HealthScoreCard';

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
  const health = useMemo(() => computeHealthScore(businesses), [businesses]);
  const velocitySpark = useMemo(() => weeklyCreationSeries(businesses, 8), [businesses]);
  const statusBuckets = useMemo(() => statusDistribution(businesses, isRTL), [businesses, isRTL]);
  const entityBuckets = useMemo(() => entityTypeDistribution(businesses, isRTL), [businesses, isRTL]);
  const completenessBuckets = useMemo(
    () => completenessDistribution(businesses, isRTL),
    [businesses, isRTL],
  );

  const ratioOf = (n: number) => (m.total ? (n / m.total) * 100 : undefined);
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

      {/* Executive health score — weighted composite */}
      <HealthScoreCard health={health} isRTL={isRTL} />

      {/* 2. Records status — counts by lifecycle stage */}
      <section className="space-y-2">
        <SectionTitle ar="حالة السجلات" en="Records status" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'الإجمالي', 'Total')}
            value={m.total} icon={Building2} tone="primary"
            hint={pickBi(isRTL, 'كل المنشآت المسجّلة', 'all registered entities')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'منشورة', 'Published')}
            value={m.published} ofTotal={m.total} icon={CheckCircle2} tone="success"
            ratio={ratioOf(m.published)}
            hint={pickBi(isRTL, 'ظاهرة للعموم', 'public-visible')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'موثّقة', 'Verified')}
            value={m.verified} ofTotal={m.total} icon={ShieldCheck} tone="success"
            ratio={ratioOf(m.verified)}
            hint={pickBi(isRTL, 'اجتازت التحقّق', 'passed verification')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'بانتظار المراجعة', 'Pending review')}
            value={m.pendingReview} ofTotal={m.total} icon={Clock} tone="warning"
            ratio={ratioOf(m.pendingReview)}
            hint={pickBi(isRTL, 'بحاجة لقرار إداري', 'awaiting admin decision')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'مسودة', 'Drafts')}
            value={m.drafts} ofTotal={m.total} icon={FileEdit} tone="muted"
            ratio={ratioOf(m.drafts)}
            hint={pickBi(isRTL, 'لم تُنشر بعد', 'not published yet')}
          />
        </div>
      </section>

      {/* 3. Data quality — gaps and integrity */}
      <section className="space-y-2">
        <SectionTitle ar="جودة البيانات" en="Data quality" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'معدل التحقق', 'Verification rate')}
            value={`${adv.verificationRate}%`} icon={ShieldCheck} tone="success"
            ratio={adv.verificationRate}
            hint={pickBi(isRTL, 'موثّقة من الإجمالي', 'verified of total')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'متوسط الاكتمال', 'Avg completeness')}
            value={`${adv.avgCompleteness}%`} icon={Gauge} tone="primary"
            ratio={adv.avgCompleteness}
            hint={pickBi(isRTL, 'تواصل · رابط · وصف · صور', 'contact · link · desc · media')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'بدون تواصل', 'No contact')}
            value={m.missingContact} ofTotal={m.total} icon={Phone} tone="destructive"
            ratio={ratioOf(m.missingContact)}
            hint={pickBi(isRTL, 'لا هاتف ولا بريد', 'no phone or email')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'بدون رابط عام', 'No public link')}
            value={m.missingPublicLink} ofTotal={m.total} icon={Link2} tone="warning"
            ratio={ratioOf(m.missingPublicLink)}
            hint={pickBi(isRTL, 'يصعب اكتشافها', 'hard to discover')}
          />
        </div>
      </section>

      {/* 4. Activity & readiness — momentum signals */}
      <section className="space-y-2">
        <SectionTitle ar="النشاط والجاهزية" en="Activity & readiness" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'مؤهلة للتشغيل', 'Pilot-ready')}
            value={m.pilotReady} ofTotal={m.total} icon={Rocket} tone="accent"
            ratio={ratioOf(m.pilotReady)}
            hint={pickBi(isRTL, 'جاهزة لمرحلة التجربة', 'ready for pilot')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'سرعة الإضافة', 'Weekly velocity')}
            value={adv.weeklyCreated}
            icon={adv.weeklyDelta >= 0 ? TrendingUp : TrendingDown}
            tone={adv.weeklyDelta >= 0 ? 'info' : 'warning'}
            delta={adv.prevWeeklyCreated ? adv.weeklyDeltaPct : undefined}
            hint={velocityHint}
            spark={velocitySpark}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'تراكم المراجعة', 'Review backlog')}
            value={adv.reviewBacklog} icon={Clock}
            tone={adv.reviewBacklog > 0 ? 'warning' : 'success'}
            hint={pickBi(isRTL, 'بحاجة لقرار إداري', 'awaiting admin decision')}
          />
          <StatTile isRTL={isRTL}
            label={pickBi(isRTL, 'نسبة التجريبية', 'Demo ratio')}
            value={`${adv.demoRatio}%`} icon={Beaker}
            tone={adv.demoRatio > 10 ? 'destructive' : 'muted'}
            ratio={adv.demoRatio}
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