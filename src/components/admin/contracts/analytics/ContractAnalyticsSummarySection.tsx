/**
 * Top KPI grid for admin contract analytics (totals + by_status overview).
 * Pure UI — receives pre-fetched summary data; no Supabase, no queries.
 */
import React from 'react';
import {
  FileText, CheckCircle2, Users, Building2,
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
      </div>
    </section>
  );
};

export default ContractAnalyticsSummarySection;