import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Star, Building2, ArrowUpRight, Calendar, FileText, Wrench, FolderOpen, MapPin, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseLimits } from '@/lib/membership-limits';
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

  const fmtLimit = (v: number | boolean): string => {
    if (typeof v === 'boolean') return v ? '✓' : '—';
    return v === 0 ? (isRTL ? 'غير محدود' : 'Unlimited') : String(v);
  };

  const keyLimits: { icon: React.ElementType; label: string; value: string }[] = [
    { icon: FileText, label: isRTL ? 'العقود/الشهر' : 'Contracts/mo', value: fmtLimit(limits.max_contracts) },
    { icon: Wrench, label: isRTL ? 'الخدمات' : 'Services', value: fmtLimit(limits.max_services) },
    { icon: FolderOpen, label: isRTL ? 'مشاريع المعرض' : 'Portfolio', value: fmtLimit(limits.max_projects) },
    { icon: MapPin, label: isRTL ? 'الفروع' : 'Branches', value: fmtLimit(limits.max_branches) },
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
              <ArrowUpRight className="w-3 h-3" />
              {isFreePlan
                ? (isRTL ? 'ترقية الباقة' : 'Upgrade')
                : (isRTL ? 'إدارة الاشتراك' : 'Manage')}
            </Button>
          </Link>
        </div>

        {isFreePlan && (
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            {isRTL
              ? 'أنت حالياً على الباقة المجانية. يمكنك الترقية للاستفادة من مزايا إضافية.'
              : 'You are on the free plan. Upgrade to unlock more benefits.'}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {keyLimits.map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-background/60 border border-border/20">
              <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                <item.icon className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] text-muted-foreground truncate">{item.label}</p>
                <p className={cn('text-[11px] font-bold leading-tight', colors.text)}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderMembershipCard;