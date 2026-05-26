import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { listOwnerBusinesses, listManagedStaffMembershipForUser } from '@/modules/businesses';
import { getContractAnalyticsDashboard } from '@/modules/contracts';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BarChart3, FileText, CheckCircle2, Clock, XCircle, AlertTriangle,
  TrendingUp, MapPin, Layers, Wallet, Inbox, RefreshCcw, FileDown,
} from 'lucide-react';

type Period = '7d' | '30d' | '90d' | 'all';

interface CurrencyAmount { currency: string; amount: number }
interface CityCount { city: string; count: number }
interface CategoryCount { category: string; count: number }
interface MethodCount { method: string; count: number }
interface BoqGroup { group: string; count: number; total: number }

interface AnalyticsPayload {
  scope: string;
  business_id: string | null;
  period: { key: Period; from: string | null; to: string };
  summary: {
    total_contracts: number;
    draft: number;
    pending_approval: number;
    active: number;
    completed: number;
    cancelled: number;
    disputed: number;
    created_this_period: number;
    completed_this_period: number;
    total_value_by_currency: CurrencyAmount[];
    active_value_by_currency: CurrencyAmount[];
    average_value_by_currency: CurrencyAmount[];
  };
  actions: {
    drafts_missing_site: number;
    drafts_missing_pricing: number;
    pending_client_approval: number;
    pending_provider_approval: number;
  };
  lead_conversion: {
    eligible_leads: number;
    converted_leads: number;
    conversion_rate: number;
  };
  sites: {
    with_execution_site: number;
    missing_execution_site: number;
    top_cities: CityCount[];
  };
  templates: { by_template_category: CategoryCount[] };
  pricing: {
    by_pricing_method: MethodCount[];
    boq_group_distribution: BoqGroup[];
  };
  pdf: { exports_count: number; last_exported_at: string | null };
}

const PERIODS: { key: Period; ar: string; en: string }[] = [
  { key: '7d', ar: '٧ أيام', en: '7 days' },
  { key: '30d', ar: '٣٠ يوم', en: '30 days' },
  { key: '90d', ar: '٩٠ يوم', en: '90 days' },
  { key: 'all', ar: 'الكل', en: 'All time' },
];

const fmtNumber = (n: number, locale: string) =>
  new Intl.NumberFormat(locale).format(n ?? 0);

