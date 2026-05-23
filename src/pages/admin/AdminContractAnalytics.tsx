import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { getAdminContractAnalyticsDashboard } from '@/modules/contracts';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  BarChart3, FileText, CheckCircle2, Clock, XCircle, AlertTriangle,
  TrendingUp, MapPin, Layers, Wallet, Inbox, RefreshCcw, Users, Building2,
  Trophy, FileDown, GitBranch,
} from 'lucide-react';

type Period = '7d' | '30d' | '90d' | '12m' | 'all';

interface CurrencyAmount { currency_code: string; total: number }
interface AdminAnalytics {
  generated_at: string;
  period: { key: Period; from: string | null; to: string };
  scope: { business_id: string | null; include_demo: boolean };
  summary: {
    contracts_total: number;
    by_status: Record<'draft'|'pending_approval'|'active'|'completed'|'cancelled'|'disputed', number>;
    created_this_period: number;
    completed_this_period: number;
    providers_active: number;
    businesses_with_contracts: number;
  };
  value_by_currency: CurrencyAmount[];
  active_value_by_currency: CurrencyAmount[];
  monthly_trend: { month: string; created: number; completed: number }[];
  leaderboard_by_count: { business_id: string; business_name: string; contracts: number }[];
  leaderboard_by_value: { business_id: string; business_name: string; value_by_currency: CurrencyAmount[] }[];
  lead_conversion_by_business: { business_id: string; business_name: string; leads: number; contracts_from_leads: number; rate: number }[];
  template_adoption: { template_id: string; template_name: string; count: number }[];
  pricing_method_distribution: { method: string; count: number }[];
  execution_site_coverage: { with_sites: number; without_sites: number; top_cities: { city_name: string; count: number }[] };
  pdf_exports: { exports_count: number; last_exported_at: string | null };
  amendments: { total: number; by_event: { event: string; count: number }[] };
  risk_indicators: {
    drafts_missing_sites: number;
    drafts_missing_pricing: number;
    active_without_recent_pdf: number;
    businesses_with_missing_sites: { business_id: string; business_name: string; drafts_missing_sites: number }[];
  };
}

const PERIODS: { key: Period; ar: string; en: string }[] = [
  { key: '7d', ar: '٧ أيام', en: '7d' },
  { key: '30d', ar: '٣٠ يوم', en: '30d' },
  { key: '90d', ar: '٩٠ يوم', en: '90d' },
  { key: '12m', ar: '١٢ شهر', en: '12m' },
  { key: 'all', ar: 'الكل', en: 'All' },
];

const fmtNumber = (n: number, locale: string) => new Intl.NumberFormat(locale).format(n ?? 0);
const fmtMoney = (a: number, ccy: string, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(a ?? 0);
  } catch { return `${fmtNumber(a ?? 0, locale)} ${ccy}`; }
};

const KpiCard: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; tone?: 'default'|'success'|'warning'|'info'|'destructive' }> =
({ label, value, icon: Icon, tone = 'default' }) => {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-sky-600 dark:text-sky-400',
    destructive: 'text-destructive',
  }[tone];
  return (
    <Card className="rounded-xl hover-lift">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate">{label}</div>
            <div className={cn('text-2xl font-semibold mt-1 tech-content', toneClass)}>{value}</div>
          </div>
          <Icon className={cn('h-5 w-5 shrink-0 opacity-70', toneClass)} aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
};

