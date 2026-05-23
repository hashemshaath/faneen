import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMembershipUsage } from '@/modules/memberships';
import { useLanguage } from '@/i18n/LanguageContext';
import { AlertTriangle, ArrowUpRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Phase M3B — Soft UI warning only.
 * Reads usage via get_membership_usage RPC and renders a banner when
 * the metric is near_cap (>=80%) or over_limit. NEVER blocks any action.
 * Fails silently if RPC errors or returns nothing.
 */

type UsageRow = {
  metric: string;
  used: number;
  limit_value: number;
  period: string;
  near_cap: boolean;
  over_limit: boolean;
};

export type UsageMetric =
  | 'contracts'
  | 'services'
  | 'portfolio'
  | 'branches'
  | 'staff'
  | 'promotions'
  | 'blog_posts';

interface Props {
  userId: string | null | undefined;
  businessId: string | null | undefined;
  metric: UsageMetric;
  className?: string;
  upgradeHref?: string;
}

const metricLabel = (m: UsageMetric, isRTL: boolean): string => {
  const map: Record<UsageMetric, [string, string]> = {
    contracts: ['العقود', 'Contracts'],
    services: ['الخدمات', 'Services'],
    portfolio: ['أعمال المعرض', 'Portfolio items'],
    branches: ['الفروع', 'Branches'],
    staff: ['الفريق', 'Staff'],
    promotions: ['العروض', 'Promotions'],
    blog_posts: ['المقالات', 'Blog posts'],
  };
  const [ar, en] = map[m];
  return isRTL ? ar : en;
};

export const MembershipUsageWarning: React.FC<Props> = ({
  userId,
  businessId,
  metric,
  className,
  upgradeHref = '/membership',
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
  if (!row.near_cap && !row.over_limit) return null;

  const limitText =
    row.limit_value === 0
      ? (isRTL ? 'غير محدود' : 'Unlimited')
      : String(row.limit_value);

  const label = metricLabel(metric, isRTL);
  const isOver = row.over_limit;

  return (
    <div
      role="status"
      className={cn(
        'rounded-xl border px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs',
        isOver
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-warning/40 bg-warning/5 text-warning-foreground',
        className,
      )}
    >
      {isOver ? (
        <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
      ) : (
        <Info className="w-4 h-4 shrink-0 text-warning" />
      )}
      <div className="flex-1 min-w-0 leading-relaxed">
        <p className="font-medium">
          {isOver
            ? (isRTL
                ? `تجاوزت الحد المتاح في باقتك الحالية (${label}: ${row.used}/${limitText}).`
                : `You exceeded your current plan limit (${label}: ${row.used}/${limitText}).`)
            : (isRTL
                ? `اقتربت من حد باقتك الحالية (${label}: ${row.used}/${limitText}).`
                : `You are approaching your plan limit (${label}: ${row.used}/${limitText}).`)}
        </p>
        <p className="text-[10.5px] opacity-80 mt-0.5">
          {isOver
            ? (isRTL
                ? 'لن يتم فرض المنع تلقائيًا حالياً، لكن يُنصح بالترقية للحصول على مساحة أكبر.'
                : 'No automatic blocking yet, but upgrading is recommended for more headroom.')
            : (isRTL
                ? 'يمكنك الترقية للحصول على مساحة أكبر.'
                : 'Upgrade for more headroom.')}
        </p>
      </div>
      <Link to={upgradeHref} className="shrink-0">
        <Button size="sm" variant={isOver ? 'destructive' : 'outline'} className="h-7 text-[11px] gap-1">
          <ArrowUpRight className="w-3 h-3" />
          {isRTL ? 'ترقية الباقة' : 'Upgrade plan'}
        </Button>
      </Link>
    </div>
  );
};

export default MembershipUsageWarning;