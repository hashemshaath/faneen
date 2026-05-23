import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { listLeadAnalyticsForBusiness } from '@/modules/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, GitBranch, TrendingUp, Info, AlertTriangle, RefreshCcw, FileSignature, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { eachDayOfInterval, eachMonthOfInterval, format, subDays, subMonths } from 'date-fns';

type Period = '7d' | '30d' | '90d' | '12m';

interface Props {
  businessId: string | undefined;
  period: Period;
}

const tooltipStyle = {
  borderRadius: 12, fontSize: 11,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
};

/**
 * Lead activity panel for /dashboard/analytics (P5.1).
 * Strictly avoids PII: selects only status + timestamps + converted_contract_id.
 * Never reads name/phone/email/message body.
 */
export const ProviderLeadAnalytics: React.FC<Props> = ({ businessId, period }) => {
  const { isRTL } = useLanguage();

  const range = useMemo(() => {
    const end = new Date();
    let start: Date;
    switch (period) {
      case '7d': start = subDays(end, 7); break;
      case '30d': start = subDays(end, 30); break;
      case '90d': start = subDays(end, 90); break;
      case '12m': start = subMonths(end, 12); break;
    }
    return { start, end };
  }, [period]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['provider-lead-analytics', businessId, period],
    enabled: !!businessId,
    staleTime: 60000,
    queryFn: async () => {
      try {
        return await listLeadAnalyticsForBusiness(businessId!, range.start.toISOString());
      } catch {
        throw new Error('lead_analytics_fetch_failed');
      }
    },
  });

  const trend = useMemo(() => {
    if (!data) return [];
    if (period === '12m') {
      const months = eachMonthOfInterval({ start: range.start, end: range.end });
      return months.map((m) => {
        const key = format(m, 'yyyy-MM');
        return {
          date: format(m, isRTL ? 'MMM' : 'MMM yy'),
          count: data.filter((l) => l.created_at.startsWith(key)).length,
        };
      });
    }
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    const grouped = new Map<string, number>();
    days.forEach((d) => grouped.set(format(d, 'yyyy-MM-dd'), 0));
    data.forEach((l) => {
      const k = l.created_at.split('T')[0];
      if (grouped.has(k)) grouped.set(k, (grouped.get(k) ?? 0) + 1);
    });
    return Array.from(grouped.entries()).map(([d, c]) => ({
      date: period === '7d' ? format(new Date(d), 'EEE') : format(new Date(d), 'dd/MM'),
      count: c,
    }));
  }, [data, range, period, isRTL]);

  const funnel = useMemo(() => {
    if (!data) return [];
    const total = data.length;
    const viewed = data.filter((l) => !!l.viewed_at).length;
    const quoted = data.filter((l) => !!l.quoted_at).length;
    const accepted = data.filter((l) => !!l.accepted_at || l.status === 'accepted' || l.status === 'won').length;
    const rejected = data.filter((l) => !!l.rejected_at || ['rejected', 'lost', 'closed'].includes(l.status)).length;
    return [
      { label: isRTL ? 'جديد' : 'New', value: total },
      { label: isRTL ? 'تم العرض' : 'Viewed', value: viewed },
      { label: isRTL ? 'تم التسعير' : 'Quoted', value: quoted },
      { label: isRTL ? 'مقبول' : 'Accepted', value: accepted },
      { label: isRTL ? 'مرفوض/مغلق' : 'Rejected/Closed', value: rejected },
    ];
  }, [data, isRTL]);

  const conversion = useMemo(() => {
    if (!data || data.length === 0) return { converted: 0, total: 0, rate: 0, acceptedNotConverted: 0 };
    const converted = data.filter((l) => !!l.converted_contract_id).length;
    const acceptedNotConverted = data.filter(
      (l) => !l.converted_contract_id && (!!l.accepted_at || l.status === 'accepted' || l.status === 'won')
    ).length;
    return {
      converted,
      total: data.length,
      rate: Math.round((converted / data.length) * 100),
      acceptedNotConverted,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[260px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isRTL ? 'تعذّر تحميل تحليلات الطلبات حالياً.' : 'Unable to load lead analytics right now.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isRTL ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total = data?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Inbox, label: isRTL ? 'إجمالي الطلبات' : 'Total leads', value: total, color: 'bg-info/10 text-info' },
          { icon: GitBranch, label: isRTL ? 'تم التسعير' : 'Quoted', value: funnel[2]?.value ?? 0, color: 'bg-accent/10 text-accent' },
          { icon: TrendingUp, label: isRTL ? 'محول لعقد' : 'Converted', value: conversion.converted, color: 'bg-success/10 text-success' },
          { icon: TrendingUp, label: isRTL ? 'نسبة التحويل' : 'Conversion', value: `${conversion.rate}%`, color: 'bg-primary/10 text-primary' },
        ].map((s, i) => (
          <Card key={i} className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-lg sm:text-xl font-bold leading-none tech-content">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI explanation */}
      <TooltipProvider delayDuration={150}>
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="shrink-0 mt-0.5" aria-label={isRTL ? 'كيف يتم الحساب' : 'How metrics are calculated'}>
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
              {isRTL ? (
                <ul className="space-y-1 list-disc ps-4">
                  <li>إجمالي الطلبات = جميع طلبات العملاء خلال الفترة.</li>
                  <li>تم التسعير = الطلبات التي تم تسعيرها.</li>
                  <li>محول لعقد = الطلبات المرتبطة بعقد.</li>
                  <li>نسبة التحويل = المحولة ÷ الإجمالي.</li>
                </ul>
              ) : (
                <ul className="space-y-1 list-disc ps-4">
                  <li>Total leads = all lead requests in the selected period.</li>
                  <li>Quoted = leads with a quote sent.</li>
                  <li>Converted = leads linked to a contract.</li>
                  <li>Conversion rate = converted ÷ total.</li>
                </ul>
              )}
            </TooltipContent>
          </Tooltip>
          <p className="leading-relaxed">
            {isRTL
              ? 'يتم حساب المؤشرات من طلبات العملاء خلال الفترة المحددة. التحويل يعني أن الطلب تم ربطه بعقد.'
              : 'Metrics are calculated from lead requests in the selected period. A conversion means the lead was linked to a contract.'}
          </p>
        </div>
      </TooltipProvider>

      {total === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {isRTL
              ? 'لا توجد طلبات حتى الآن. أكمل ملفك وأضف خدماتك لزيادة فرص استقبال الطلبات.'
              : 'No leads yet. Complete your profile and add services to receive more requests.'}
          </CardContent>
        </Card>
      ) : (
        <>
        {/* Converted split */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                <FileSignature className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none tech-content">{conversion.converted}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'محول إلى عقد' : 'Converted to contract'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none tech-content">{conversion.acceptedNotConverted}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'مقبول ولم يتحول لعقد' : 'Accepted, not converted'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lead trend */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading flex items-center gap-2">
                <Inbox className="w-4 h-4 text-info" />
                {isRTL ? 'الطلبات عبر الفترة' : 'Leads over time'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <RTooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--info))" fill="url(#leadGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Funnel */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-accent" />
                {isRTL ? 'مسار حالة الطلبات' : 'Lead status funnel'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={90} />
                    <RTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        </>
      )}
    </div>
  );
};

export default ProviderLeadAnalytics;