import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { getMembershipUsage } from '@/modules/memberships';
import { formatQuotaLabel } from '@/lib/membership-limits';
import { getQuotaMetricLabel, type QuotaMetric } from '@/lib/quotaErrors';

type UsageRow = {
  metric: string;
  used: number;
  limit_value: number;
  period: string;
  near_cap: boolean;
  over_limit: boolean;
};

interface Props {
  userId: string | null | undefined;
  businessId: string | null | undefined;
  metric: QuotaMetric;
  className?: string;
  label?: string;
  upgradeHref?: string;
}

/**
 * M2 — Compact plan usage meter ("3 من 10 عقود" + thin progress bar).
 * Reads via ['membership-usage', userId, businessId] — dashboard-scoped
 * (denied by queryPersist allowlist because the key contains "membership").
 */
export const QuotaMeter: React.FC<Props> = ({
  userId,
  businessId,
  metric,
  className,
  label,
  upgradeHref = '/dashboard/membership',
}) => {
  const { isRTL } = useLanguage();

  const { data: rows } = useQuery({
    queryKey: ['membership-usage', userId ?? null, businessId ?? null],
    queryFn: async () => {
      const { data, error } = await getMembershipUsage<UsageRow>({
        _business_id: businessId ?? undefined,
        _user_id: userId ?? undefined,
      });
      if (error) return [] as UsageRow[];
      return (data ?? []) as UsageRow[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    retry: false,
  });

  const row = (rows ?? []).find((r) => r.metric === metric);
  if (!row) return null;

  const used = Number(row.used) || 0;
  const limit = Number(row.limit_value) || 0;
  const unlimited = limit === 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const over = !unlimited && used >= limit;
  const near = !over && !unlimited && used >= Math.ceil(limit * 0.8);

  const tone = over ? 'bg-destructive' : near ? 'bg-warning' : 'bg-primary/70';
  const textTone = over ? 'text-destructive' : near ? 'text-warning-foreground' : 'text-muted-foreground';

  const metricLabel = label ?? getQuotaMetricLabel(metric, isRTL);

  return (
    <div
      className={cn(
        'rounded-lg border bg-card/60 px-3 py-2 text-[11px] flex items-center gap-3 min-w-0',
        over && 'border-destructive/40',
        near && 'border-warning/40',
        className,
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <span className={cn('font-medium shrink-0', textTone)}>{metricLabel}</span>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-all', tone)}
            style={{ width: unlimited ? '100%' : `${pct}%` }}
          />
        </div>
      </div>
      <span className={cn('tabular-nums shrink-0', textTone)}>
        {formatQuotaLabel(used, limit, isRTL)}
      </span>
      {(near || over) && (
        <Link
          to={upgradeHref}
          className={cn(
            'shrink-0 underline underline-offset-2',
            over ? 'text-destructive' : 'text-warning-foreground',
          )}
        >
          {isRTL ? 'ترقية' : 'Upgrade'}
        </Link>
      )}
    </div>
  );
};

export default QuotaMeter;