const fmtMoney = (amount: number, currency: string, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount ?? 0);
  } catch {
    return `${fmtNumber(amount ?? 0, locale)} ${currency}`;
  }
};

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'destructive';
}> = ({ label, value, icon: Icon, tone = 'default' }) => {
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

const DashboardContractAnalytics: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('30d');
  const [businessId, setBusinessId] = useState<string>('all');
  const locale = language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';

  // WORKSPACE-CONTEXT-4E: align the analytics scope selector with the
  // active workspace entity. We never widen access — the entity must
  // already exist in `managedBusinesses` (owned or staff-managed), and
  // the underlying RPC still enforces authorization.
  const { active_entity_id } = useActiveWorkspace();

  usePageMeta({
    title: language === 'ar' ? 'تحليلات العقود' : 'Contract Analytics',
    description:
      language === 'ar'
        ? 'نظرة عامة على أداء العقود والتحويلات ومواقع التنفيذ'
        : 'Overview of contract performance, conversions and execution sites',
  });
  useNoIndex();

  // Allowed businesses (owner or manager) — same pattern as DashboardLeads
  const { data: managedBusinesses } = useQuery({
    queryKey: ['my-managed-businesses', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [owned, staff] = await Promise.all([
        listOwnerBusinesses<{ id: string; name_ar: string | null; name_en: string | null }>({
          userId: user!.id,
          select: 'id, name_ar, name_en',
        }),
        listManagedStaffMembershipForUser({
          userId: user!.id,
          select: 'business_id, role, businesses:business_id(id, name_ar, name_en)',
        }),
      ]);
      const map = new Map<string, { id: string; name_ar: string | null; name_en: string | null }>();
      (owned.data ?? []).forEach((b) => map.set(b.id, b));
      (staff.data ?? []).forEach((s) => {
        const b = (s as unknown as { businesses?: { id: string; name_ar: string | null; name_en: string | null } }).businesses;
        if (b) map.set(b.id, b);
      });
      return Array.from(map.values());
    },
  });

  const businessOptions = managedBusinesses ?? [];
  const showSelector = businessOptions.length > 1;
  const effectiveBusinessId = businessId === 'all' ? null : businessId;

  useEffect(() => {
    if (!active_entity_id) return;
    if (!businessOptions.some((b) => b.id === active_entity_id)) return;
    setBusinessId((prev) => (prev === active_entity_id ? prev : active_entity_id));
  }, [active_entity_id, businessOptions]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<AnalyticsPayload>({
    queryKey: ['contract-analytics', user?.id ?? null, effectiveBusinessId, period],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: rpcData, error: rpcError } = await getContractAnalyticsDashboard(
        { _business_id: effectiveBusinessId ?? undefined, _period: period, _scope: 'provider' },
      );
      if (rpcError) throw rpcError;
      return rpcData as unknown as AnalyticsPayload;
    },
    retry: false,
  });

  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const bizName = (b: { name_ar: string | null; name_en: string | null }) =>
    (isRTL ? b.name_ar || b.name_en : b.name_en || b.name_ar) ?? '';
  const selectedScopeLabel =
    effectiveBusinessId === null
      ? t('كل المنشآت', 'All businesses')
      : bizName(businessOptions.find((b) => b.id === effectiveBusinessId) ?? { name_ar: null, name_en: null });

  const errMessage =
    error instanceof Error ? error.message : '';
  const isForbidden = errMessage.includes('FORBIDDEN');

  return (
    <DashboardLayout>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
              {t('تحليلات العقود', 'Contract Analytics')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                'نظرة عامة على أداء العقود والتحويلات ومواقع التنفيذ',
                'Overview of contract performance, conversions and execution sites',
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label={t('الفترة', 'Period')}>
            {showSelector && (
              <Select value={businessId} onValueChange={setBusinessId}>
                <SelectTrigger
                  className="h-9 w-[200px]"
                  aria-label={t('اختر المنشأة', 'Select business')}
                >
                  <SelectValue placeholder={t('كل المنشآت', 'All businesses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('كل المنشآت', 'All businesses')}</SelectItem>
                  {businessOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {bizName(b) || b.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label={t('تحديث', 'Refresh')}
              className="h-9"
            >
              <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Selected scope */}
        <div className="text-xs text-muted-foreground -mt-2">
          {t('النطاق:', 'Scope:')} <span className="font-medium text-foreground">{selectedScopeLabel}</span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-busy="true" role="status">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        )}

        {/* Error / Forbidden */}
        {isError && !isLoading && (
          <Card className="rounded-xl border-destructive/30">
            <CardContent className="p-6 text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" aria-hidden />
              <div className="font-semibold">
                {isForbidden
                  ? t('لا تتوفر تحليلات لحسابك', 'No analytics available for your account')
                  : t('تعذّر تحميل التحليلات', 'Failed to load analytics')}
              </div>
              <p className="text-sm text-muted-foreground">
                {isForbidden
                  ? t(
                      'تحتاج إلى ملف مزود/أعمال لعرض تحليلات العقود.',
                      'You need a provider/business profile to view contract analytics.',
                    )
                  : t('حاول التحديث بعد قليل.', 'Please try again shortly.')}
              </p>
            </CardContent>
          </Card>
        )}

        {data && !isLoading && !isError && (
          <>
            {/* Summary KPIs */}
            <section aria-label={t('ملخص الحالة', 'Status summary')}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label={t('إجمالي العقود', 'Total contracts')} value={fmtNumber(data.summary.total_contracts, locale)} icon={FileText} />
                <KpiCard label={t('مسودة', 'Draft')} value={fmtNumber(data.summary.draft, locale)} icon={FileText} tone="info" />
                <KpiCard label={t('قيد الموافقة', 'Pending approval')} value={fmtNumber(data.summary.pending_approval, locale)} icon={Clock} tone="warning" />
                <KpiCard label={t('نشط', 'Active')} value={fmtNumber(data.summary.active, locale)} icon={TrendingUp} tone="success" />
                <KpiCard label={t('مكتمل', 'Completed')} value={fmtNumber(data.summary.completed, locale)} icon={CheckCircle2} tone="success" />
                <KpiCard label={t('ملغي', 'Cancelled')} value={fmtNumber(data.summary.cancelled, locale)} icon={XCircle} tone="destructive" />
                <KpiCard label={t('منشأ في الفترة', 'Created in period')} value={fmtNumber(data.summary.created_this_period, locale)} icon={FileText} />
                <KpiCard label={t('مكتمل في الفترة', 'Completed in period')} value={fmtNumber(data.summary.completed_this_period, locale)} icon={CheckCircle2} />
              </div>
            </section>

            {/* Currency value cards */}
            <section aria-label={t('القيم حسب العملة', 'Values by currency')}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['total_value_by_currency','active_value_by_currency','average_value_by_currency'] as const).map((key) => {
                  const titles: Record<string, [string,string]> = {
                    total_value_by_currency: ['إجمالي القيمة', 'Total value'],
                    active_value_by_currency: ['قيمة العقود النشطة', 'Active value'],
                    average_value_by_currency: ['متوسط قيمة العقد', 'Average value'],
                  };
                  const arr = data.summary[key] || [];
                  return (
                    <Card key={key} className="rounded-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-primary" aria-hidden />
                          {t(titles[key][0], titles[key][1])}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {arr.length === 0 ? (
                          <div className="text-sm text-muted-foreground tech-content">
                            {fmtMoney(0, 'SAR', locale)}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {arr.map((c) => (
                              <div key={c.currency} className="px-3 py-2 rounded-lg bg-muted/40 border border-border">
                                <div className="text-xs text-muted-foreground">{c.currency}</div>
                                <div className="text-base font-semibold tech-content">
                                  {fmtMoney(Number(c.amount) || 0, c.currency, locale)}
                                </div>
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

            {/* Action required */}
            <section aria-label={t('إجراءات مطلوبة', 'Action required')}>
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                    {t('إجراءات مطلوبة', 'Action required')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-0">
                  <KpiCard label={t('مسودات بدون موقع', 'Drafts missing site')} value={fmtNumber(data.actions.drafts_missing_site, locale)} icon={MapPin} tone="warning" />
                  <KpiCard label={t('مسودات بدون تسعير', 'Drafts missing pricing')} value={fmtNumber(data.actions.drafts_missing_pricing, locale)} icon={Wallet} tone="warning" />
                  <KpiCard label={t('بانتظار العميل', 'Pending client')} value={fmtNumber(data.actions.pending_client_approval, locale)} icon={Clock} tone="info" />
                  <KpiCard label={t('بانتظار المزود', 'Pending provider')} value={fmtNumber(data.actions.pending_provider_approval, locale)} icon={Clock} tone="info" />
                </CardContent>
              </Card>
            </section>

            {/* Lead conversion + Site coverage */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-primary" aria-hidden />
                    {t('تحويل الطلبات إلى عقود', 'Lead conversion')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">{t('الطلبات', 'Leads')}</div>
                      <div className="text-xl font-semibold tech-content">{fmtNumber(data.lead_conversion.eligible_leads, locale)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('محوّلة', 'Converted')}</div>
                      <div className="text-xl font-semibold tech-content text-emerald-600 dark:text-emerald-400">
                        {fmtNumber(data.lead_conversion.converted_leads, locale)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('النسبة', 'Rate')}</div>
                      <div className="text-xl font-semibold tech-content">
                        {fmtNumber(data.lead_conversion.conversion_rate, locale)}%
                      </div>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={data.lead_conversion.conversion_rate} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(0, data.lead_conversion.conversion_rate))}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" aria-hidden />
                    {t('تغطية مواقع التنفيذ', 'Execution site coverage')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">{t('بموقع تنفيذ', 'With site')}</div>
                      <div className="text-xl font-semibold tech-content text-emerald-600 dark:text-emerald-400">
                        {fmtNumber(data.sites.with_execution_site, locale)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('بدون موقع', 'Missing site')}</div>
                      <div className="text-xl font-semibold tech-content text-amber-600 dark:text-amber-400">
                        {fmtNumber(data.sites.missing_execution_site, locale)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('أكثر المدن', 'Top cities')}</div>
                    {data.sites.top_cities.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {data.sites.top_cities.map((c, i) => (
                          <Badge key={`${c.city}-${i}`} variant="secondary" className="text-xs">
                            {c.city} · <span className="tech-content ms-1">{fmtNumber(c.count, locale)}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Templates + Pricing */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" aria-hidden />
                    {t('فئات القوالب', 'Template categories')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <DistributionList items={data.templates.by_template_category.map((c) => ({ label: c.category, count: c.count }))} locale={locale} emptyText={t('لا توجد بيانات', 'No data')} />
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" aria-hidden />
                    {t('طرق التسعير', 'Pricing methods')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <DistributionList items={data.pricing.by_pricing_method.map((m) => ({ label: m.method, count: m.count }))} locale={locale} emptyText={t('لا توجد بيانات', 'No data')} />
                </CardContent>
              </Card>
            </section>

            {/* BOQ groups */}
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" aria-hidden />
                  {t('توزيع مجموعات جدول الكميات', 'BOQ group distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.pricing.boq_group_distribution.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="text-start">
                          <th className="text-start py-2">{t('المجموعة', 'Group')}</th>
                          <th className="text-end py-2">{t('عدد البنود', 'Items')}</th>
                          <th className="text-end py-2">{t('الإجمالي', 'Total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.pricing.boq_group_distribution.map((g, i) => (
                          <tr key={`${g.group}-${i}`} className="border-t border-border">
                            <td className="py-2">{g.group}</td>
                            <td className="py-2 text-end tech-content">{fmtNumber(g.count, locale)}</td>
                            <td className="py-2 text-end tech-content">{fmtNumber(Number(g.total) || 0, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PDF activity */}
            <section aria-label={t('نشاط تصدير PDF', 'PDF export activity')}>
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileDown className="h-4 w-4 text-primary" aria-hidden />
                    {t('تصدير ملفات PDF', 'PDF exports')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{t('عدد التصديرات في الفترة', 'Exports in period')}</div>
                    <div className="text-xl font-semibold tech-content">{fmtNumber(data.pdf.exports_count, locale)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('آخر تصدير', 'Last exported')}</div>
                    <div className="text-sm font-medium tech-content">
                      {data.pdf.last_exported_at
                        ? new Date(data.pdf.last_exported_at).toLocaleString(locale)
                        : t('لا يوجد', 'None')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

const DistributionList: React.FC<{
  items: { label: string; count: number }[];
  locale: string;
  emptyText: string;
}> = ({ items, locale, emptyText }) => {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.map((it, idx) => (
        <li key={`${it.label}-${idx}`}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="truncate">{it.label}</span>
            <span className="tech-content text-muted-foreground ms-2">{fmtNumber(it.count, locale)}</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${(it.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

export default DashboardContractAnalytics;