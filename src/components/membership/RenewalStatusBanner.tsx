import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  isRTL: boolean;
  status: string;
  graceUntil: string | null;
  expiresAt: string | null;
  onRenew?: () => void;
  isRenewing?: boolean;
}

export const RenewalStatusBanner: React.FC<Props> = ({ isRTL, status, graceUntil, expiresAt, onRenew, isRenewing }) => {
  if (status !== 'past_due' && !graceUntil) return null;
  const graceDays = graceUntil
    ? Math.max(0, Math.ceil((new Date(graceUntil).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive mb-1">
            {isRTL ? 'انتهى اشتراكك — فترة سماح للتجديد اليدوي' : 'Subscription expired — manual renewal grace period'}
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed mb-2">
            {isRTL
              ? `التجديد التلقائي بالخصم غير متاح حاليًا. لديك ${graceDays} يوم/أيام لتجديد اشتراكك يدويًا قبل تحويل الحساب للباقة المجانية.`
              : `Automatic card charging is not available yet. You have ${graceDays} day(s) to renew manually before your account moves to Free.`}
          </p>
          {onRenew && (
            <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={onRenew} disabled={isRenewing}>
              {isRenewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isRTL ? 'تجديد الآن' : 'Renew now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
