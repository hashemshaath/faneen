/**
 * Leaderboards (top by count / top by value), lead conversion,
 * template adoption, pricing-method distribution, execution-site
 * coverage and risk indicators for admin contract analytics.
 *
 * Pure UI — no Supabase, no queries, no mutations.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, Wallet, Inbox, Layers, MapPin, AlertTriangle,
  CheckCircle2, FileDown,
} from 'lucide-react';
import { AnalyticsKpiCard } from './AnalyticsKpiCard';
import {
  fmtAnalyticsMoney,
  fmtAnalyticsNumber,
  pickAnalyticsLabel,
  type AdminAnalyticsExecutionSiteCoverage,
  type AdminAnalyticsLeadConversionItem,
  type AdminAnalyticsLeaderboardCountItem,
  type AdminAnalyticsLeaderboardValueItem,
  type AdminAnalyticsPricingMethodItem,
  type AdminAnalyticsRiskIndicators,
  type AdminAnalyticsTemplateItem,
  type AnalyticsLanguage,
} from './types';

export interface ContractAnalyticsLeaderboardSectionProps {
  leaderboardByCount: AdminAnalyticsLeaderboardCountItem[];
  leaderboardByValue: AdminAnalyticsLeaderboardValueItem[];
  leadConversion: AdminAnalyticsLeadConversionItem[];
  templateAdoption: AdminAnalyticsTemplateItem[];
  pricingMethodDistribution: AdminAnalyticsPricingMethodItem[];
  executionSiteCoverage: AdminAnalyticsExecutionSiteCoverage;
  riskIndicators: AdminAnalyticsRiskIndicators;
  language: AnalyticsLanguage;
  locale: string;
}

export const ContractAnalyticsLeaderboardSection: React.FC<ContractAnalyticsLeaderboardSectionProps> = ({
  leaderboardByCount,
  leaderboardByValue,
  leadConversion,
  templateAdoption,
  pricingMethodDistribution,
  executionSiteCoverage,
  riskIndicators,
  language,
  locale,
}) => {
  const t = (ar: string, en: string) => pickAnalyticsLabel(language, ar, en);
  const empty = t('لا توجد بيانات', 'No data');
  const n = (v: number) => fmtAnalyticsNumber(v, locale);
  return (
    <>
      {/* Leaderboards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" aria-hidden />
              {t('الأعلى عدداً (20)', 'Top by count (20)')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {leaderboardByCount.length === 0 ? (
              <div className="text-sm text-muted-foreground">{empty}</div>
            ) : (
              <ol className="space-y-1.5">
                {leaderboardByCount.map((b, i) => (
                  <li key={b.business_id} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate">
                      <span className="text-muted-foreground tech-content me-1">{i + 1}.</span>
                      {b.business_name || '—'}
                    </span>
                    <Badge variant="secondary" className="tech-content">{n(b.contracts)}</Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" aria-hidden />
              {t('الأعلى قيمةً (20)', 'Top by value (20)')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {leaderboardByValue.length === 0 ? (
              <div className="text-sm text-muted-foreground">{empty}</div>
            ) : (
              <ol className="space-y-2">
                {leaderboardByValue.map((b, i) => (
                  <li key={b.business_id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="text-muted-foreground tech-content me-1">{i + 1}.</span>
                        {b.business_name || '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {b.value_by_currency.map((c) => (
                        <Badge key={c.currency_code} variant="outline" className="tech-content text-[11px]">
                          {fmtAnalyticsMoney(Number(c.total) || 0, c.currency_code, locale)}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Lead conversion by business */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" aria-hidden />
            {t('تحويل الطلبات حسب المنشأة', 'Lead conversion by business')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {leadConversion.length === 0 ? (
            <div className="text-sm text-muted-foreground">{empty}</div>
          ) : (
            <ul className="space-y-2">
              {leadConversion.map((b) => (
                <li key={b.business_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate">{b.business_name || '—'}</span>
                    <span className="tech-content text-muted-foreground">
                      {n(b.contracts_from_leads)} / {n(b.leads)} ·{' '}
                      <span className="font-semibold text-foreground">{Number(b.rate).toFixed(1)}%</span>
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Number(b.rate)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${b.business_name} conversion rate`}
                  >
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, Number(b.rate) || 0)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Templates / Pricing */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" aria-hidden />
              {t('اعتماد القوالب', 'Template adoption')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {templateAdoption.length === 0 ? (
              <div className="text-sm text-muted-foreground">{empty}</div>
            ) : (
              <ul className="space-y-1.5">
                {templateAdoption.map((tpl) => (
                  <li key={tpl.template_id} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate">{tpl.template_name || '—'}</span>
                    <Badge variant="secondary" className="tech-content">{n(tpl.count)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" aria-hidden />
              {t('توزيع طرق التسعير', 'Pricing method distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pricingMethodDistribution.length === 0 ? (
              <div className="text-sm text-muted-foreground">{empty}</div>
            ) : (
              <ul className="space-y-1.5">
                {pricingMethodDistribution.map((p) => (
                  <li key={p.method} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate">{p.method}</span>
                    <Badge variant="secondary" className="tech-content">{n(p.count)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Site coverage */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            {t('تغطية مواقع التنفيذ', 'Execution site coverage')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <AnalyticsKpiCard label={t('بمواقع', 'With sites')} value={n(executionSiteCoverage.with_sites)} icon={CheckCircle2} tone="success" />
            <AnalyticsKpiCard label={t('بدون مواقع', 'Without sites')} value={n(executionSiteCoverage.without_sites)} icon={AlertTriangle} tone="warning" />
          </div>
          {executionSiteCoverage.top_cities.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('أعلى المدن', 'Top cities')}</div>
              <div className="flex flex-wrap gap-1.5">
                {executionSiteCoverage.top_cities.map((c) => (
                  <Badge key={c.city_name} variant="outline" className="text-xs">
                    {c.city_name} <span className="ms-1 tech-content text-muted-foreground">{n(c.count)}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk indicators */}
      <Card className="rounded-xl border-amber-300/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
            {t('مؤشرات المخاطر', 'Risk indicators')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AnalyticsKpiCard label={t('مسودات بدون موقع', 'Drafts missing sites')} value={n(riskIndicators.drafts_missing_sites)} icon={MapPin} tone="warning" />
            <AnalyticsKpiCard label={t('مسودات بدون تسعير', 'Drafts missing pricing')} value={n(riskIndicators.drafts_missing_pricing)} icon={Wallet} tone="warning" />
            <AnalyticsKpiCard label={t('نشطة بلا PDF حديث', 'Active w/o recent PDF')} value={n(riskIndicators.active_without_recent_pdf)} icon={FileDown} tone="warning" />
          </div>
          {riskIndicators.businesses_with_missing_sites.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t('منشآت بمسودات بلا مواقع', 'Businesses with drafts missing sites')}
              </div>
              <ul className="space-y-1">
                {riskIndicators.businesses_with_missing_sites.map((b) => (
                  <li key={b.business_id} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate">{b.business_name || '—'}</span>
                    <Badge variant="secondary" className="tech-content">{n(b.drafts_missing_sites)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default ContractAnalyticsLeaderboardSection;