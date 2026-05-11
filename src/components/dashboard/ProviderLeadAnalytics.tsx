import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, GitBranch, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

  const { data, isLoading } = useQuery({
    queryKey: ['provider-lead-analytics', businessId, period],
    enabled: !!businessId,
    staleTime: 60000,
    queryFn: async () => {
      const { data: leads } = await supabase
        .from('lead_requests')
        .select('id, status, created_at, viewed_at, quoted_at, accepted_at, rejected_at, closed_at, converted_contract_id, converted_at')
        .eq('business_id', businessId!)
        .gte('created_at', range.start.toISOString());
      return leads ?? [];
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
    if (!data || data.length === 0) return { converted: 0, total: 0, rate: 0 };
    const converted = data.filter((l) => !!l.converted_contract_id).length;
    return { converted, total: data.length, rate: Math.round((converted / data.length) * 100) };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[260px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
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

      {total === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {isRTL
              ? 'لا توجد طلبات حتى الآن. أكمل ملفك وأضف خدماتك لزيادة فرص استقبال الطلبات.'
              : 'No leads yet. Complete your profile and add services to receive more requests.'}
          </CardContent>
        </Card>
      ) : (
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
                    <Tooltip contentStyle={tooltipStyle} />
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
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProviderLeadAnalytics;