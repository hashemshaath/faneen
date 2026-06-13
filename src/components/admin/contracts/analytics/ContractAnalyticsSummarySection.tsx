/**
 * Top KPI grid for admin contract analytics (totals + by_status overview).
 * Pure UI — receives pre-fetched summary data; no Supabase, no queries.
 */
import React from 'react';
import {
  FileText, CheckCircle2, Clock, XCircle, AlertTriangle,
  TrendingUp, Users, Building2,
} from 'lucide-react';
import { AnalyticsKpiCard } from './AnalyticsKpiCard';
import {
  fmtAnalyticsNumber,
  pickAnalyticsLabel,
  type AdminAnalyticsSummary,
  type AnalyticsLanguage,
} from './types';

export interface ContractAnalyticsSummarySectionProps {
  summary: AdminAnalyticsSummary;
  language: AnalyticsLanguage;
  locale: string;
}

export const ContractAnalyticsSummarySection: React.FC<ContractAnalyticsSummarySectionProps> = ({
  summary,
  language,
  locale,
}) => {
  const t = (ar: string, en: string) => pickAnalyticsLabel(language, ar, en);
  const n = (v: number) => fmtAnalyticsNumber(v, locale);
  return (
    <section aria-label={t('ملخص المنصة', 'Platform summary')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKpiCard label={t('إجمالي العقود', 'Total contracts')} value={n(summary.contracts_total)} icon={FileText} />
        <AnalyticsKpiCard label={t('منشأ في الفترة', 'Created in period')} value={n(summary.created_this_period)} icon={FileText} tone="info" />
        <AnalyticsKpiCard label={t('مكتمل في الفترة', 'Completed in period')} value={n(summary.completed_this_period)} icon={CheckCircle2} tone="success" />
        <AnalyticsKpiCard label={t('مزودون نشطون', 'Active providers')} value={n(summary.providers_active)} icon={Users} />
        <AnalyticsKpiCard label={t('منشآت بعقود', 'Businesses w/ contracts')} value={n(summary.businesses_with_contracts)} icon={Building2} />
        <AnalyticsKpiCard label={t('نشط', 'Active')} value={n(summary.by_status.active)} icon={TrendingUp} tone="success" />
        <AnalyticsKpiCard label={t('مكتمل', 'Completed')} value={n(summary.by_status.completed)} icon={CheckCircle2} tone="success" />
        <AnalyticsKpiCard label={t('قيد الموافقة', 'Pending approval')} value={n(summary.by_status.pending_approval)} icon={Clock} tone="warning" />
        <AnalyticsKpiCard label={t('مسودة', 'Draft')} value={n(summary.by_status.draft)} icon={FileText} tone="info" />
        <AnalyticsKpiCard label={t('ملغي', 'Cancelled')} value={n(summary.by_status.cancelled)} icon={XCircle} tone="destructive" />
        <AnalyticsKpiCard label={t('متنازع عليه', 'Disputed')} value={n(summary.by_status.disputed)} icon={AlertTriangle} tone="destructive" />
      </div>
    </section>
  );
};

export default ContractAnalyticsSummarySection;