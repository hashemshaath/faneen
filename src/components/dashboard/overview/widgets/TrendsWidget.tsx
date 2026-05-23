import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listNotificationCreatedAtSeries } from '@/modules/notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ChartTooltipStyle } from '../shared';
import { cn } from '@/lib/utils';

interface DayBucket { day: string; count: number }

function bucketizeByDay(items: { created_at: string }[], days: number): DayBucket[] {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  items.forEach((it) => {
    const key = new Date(it.created_at).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([day, count]) => ({ day, count }));
}

function deltaPct(thisWk: number, lastWk: number): number {
  if (lastWk === 0) return thisWk > 0 ? 100 : 0;
  return Math.round(((thisWk - lastWk) / lastWk) * 100);
}

/**
 * 14-day rolling sparkline + week-over-week comparisons for the user's
 * core engagement signals (notifications + contracts).
 */
export const TrendsWidget = React.memo(function TrendsWidget({
  isRTL, userId,
}: { isRTL: boolean; userId: string }) {
  const { data } = useQuery({
    queryKey: ['dashboard-trends', userId],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const [notifs, contracts] = await Promise.all([
        listNotificationCreatedAtSeries({ userId, sinceIso: since, limit: 500 }),
        supabase.from('contracts').select('created_at').or(`client_id.eq.${userId},provider_id.eq.${userId}`).gte('created_at', since).limit(500),
      ]);
      return {
        notifications: bucketizeByDay(notifs.data || [], 14),
        contracts: bucketizeByDay(contracts.data || [], 14),
      };
    },
    enabled: !!userId,
    staleTime: 120000,
  });

  const series = useMemo(() => {
    const notifs = data?.notifications ?? [];
    const contracts = data?.contracts ?? [];
    const merged = notifs.map((n, i) => ({
      day: n.day.slice(5),
      notifications: n.count,
      contracts: contracts[i]?.count ?? 0,
    }));
    const half = Math.floor(merged.length / 2);
    const sum = (key: 'notifications' | 'contracts', from: number, to: number) =>
      merged.slice(from, to).reduce((s, r) => s + r[key], 0);
    return {
      merged,
      notifThis: sum('notifications', half, merged.length),
      notifLast: sum('notifications', 0, half),
      contractThis: sum('contracts', half, merged.length),
      contractLast: sum('contracts', 0, half),
    };
  }, [data]);

  const renderDelta = (label: string, thisWk: number, lastWk: number) => {
    const pct = deltaPct(thisWk, lastWk);
    const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
    const tone = pct > 0 ? 'text-success' : pct < 0 ? 'text-destructive' : 'text-muted-foreground';
    return (
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-muted-foreground truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold tech-content">{thisWk}</span>
          <span className={cn('text-[10px] flex items-center gap-0.5 tech-content', tone)}>
            <Icon className="w-3 h-3" aria-hidden="true" />{pct > 0 ? '+' : ''}{pct}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-1 px-4 pt-3">
        <CardTitle className="text-xs flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          {isRTL ? 'اتجاهات آخر 14 يومًا' : 'Last 14 Days'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-3 mb-2">
          {renderDelta(isRTL ? 'إشعارات (أسبوع)' : 'Alerts (week)', series.notifThis, series.notifLast)}
          {renderDelta(isRTL ? 'عقود (أسبوع)' : 'Contracts (week)', series.contractThis, series.contractLast)}
        </div>
        <div className="h-[80px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.merged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="day" hide />
              <Tooltip contentStyle={ChartTooltipStyle} cursor={{ stroke: 'hsl(var(--border))' }} />
              <Line type="monotone" dataKey="notifications" stroke="hsl(var(--accent))" strokeWidth={1.75} dot={false} />
              <Line type="monotone" dataKey="contracts"     stroke="hsl(var(--primary))" strokeWidth={1.75} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});