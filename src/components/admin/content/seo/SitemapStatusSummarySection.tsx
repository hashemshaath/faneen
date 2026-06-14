import React from 'react';
import { Link2, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { MetricCard } from '@/components/shared';

/**
 * SitemapStatusSummarySection — pre-computed KPI grid for the sitemap
 * status page. Counts come from the parent; this component never queries
 * sitemap, edge functions, or the DB.
 */
export interface SitemapStatusSummarySectionProps {
  isLoading: boolean;
  totalUrls: number;
  okCount: number;
  errorCount: number;
  spaCount: number;
  healthScore: number;
  isAr: boolean;
}

export const SitemapStatusSummarySection: React.FC<SitemapStatusSummarySectionProps> = ({
  isLoading, totalUrls, okCount, errorCount, spaCount, healthScore, isAr,
}) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <MetricCard
      label={isAr ? 'إجمالي الروابط' : 'Total URLs'}
      value={isLoading ? '—' : totalUrls}
      icon={Link2}
      tone="primary"
      hint={isAr ? 'داخل جميع sitemaps' : 'across all sitemaps'}
    />
    <MetricCard
      label={isAr ? 'مسارات سليمة' : 'Healthy'}
      value={isLoading ? '—' : okCount}
      icon={CheckCircle2}
      tone="success"
      hint={`${healthScore}% ${isAr ? 'صحة' : 'health'}`}
    />
    <MetricCard
      label={isAr ? 'أخطاء' : 'Errors'}
      value={isLoading ? '—' : errorCount}
      icon={AlertTriangle}
      tone={errorCount ? 'destructive' : 'muted'}
    />
    <MetricCard
      label={isAr ? 'SPA fallback' : 'SPA fallback'}
      value={isLoading ? '—' : spaCount}
      icon={Activity}
      tone={spaCount ? 'warning' : 'muted'}
      hint={isAr ? 'يجب أن يكون 0' : 'should be 0'}
    />
  </div>
);

export default SitemapStatusSummarySection;