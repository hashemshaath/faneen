import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, Loader2, Ban, Zap, Undo2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tierIcons, tierGradients } from '@/lib/membership-tiers';

interface CurrentSubscriptionCardProps {
  isRTL: boolean;
  currentTier: string;
  mySubscription: any;
  daysRemaining: number | null;
  cancelMutation: { mutate: () => void; isPending: boolean };
}

export const CurrentSubscriptionCard = ({
  isRTL, currentTier, mySubscription, daysRemaining, cancelMutation,
}: CurrentSubscriptionCardProps) => {
  const Icon = tierIcons[currentTier] || Zap;
  const gradient = tierGradients[currentTier] || tierGradients.free;
  const [confirming, setConfirming] = useState(false);

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
                <Button
                  variant="outline" size="sm"
                  className="text-[10px] h-7 gap-1 text-destructive border-destructive/20 hover:bg-destructive/10"
                  onClick={() => setConfirming(true)}
                  disabled={cancelMutation.isPending}
                >
                  <Ban className="w-3 h-3" />
                  {isRTL ? 'إلغاء الاشتراك' : 'Cancel subscription'}
                </Button>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                <p className="text-[11px] text-foreground/80 leading-relaxed mb-2 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                  {isRTL
                    ? 'سيؤدي إلغاء الاشتراك إلى العودة للباقة المجانية.'
                    : 'Cancelling will return you to the Free plan.'}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="destructive"
                    className="text-[10px] h-7 gap-1"
                    onClick={() => { cancelMutation.mutate(); setConfirming(false); }}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {isRTL ? 'تأكيد الإلغاء' : 'Confirm cancel'}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
