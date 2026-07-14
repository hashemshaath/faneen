import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, Loader2, Ban, Zap, Undo2, Check, RotateCcw, CalendarClock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tierIcons, tierGradients } from '@/lib/membership-tiers';

const TIER_ORDER = ['free', 'basic', 'premium', 'enterprise'] as const;

export interface DowngradePlanOption { id: string; tier: string; name_ar: string; name_en: string }

interface CurrentSubscriptionCardProps {
  isRTL: boolean;
  currentTier: string;
  mySubscription: any;
  daysRemaining: number | null;
  cancelMutation: { mutate: (planId: string | null) => void; isPending: boolean };
  resumeMutation?: { mutate: () => void; isPending: boolean };
  downgradeOptions?: DowngradePlanOption[];
}

export const CurrentSubscriptionCard = ({
  isRTL, currentTier, mySubscription, daysRemaining, cancelMutation, resumeMutation, downgradeOptions = [],
}: CurrentSubscriptionCardProps) => {
  const Icon = tierIcons[currentTier] || Zap;
  const gradient = tierGradients[currentTier] || tierGradients.free;
  const [confirming, setConfirming] = useState(false);
  const [targetPlanId, setTargetPlanId] = useState<string>('free');
  const autoRenew = (mySubscription as { auto_renew?: boolean })?.auto_renew !== false;
  const expiresAt = (mySubscription as { expires_at?: string | null })?.expires_at ?? null;
  const expiresLabel = expiresAt ? new Date(expiresAt).toLocaleDateString() : '';
  const downgradePlanId = (mySubscription as { downgrade_to_plan_id?: string | null })?.downgrade_to_plan_id ?? null;
  const downgradeTier = (mySubscription as { downgrade_to_tier?: string | null })?.downgrade_to_tier ?? null;
  const downgradePlanName = downgradePlanId ? downgradeOptions.find((p) => p.id === downgradePlanId) : null;
  const currentIdx = TIER_ORDER.indexOf(currentTier as typeof TIER_ORDER[number]);
  const lowerPlans = downgradeOptions.filter(
    (p) => p.tier !== 'free' && TIER_ORDER.indexOf(p.tier as typeof TIER_ORDER[number]) >= 0 && TIER_ORDER.indexOf(p.tier as typeof TIER_ORDER[number]) < currentIdx,
  );

  return (
    <Card className="max-w-2xl mx-auto mb-8 border-accent/20 bg-accent/5">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', gradient)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-bold text-sm">{isRTL ? 'اشتراكك الحالي' : 'Current Subscription'}</h3>
              <Badge className="bg-success/10 text-success text-[8px] px-1.5 py-0 h-3.5">{isRTL ? 'نشط' : 'Active'}</Badge>
              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-3.5">
                {isRTL ? (mySubscription.plan as any)?.name_ar : (mySubscription.plan as any)?.name_en}
              </Badge>
            </div>

            {daysRemaining !== null && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isRTL ? `متبقي ${daysRemaining} يوم` : `${daysRemaining} days remaining`}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(mySubscription.expires_at!).toLocaleDateString()}
                  </span>
                </div>
                <Progress value={daysRemaining <= 0 ? 100 : Math.max(5, 100 - (daysRemaining / (mySubscription.billing_cycle === 'yearly' ? 365 : 30)) * 100)} className="h-1.5" />
                {daysRemaining <= 7 && (
                  <p className="text-[10px] text-warning flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    {isRTL ? 'اشتراكك ينتهي قريباً! جدد الآن' : 'Subscription expiring soon! Renew now'}
                  </p>
                )}
              </div>
            )}

            {!confirming ? (
              <div className="flex gap-2 mt-3">
                {autoRenew ? (
                  <Button
                    variant="outline" size="sm"
                    className="text-[10px] h-7 gap-1 text-destructive border-destructive/20 hover:bg-destructive/10"
                    onClick={() => setConfirming(true)}
                    disabled={cancelMutation.isPending}
                  >
                    <Ban className="w-3 h-3" />
                    {isRTL ? 'إيقاف تذكير التجديد' : 'Turn off renewal reminders'}
                  </Button>
                ) : resumeMutation ? (
                  <Button
                    variant="outline" size="sm"
                    className="text-[10px] h-7 gap-1 text-success border-success/30 hover:bg-success/10"
                    onClick={() => resumeMutation.mutate()}
                    disabled={resumeMutation.isPending}
                  >
                    {resumeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    {isRTL ? 'استئناف التذكير' : 'Resume reminders'}
                  </Button>
                ) : null}
                {autoRenew && (
                  <p className="text-[10px] text-muted-foreground flex items-start gap-1 leading-relaxed max-w-xs">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    {isRTL
                      ? 'التجديد بالتذكير — سنذكرك قبل الانتهاء وخلال فترة السماح 7 أيام. الخصم التلقائي بالبطاقة غير متاح حاليًا.'
                      : 'Reminder-based renewal — we notify you before expiry and during the 7-day grace period. Automatic card charging is not enabled yet.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                <p className="text-[11px] text-foreground/80 leading-relaxed mb-2 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                  {isRTL
                    ? `سيتم إيقاف التجديد التلقائي. تحتفظ بكامل مميزات الباقة حتى ${expiresLabel || 'انتهاء الفترة الحالية'}، ثم تنتقل للباقة المختارة أدناه.`
                    : `Auto-renewal will be turned off. You keep all plan benefits until ${expiresLabel || 'the end of the current period'}, then move to the plan selected below.`}
                </p>
                <div className="mb-2">
                  <label className="block text-[10px] font-medium text-foreground/80 mb-1">
                    {isRTL ? 'الباقة بعد انتهاء الفترة' : 'Plan after period ends'}
                  </label>
                  <select
                    className="w-full h-8 rounded-lg border border-border bg-background px-2 text-[11px]"
                    value={targetPlanId}
                    onChange={(e) => setTargetPlanId(e.target.value)}
                    disabled={cancelMutation.isPending}
                  >
                    <option value="free">{isRTL ? 'الباقة المجانية' : 'Free plan'}</option>
                    {lowerPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {isRTL ? p.name_ar : p.name_en} ({p.tier})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="destructive"
                    className="text-[10px] h-7 gap-1"
                    onClick={() => { cancelMutation.mutate(targetPlanId === 'free' ? null : targetPlanId); setConfirming(false); }}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {isRTL ? 'تأكيد إيقاف التجديد' : 'Confirm cancel renewal'}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="text-[10px] h-7 gap-1"
                    onClick={() => setConfirming(false)}
                    disabled={cancelMutation.isPending}
                  >
                    <Undo2 className="w-3 h-3" />
                    {isRTL ? 'تراجع' : 'Go back'}
                  </Button>
                </div>
              </div>
            )}
            {!autoRenew && (
              <div className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5">
                <div className="flex items-start gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">
                      {isRTL ? 'التجديد التلقائي موقوف' : 'Auto-renewal is off'}
                    </p>
                    <p className="text-[10px] text-foreground/80 leading-relaxed mt-0.5">
                      {isRTL ? 'الانتقال في:' : 'Switching on:'}{' '}
                      <span className="tech-content font-mono font-semibold text-foreground">{expiresLabel || '—'}</span>
                      {' → '}
                      <span className="font-semibold text-foreground">
                        {downgradePlanName
                          ? (isRTL ? downgradePlanName.name_ar : downgradePlanName.name_en)
                          : (isRTL ? `الباقة ${downgradeTier || 'المجانية'}` : `${downgradeTier || 'free'} plan`)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
