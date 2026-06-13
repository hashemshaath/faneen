import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { getAdminContractAnalyticsDashboard } from '@/modules/contracts';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { BarChart3, AlertTriangle, RefreshCcw } from 'lucide-react';
import {
  ContractAnalyticsSummarySection,
  ContractAnalyticsStatusSection,
  ContractAnalyticsTrendSection,
  ContractAnalyticsFinancialSection,
  ContractAnalyticsLeaderboardSection,
  type AdminAnalyticsPayload,
  type AnalyticsPeriod,
} from '@/components/admin/contracts/analytics';

const PERIODS: { key: AnalyticsPeriod; ar: string; en: string }[] = [
  { key: '7d', ar: '7 أيام', en: '7d' },
  { key: '30d', ar: '30 يوم', en: '30d' },
  { key: '90d', ar: '90 يوم', en: '90d' },
  { key: '12m', ar: '12 شهر', en: '12m' },
  { key: 'all', ar: 'الكل', en: 'All' },
];

const AdminContractAnalytics: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [includeDemo, setIncludeDemo] = useState(false);
  const locale = language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  usePageMeta({
    title: t('تحليلات العقود — الإدارة', 'Contract Analytics — Admin'),
    description: t('نظرة إجمالية على عقود المنصة', 'Platform-wide contract analytics overview'),
  });
  useNoIndex();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<AdminAnalyticsPayload>({
    queryKey: ['admin-contract-analytics', period, null, includeDemo],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data: rpcData, error: rpcError } = await getAdminContractAnalyticsDashboard(
        { _period: period, _business_id: undefined, _include_demo: includeDemo },
      );
      if (rpcError) throw rpcError;
      return rpcData as unknown as AdminAnalyticsPayload;
    },
  });

  const errMessage = error instanceof Error ? error.message : '';
  const isForbidden = errMessage.includes('FORBIDDEN') || errMessage.includes('UNAUTHENTICATED');

  return (
    <DashboardLayout>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
              {t('تحليلات العقود — الإدارة', 'Contract Analytics — Admin')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('بيانات إجمالية فقط — بدون أي معلومات تعريفية للعملاء.', 'Aggregate-only data — no client identifying information.')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label={t('عناصر التحكم', 'Controls')}>
            <label className={cn(
              "flex items-center gap-2 h-9 px-3 rounded-lg border text-sm",
              includeDemo ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-border bg-background',
            )}>
              <Switch
                checked={includeDemo}
                onCheckedChange={setIncludeDemo}
                aria-label={t('تضمين البيانات التجريبية', 'Include demo data')}
              />
              <span>{t('تضمين البيانات التجريبية', 'Include demo')}</span>
            </label>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'h-9 px-3 rounded-lg text-sm border transition-colors',
                  period === p.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted/50 border-border',
                )}
              >
                {language === 'ar' ? p.ar : p.en}
              </button>
            ))}
            <Button
              variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
              aria-label={t('تحديث', 'Refresh')} className="h-9"
            >
              <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-busy="true" role="status">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <Card className="rounded-xl border-destructive/30">
            <CardContent className="p-6 text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" aria-hidden />
              <div className="font-semibold">
                {isForbidden ? t('وصول غير مسموح', 'Access denied') : t('تعذّر تحميل التحليلات', 'Failed to load analytics')}
              </div>
              <p className="text-sm text-muted-foreground">
                {isForbidden
                  ? t('هذه الصفحة متاحة للمشرفين فقط.', 'This page is restricted to admins.')
                  : t('حاول التحديث بعد قليل.', 'Please try again shortly.')}
              </p>
            </CardContent>
          </Card>
        )}

        {data && !isLoading && !isError && (
          <>
            <ContractAnalyticsSummarySection summary={data.summary} language={language} locale={locale} />
            <ContractAnalyticsStatusSection summary={data.summary} language={language} locale={locale} isRTL={isRTL} />
            <ContractAnalyticsTrendSection items={data.monthly_trend} language={language} locale={locale} />
            <ContractAnalyticsFinancialSection
              valueByCurrency={data.value_by_currency}
              activeValueByCurrency={data.active_value_by_currency}
              pdfExports={data.pdf_exports}
              amendments={data.amendments}
              language={language}
              locale={locale}
            />
            <ContractAnalyticsLeaderboardSection
              leaderboardByCount={data.leaderboard_by_count}
              leaderboardByValue={data.leaderboard_by_value}
              leadConversion={data.lead_conversion_by_business}
              templateAdoption={data.template_adoption}
              pricingMethodDistribution={data.pricing_method_distribution}
              executionSiteCoverage={data.execution_site_coverage}
              riskIndicators={data.risk_indicators}
              language={language}
              locale={locale}
            />

            <p className="text-[11px] text-muted-foreground">
              {t(
                'تحدّث البيانات كل 60 ثانية. القيم النقدية تُعرض حسب العملة ولا تُجمع عبر العملات.',
                'Data refreshes every 60 seconds. Monetary values are grouped by currency and never summed across currencies.',
              )}
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminContractAnalytics;
