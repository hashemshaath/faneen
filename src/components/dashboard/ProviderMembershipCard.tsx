import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Star, Building2, ArrowUpRight, Calendar, FileText, Wrench, FolderOpen, MapPin, AlertTriangle, Info, Users, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseLimits } from '@/lib/membership-limits';
import { Progress } from '@/components/ui/progress';
import { tierColors } from '@/lib/membership-tiers';

const tierIconMap: Record<string, React.ElementType> = {
  free: Zap, basic: Star, premium: Crown, enterprise: Building2,
};

const tierLabel = (tier: string, isRTL: boolean): string => {
  const m: Record<string, [string, string]> = {
    free: ['مجاني', 'Free'],
    basic: ['أساسي', 'Basic'],
    premium: ['بريميوم', 'Premium'],
    enterprise: ['مؤسسات', 'Enterprise'],
  };
  const v = m[tier] || ['—', '—'];
  return isRTL ? v[0] : v[1];
};

interface Props {
  userId: string;
  businessId?: string | null;
  tier: string;
}

type UsageRow = {
  metric: string;
  used: number;
  limit_value: number;
  period: string;
  near_cap: boolean;
  over_limit: boolean;
};

export const ProviderMembershipCard: React.FC<Props> = ({ userId, businessId, tier }) => {
  const { isRTL } = useLanguage();

  const { data: subscription } = useQuery({
    queryKey: ['provider-active-subscription', userId, businessId ?? null],
    queryFn: async () => {
      const { data } = await supabase
        .from('membership_subscriptions')
        .select('id, status, billing_cycle, starts_at, expires_at, plan:membership_plans(id, tier, name_ar, name_en, limits)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const planTier = subscription?.plan?.tier || tier || 'free';
  const Icon = tierIconMap[planTier] || Zap;
  const colors = tierColors[planTier] || tierColors.free;
  const limitsRaw = (subscription?.plan?.limits as Record<string, unknown>) || undefined;
  const limits = parseLimits(limitsRaw as Record<string, number | boolean> | undefined);

  const daysLeft: number | null = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
    : null;
  const expiringSoon = daysLeft !== null && daysLeft <= 7;

  // Real usage from server (Phase M3A — read-only, no enforcement)
  const { data: usageRows } = useQuery({
    queryKey: ['membership-usage', userId, businessId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_membership_usage', {
        _business_id: businessId ?? undefined,
        _user_id: userId,
      });
      if (error) throw error;
      return (data ?? []) as UsageRow[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const usageMap = React.useMemo(() => {
    const m = new Map<string, UsageRow>();
    for (const r of usageRows ?? []) m.set(r.metric, r);
    return m;
  }, [usageRows]);
  const hasUsage = (usageRows?.length ?? 0) > 0;

  // Multi-business indicator (Phase M3B): inform provider that usage is
  // scoped to the currently selected business only.
  const { data: businessCount } = useQuery({
    queryKey: ['provider-business-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
  const hasMultipleBusinesses = (businessCount ?? 0) > 1;

  const fmtLimit = (v: number | boolean): string => {
    if (typeof v === 'boolean') return v ? '✓' : '—';
    return v === 0 ? (isRTL ? 'غير محدود' : 'Unlimited') : String(v);
  };

  type LimitRow = {
    icon: React.ElementType;
    label: string;
    metric: string;
    fallbackLimit: number;
  };
  const keyLimits: LimitRow[] = [
    { icon: FileText, label: isRTL ? 'العقود/الشهر' : 'Contracts/mo', metric: 'contracts', fallbackLimit: Number(limits.max_contracts) || 0 },
    { icon: Wrench, label: isRTL ? 'الخدمات' : 'Services', metric: 'services', fallbackLimit: Number(limits.max_services) || 0 },
    { icon: FolderOpen, label: isRTL ? 'المشاريع' : 'Portfolio', metric: 'portfolio', fallbackLimit: Number(limits.max_projects) || 0 },
    { icon: MapPin, label: isRTL ? 'الفروع' : 'Branches', metric: 'branches', fallbackLimit: Number(limits.max_branches) || 0 },
    { icon: Users, label: isRTL ? 'الفريق' : 'Staff', metric: 'staff', fallbackLimit: Number(limits.max_staff) || 0 },
  ];

  const isFreePlan = planTier === 'free' || !subscription;

  return (
    <Card className={cn('border', colors.border, colors.bg)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0', colors.badge)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {isRTL ? 'باقتك الحالية' : 'Your current plan'}
              </p>
              <h3 className={cn('font-heading font-bold text-base leading-tight', colors.text)}>
                {tierLabel(planTier, isRTL)}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {subscription && (
                  <Badge variant="outline" className="text-[8px] h-4 px-1.5 gap-0.5">
                    <Calendar className="w-2 h-2" />
                    {subscription.billing_cycle === 'yearly' ? (isRTL ? 'سنوي' : 'Yearly') : (isRTL ? 'شهري' : 'Monthly')}
                  </Badge>
                )}
                {daysLeft !== null && (
                  <Badge
                    className={cn(
                      'text-[8px] h-4 px-1.5 gap-0.5',
                      expiringSoon ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success',
                    )}
                  >
                    {expiringSoon && <AlertTriangle className="w-2 h-2" />}
                    {isRTL ? `${daysLeft} يوم متبقي` : `${daysLeft}d left`}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Link to="/membership" className="shrink-0">
            <Button size="sm" variant={isFreePlan ? 'default' : 'outline'} className="h-8 text-xs gap-1.5">
              {isFreePlan ? <Send className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
              {isFreePlan
                ? (isRTL ? 'طلب الترقية' : 'Request upgrade')
                : (isRTL ? 'إدارة الاشتراك' : 'Manage subscription')}
            </Button>
          </Link>
        </div>

        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/5 px-2.5 py-0.5 text-[10px] text-info">
          <Info className="w-2.5 h-2.5" />
          {isRTL
            ? 'نسخة تجريبية — يتم تفعيل الترقيات يدوياً حالياً'
            : 'Beta — upgrades are manually activated for now'}
        </div>

        {isFreePlan && (
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            {isRTL
              ? 'أنت حالياً على الباقة المجانية. يمكنك الترقية للاستفادة من مزايا إضافية.'
              : 'You are on the free plan. Upgrade to unlock more benefits.'}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {keyLimits.map((item) => {
            const row = usageMap.get(item.metric);
            const lim = row?.limit_value ?? item.fallbackLimit;
            const used = row?.used;
            const limitText = fmtLimit(lim);
            const showBar = typeof used === 'number' && lim > 0;
            const pct = showBar ? Math.min(100, Math.round((used / lim) * 100)) : 0;
            const nearCap = !!row?.near_cap;
            const overLimit = !!row?.over_limit;
            return (
              <div
                key={item.label}
                className={cn(
                  'flex flex-col gap-1 px-2.5 py-2 rounded-xl bg-background/60 border',
                  overLimit ? 'border-destructive/40' : nearCap ? 'border-warning/40' : 'border-border/20',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                    <item.icon className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] text-muted-foreground truncate">{item.label}</p>
                    <p
                      className={cn(
                        'text-[11px] font-bold leading-tight tech-content',
                        overLimit ? 'text-destructive' : nearCap ? 'text-warning' : colors.text,
                      )}
                    >
                      {typeof used === 'number'
                        ? `${used} / ${limitText}`
                        : limitText}
                    </p>
                  </div>
                </div>
                {showBar && (
                  <Progress
                    value={pct}
                    className={cn(
                      'h-1',
                      overLimit && '[&>div]:bg-destructive',
                      !overLimit && nearCap && '[&>div]:bg-warning',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground/80 flex items-center gap-1">
          <Info className="w-2.5 h-2.5" />
          {isRTL
            ? 'هذه مؤشرات استخدام فقط. لا يتم فرض الحدود تلقائيًا بعد.'
            : 'Usage indicators only. Limits are not enforced automatically yet.'}
        </p>
        {hasMultipleBusinesses && (
          <p className="mt-1 text-[10px] text-muted-foreground/80 flex items-center gap-1">
            <Building2 className="w-2.5 h-2.5" />
            {isRTL
              ? 'يتم عرض الاستخدام حسب المنشأة الحالية.'
              : 'Usage is shown for the currently selected business.'}
          </p>
        )}
        {hasUsage && (usageRows ?? []).some((r) => r.over_limit) && (
          <p className="mt-1 text-[10px] text-destructive flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            {isRTL
              ? 'تجاوزت الحد في بعض المؤشرات. يمكنك الترقية للحصول على حدود أعلى.'
              : 'You have exceeded limits on some metrics. Upgrade for higher limits.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderMembershipCard;