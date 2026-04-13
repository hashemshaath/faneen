import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface RegistrationSuccessViewProps {
  email: string;
  onBackToLogin: () => void;
}

export const RegistrationSuccessView: React.FC<RegistrationSuccessViewProps> = ({ email, onBackToLogin }) => {
  const { isRTL } = useLanguage();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      await authService.resendConfirmation(email);
      toast.success(isRTL ? 'تم إعادة إرسال رسالة التأكيد' : 'Confirmation email resent');
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
            ? <>أرسلنا رسالة تأكيد إلى <strong className="text-foreground" dir="ltr">{email}</strong> — تحقق من بريدك</>
            : <>We sent a confirmation email to <strong className="text-foreground">{email}</strong> — check your inbox</>
          }
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

      {/* Back to login */}
      <div className="pt-2 border-t border-border/50">
        <button onClick={onBackToLogin} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
        </button>
      </div>
    </div>
  );
};
