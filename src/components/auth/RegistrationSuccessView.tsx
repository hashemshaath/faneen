import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Loader2, RefreshCw, Clock, History, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { CopyButton } from '@/components/ui/copy-button';

interface ActivityEvent {
  id: string;
  type: 'sent' | 'resend' | 'email_changed';
  timestamp: Date;
}

interface RegistrationSuccessViewProps {
  email: string;
  onBackToLogin: () => void;
}

export const RegistrationSuccessView: React.FC<RegistrationSuccessViewProps> = ({ email, onBackToLogin }) => {
  const { isRTL } = useLanguage();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([
    { id: 'initial', type: 'sent', timestamp: new Date() },
  ]);
  const prevEmailRef = useRef(email);

  const addActivity = useCallback((type: ActivityEvent['type']) => {
    setActivityLog(prev => [{
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      type,
      timestamp: new Date(),
    }, ...prev].slice(0, 20));
  }, []);

  // Reset cooldown and log when email changes
  useEffect(() => {
    if (prevEmailRef.current !== email) {
      prevEmailRef.current = email;
      setResendCooldown(0);
      addActivity('email_changed');
    }
  }, [email, addActivity]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      await authService.resendConfirmation(email);
      toast.success(isRTL ? 'تم إعادة إرسال رسالة التأكيد' : 'Confirmation email resent');
      addActivity('resend');
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error(isRTL ? 'فشل إعادة الإرسال، حاول لاحقاً' : 'Failed to resend, try later');
    } finally {
      setResending(false);
    }
  };

  const handleOpenEmail = () => {
    const domain = email.split('@')[1]?.toLowerCase();
    const providers: Record<string, string> = {
      'gmail.com': 'https://mail.google.com',
      'googlemail.com': 'https://mail.google.com',
      'outlook.com': 'https://outlook.live.com',
      'hotmail.com': 'https://outlook.live.com',
      'yahoo.com': 'https://mail.yahoo.com',
    };
    window.open(providers[domain] || `https://${domain}`, '_blank');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActivityLabel = (ev: ActivityEvent) => {
    switch (ev.type) {
      case 'sent':
        return isRTL ? 'تم إرسال رسالة التأكيد' : 'Confirmation email sent';
      case 'resend':
        return isRTL ? 'تم إعادة إرسال التأكيد' : 'Confirmation resent';
      case 'email_changed':
        return isRTL ? 'تم تعديل البريد الإلكتروني' : 'Email updated';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-8 text-center animate-fade-in">
      {/* Success icon */}
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative w-24 h-24 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-heading font-bold text-2xl text-foreground">
          {isRTL ? 'تم إنشاء حسابك بنجاح!' : 'Account created successfully!'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {isRTL
            ? <>أرسلنا رسالة تأكيد إلى <span className="inline-flex items-center gap-1"><strong className="text-foreground" dir="ltr">{email}</strong><CopyButton value={email} label="البريد الإلكتروني" size="xs" /></span> — تحقق من بريدك</>
            : <>We sent a confirmation email to <span className="inline-flex items-center gap-1"><strong className="text-foreground">{email}</strong><CopyButton value={email} label="Email" size="xs" /></span> — check your inbox</>
          }
        </p>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2.5 text-start max-w-xs mx-auto">
        <ShieldCheck className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isRTL
            ? 'يتم إرسال الرسالة بطريقة آمنة ولن يُكشف وجود الحساب من عدمه.'
            : 'The email is sent securely and account existence is never revealed.'}
        </p>
      </div>

      {/* Open email button */}
      <Button onClick={handleOpenEmail} className="w-full h-12 rounded-xl text-sm font-semibold gap-2" variant="hero">
        <Mail className="w-4 h-4" />
        {isRTL ? 'فتح البريد الإلكتروني' : 'Open Email'}
      </Button>

      {/* Resend link */}
      <div className="space-y-2">
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending}
          className="text-sm text-accent hover:underline font-medium disabled:text-muted-foreground disabled:no-underline inline-flex items-center gap-1.5"
        >
          {resending && <Loader2 className="w-3 h-3 animate-spin" />}
          {!resending && <RefreshCw className="w-3 h-3" />}
          {resendCooldown > 0
            ? (isRTL ? `إعادة الإرسال بعد ${resendCooldown} ثانية` : `Resend in ${resendCooldown}s`)
            : (isRTL ? 'لم تستلم الرسالة؟ أعد الإرسال' : "Didn't receive it? Resend")
          }
        </button>
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'تحقق أيضاً من مجلد الرسائل غير المرغوب فيها' : 'Also check your spam folder'}
        </p>
      </div>

      {/* Activity log */}
      {activityLog.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2 text-start max-w-xs mx-auto">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold text-muted-foreground">
              {isRTL ? 'سجل النشاط' : 'Activity Log'}
            </p>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {activityLog.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 text-[11px]">
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground font-mono tabular-nums">{formatTime(ev.timestamp)}</span>
                <span className="text-foreground">{getActivityLabel(ev)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back to login */}
      <div className="pt-2 border-t border-border/50">
        <button onClick={onBackToLogin} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
        </button>
      </div>
    </div>
  );
};