const AdminContractAnalytics: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const [period, setPeriod] = useState<Period>('30d');
  const [includeDemo, setIncludeDemo] = useState(false);
  const locale = language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  usePageMeta({
    title: t('تحليلات العقود — الإدارة', 'Contract Analytics — Admin'),
    description: t('نظرة إجمالية على عقود المنصة', 'Platform-wide contract analytics overview'),
  });
  useNoIndex();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<AdminAnalytics>({
    queryKey: ['admin-contract-analytics', period, null, includeDemo],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data: rpcData, error: rpcError } = await getAdminContractAnalyticsDashboard(
        { _period: period, _business_id: undefined, _include_demo: includeDemo },
      );
      if (rpcError) throw rpcError;
      return rpcData as unknown as AdminAnalytics;
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
            {/* Summary */}
            <section aria-label={t('ملخص المنصة', 'Platform summary')}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label={t('إجمالي العقود', 'Total contracts')} value={fmtNumber(data.summary.contracts_total, locale)} icon={FileText} />
                <KpiCard label={t('منشأ في الفترة', 'Created in period')} value={fmtNumber(data.summary.created_this_period, locale)} icon={FileText} tone="info" />
                <KpiCard label={t('مكتمل في الفترة', 'Completed in period')} value={fmtNumber(data.summary.completed_this_period, locale)} icon={CheckCircle2} tone="success" />
                <KpiCard label={t('مزودون نشطون', 'Active providers')} value={fmtNumber(data.summary.providers_active, locale)} icon={Users} />
                <KpiCard label={t('منشآت بعقود', 'Businesses w/ contracts')} value={fmtNumber(data.summary.businesses_with_contracts, locale)} icon={Building2} />
                <KpiCard label={t('نشط', 'Active')} value={fmtNumber(data.summary.by_status.active, locale)} icon={TrendingUp} tone="success" />
                <KpiCard label={t('مكتمل', 'Completed')} value={fmtNumber(data.summary.by_status.completed, locale)} icon={CheckCircle2} tone="success" />
                <KpiCard label={t('قيد الموافقة', 'Pending approval')} value={fmtNumber(data.summary.by_status.pending_approval, locale)} icon={Clock} tone="warning" />
                <KpiCard label={t('مسودة', 'Draft')} value={fmtNumber(data.summary.by_status.draft, locale)} icon={FileText} tone="info" />
                <KpiCard label={t('ملغي', 'Cancelled')} value={fmtNumber(data.summary.by_status.cancelled, locale)} icon={XCircle} tone="destructive" />
                <KpiCard label={t('متنازع عليه', 'Disputed')} value={fmtNumber(data.summary.by_status.disputed, locale)} icon={AlertTriangle} tone="destructive" />
              </div>
            </section>

            {/* Value by currency */}
            <section aria-label={t('القيم حسب العملة', 'Values by currency')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  ['value_by_currency', 'إجمالي القيمة', 'Total value'] as const,
                  ['active_value_by_currency', 'قيمة العقود النشطة', 'Active value'] as const,
                ]).map(([key, ar, en]) => {
                  const arr = data[key];
                  return (
                    <Card key={key} className="rounded-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-primary" aria-hidden />{t(ar, en)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {arr.length === 0 ? (
                          <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {arr.map((c) => (
                              <div key={c.currency_code} className="px-3 py-2 rounded-lg bg-muted/40 border border-border">
                                <div className="text-xs text-muted-foreground">{c.currency_code}</div>
                                <div className="text-base font-semibold tech-content">{fmtMoney(Number(c.total) || 0, c.currency_code, locale)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Monthly trend (compact bar list) */}
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden />{t('الاتجاه الشهري', 'Monthly trend')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.monthly_trend.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                ) : (
                  <ul className="space-y-2">
                    {(() => {
                      const max = Math.max(1, ...data.monthly_trend.map(m => Math.max(m.created, m.completed)));
                      return data.monthly_trend.map((m) => (
                        <li key={m.month} className="grid grid-cols-12 items-center gap-2 text-xs">
                          <span className="col-span-2 tech-content text-muted-foreground">{m.month}</span>
                          <div className="col-span-8 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-2 rounded-full bg-primary/70" style={{ width: `${(m.created/max)*100}%` }} aria-hidden />
                              <span className="tech-content">{fmtNumber(m.created, locale)} {t('منشأ', 'created')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 rounded-full bg-emerald-500/70" style={{ width: `${(m.completed/max)*100}%` }} aria-hidden />
                              <span className="tech-content">{fmtNumber(m.completed, locale)} {t('مكتمل', 'completed')}</span>
                            </div>
                          </div>
                        </li>
                      ));
                    })()}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Leaderboards */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" aria-hidden />{t('الأعلى عدداً (٢٠)', 'Top by count (20)')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.leaderboard_by_count.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                  ) : (
                    <ol className="space-y-1.5">
                      {data.leaderboard_by_count.map((b, i) => (
                        <li key={b.business_id} className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate">
                            <span className="text-muted-foreground tech-content me-1">{i+1}.</span>
                            {b.business_name || '—'}
                          </span>
                          <Badge variant="secondary" className="tech-content">{fmtNumber(b.contracts, locale)}</Badge>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" aria-hidden />{t('الأعلى قيمةً (٢٠)', 'Top by value (20)')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.leaderboard_by_value.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                  ) : (
                    <ol className="space-y-2">
                      {data.leaderboard_by_value.map((b, i) => (
                        <li key={b.business_id} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">
                              <span className="text-muted-foreground tech-content me-1">{i+1}.</span>
                              {b.business_name || '—'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {b.value_by_currency.map((c) => (
                              <Badge key={c.currency_code} variant="outline" className="tech-content text-[11px]">
                                {fmtMoney(Number(c.total) || 0, c.currency_code, locale)}
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
                  <Inbox className="h-4 w-4 text-primary" aria-hidden />{t('تحويل الطلبات حسب المنشأة', 'Lead conversion by business')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.lead_conversion_by_business.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                ) : (
                  <ul className="space-y-2">
                    {data.lead_conversion_by_business.map((b) => (
                      <li key={b.business_id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate">{b.business_name || '—'}</span>
                          <span className="tech-content text-muted-foreground">
                            {fmtNumber(b.contracts_from_leads, locale)} / {fmtNumber(b.leads, locale)} ·{' '}
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
                    <Layers className="h-4 w-4 text-primary" aria-hidden />{t('اعتماد القوالب', 'Template adoption')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.template_adoption.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {data.template_adoption.map((t2) => (
                        <li key={t2.template_id} className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate">{t2.template_name || '—'}</span>
                          <Badge variant="secondary" className="tech-content">{fmtNumber(t2.count, locale)}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" aria-hidden />{t('توزيع طرق التسعير', 'Pricing method distribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.pricing_method_distribution.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {data.pricing_method_distribution.map((p) => (
                        <li key={p.method} className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate">{p.method}</span>
                          <Badge variant="secondary" className="tech-content">{fmtNumber(p.count, locale)}</Badge>
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
                  <MapPin className="h-4 w-4 text-primary" aria-hidden />{t('تغطية مواقع التنفيذ', 'Execution site coverage')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard label={t('بمواقع', 'With sites')} value={fmtNumber(data.execution_site_coverage.with_sites, locale)} icon={CheckCircle2} tone="success" />
                  <KpiCard label={t('بدون مواقع', 'Without sites')} value={fmtNumber(data.execution_site_coverage.without_sites, locale)} icon={AlertTriangle} tone="warning" />
                </div>
                {data.execution_site_coverage.top_cities.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('أعلى المدن', 'Top cities')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.execution_site_coverage.top_cities.map((c) => (
                        <Badge key={c.city_name} variant="outline" className="text-xs">
                          {c.city_name} <span className="ms-1 tech-content text-muted-foreground">{fmtNumber(c.count, locale)}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PDF + Amendments */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileDown className="h-4 w-4 text-primary" aria-hidden />{t('تصدير PDF', 'PDF exports')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 grid grid-cols-2 gap-3">
                  <KpiCard label={t('عدد التصديرات', 'Exports count')} value={fmtNumber(data.pdf_exports.exports_count, locale)} icon={FileDown} />
                  <KpiCard
                    label={t('آخر تصدير', 'Last export')}
                    value={data.pdf_exports.last_exported_at
                      ? new Date(data.pdf_exports.last_exported_at).toLocaleDateString(locale)
                      : '—'}
                    icon={Clock}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" aria-hidden />{t('التعديلات', 'Amendments')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="text-2xl font-semibold tech-content">{fmtNumber(data.amendments.total, locale)}</div>
                  {data.amendments.by_event.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {data.amendments.by_event.map((e) => (
                        <Badge key={e.event} variant="outline" className="text-xs">
                          {e.event} <span className="ms-1 tech-content text-muted-foreground">{fmtNumber(e.count, locale)}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

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
                  <KpiCard label={t('مسودات بدون موقع', 'Drafts missing sites')} value={fmtNumber(data.risk_indicators.drafts_missing_sites, locale)} icon={MapPin} tone="warning" />
                  <KpiCard label={t('مسودات بدون تسعير', 'Drafts missing pricing')} value={fmtNumber(data.risk_indicators.drafts_missing_pricing, locale)} icon={Wallet} tone="warning" />
                  <KpiCard label={t('نشطة بلا PDF حديث', 'Active w/o recent PDF')} value={fmtNumber(data.risk_indicators.active_without_recent_pdf, locale)} icon={FileDown} tone="warning" />
                </div>
                {data.risk_indicators.businesses_with_missing_sites.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {t('منشآت بمسودات بلا مواقع', 'Businesses with drafts missing sites')}
                    </div>
                    <ul className="space-y-1">
                      {data.risk_indicators.businesses_with_missing_sites.map((b) => (
                        <li key={b.business_id} className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate">{b.business_name || '—'}</span>
                          <Badge variant="secondary" className="tech-content">{fmtNumber(b.drafts_missing_sites, locale)}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-[11px] text-muted-foreground">
              {t(
                'تحدّث البيانات كل ٦٠ ثانية. القيم النقدية تُعرض حسب العملة ولا تُجمع عبر العملات.',
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
