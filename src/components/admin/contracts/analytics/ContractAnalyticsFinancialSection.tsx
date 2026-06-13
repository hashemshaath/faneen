/**
 * Currency totals (overall + active) plus PDF exports & amendments
 * counters for admin contract analytics. Pure UI — receives slices of
 * the analytics payload. No Supabase, no queries.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, FileDown, Clock, GitBranch } from 'lucide-react';
import { AnalyticsKpiCard } from './AnalyticsKpiCard';
import {
  fmtAnalyticsMoney,
  fmtAnalyticsNumber,
  pickAnalyticsLabel,
  type AdminAnalyticsAmendments,
  type AdminAnalyticsPdfExports,
  type AnalyticsCurrencyAmount,
  type AnalyticsLanguage,
} from './types';

export interface ContractAnalyticsFinancialSectionProps {
  valueByCurrency: AnalyticsCurrencyAmount[];
  activeValueByCurrency: AnalyticsCurrencyAmount[];
  pdfExports: AdminAnalyticsPdfExports;
  amendments: AdminAnalyticsAmendments;
  language: AnalyticsLanguage;
  locale: string;
}

const CurrencyBlock: React.FC<{
  title: string;
  emptyLabel: string;
  arr: AnalyticsCurrencyAmount[];
  locale: string;
}> = ({ title, emptyLabel, arr, locale }) => (
  <Card className="rounded-xl">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" aria-hidden />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      {arr.length === 0 ? (
        <div className="text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {arr.map((c) => (
            <div
              key={c.currency_code}
              className="px-3 py-2 rounded-lg bg-muted/40 border border-border"
            >
              <div className="text-xs text-muted-foreground">{c.currency_code}</div>
              <div className="text-base font-semibold tech-content">
                {fmtAnalyticsMoney(Number(c.total) || 0, c.currency_code, locale)}
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export const ContractAnalyticsFinancialSection: React.FC<ContractAnalyticsFinancialSectionProps> = ({
  valueByCurrency,
  activeValueByCurrency,
  pdfExports,
  amendments,
  language,
  locale,
}) => {
  const t = (ar: string, en: string) => pickAnalyticsLabel(language, ar, en);
  const emptyLabel = t('لا توجد بيانات', 'No data');
  return (
    <>
      <section aria-label={t('القيم حسب العملة', 'Values by currency')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CurrencyBlock
            title={t('إجمالي القيمة', 'Total value')}
            emptyLabel={emptyLabel}
            arr={valueByCurrency}
            locale={locale}
          />
          <CurrencyBlock
            title={t('قيمة العقود النشطة', 'Active value')}
            emptyLabel={emptyLabel}
            arr={activeValueByCurrency}
            locale={locale}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileDown className="h-4 w-4 text-primary" aria-hidden />
              {t('تصدير PDF', 'PDF exports')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid grid-cols-2 gap-3">
            <AnalyticsKpiCard
              label={t('عدد التصديرات', 'Exports count')}
              value={fmtAnalyticsNumber(pdfExports.exports_count, locale)}
              icon={FileDown}
            />
            <AnalyticsKpiCard
              label={t('آخر تصدير', 'Last export')}
              value={
                pdfExports.last_exported_at
                  ? new Date(pdfExports.last_exported_at).toLocaleDateString(locale)
                  : '—'
              }
              icon={Clock}
            />
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" aria-hidden />
              {t('التعديلات', 'Amendments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="text-2xl font-semibold tech-content">
              {fmtAnalyticsNumber(amendments.total, locale)}
            </div>
            {amendments.by_event.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {amendments.by_event.map((e) => (
                  <Badge key={e.event} variant="outline" className="text-xs">
                    {e.event}{' '}
                    <span className="ms-1 tech-content text-muted-foreground">
                      {fmtAnalyticsNumber(e.count, locale)}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
};

export default ContractAnalyticsFinancialSection;