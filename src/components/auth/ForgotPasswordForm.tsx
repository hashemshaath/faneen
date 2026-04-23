import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, ArrowRight, CheckCircle, RefreshCw, Inbox, AlertTriangle } from 'lucide-react';
import { FieldError as FieldErrorDisplay } from './FieldError';
import { useFieldValidation } from '@/hooks/useFieldValidation';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const { errors, validateEmailField, clearError } = useFieldValidation(isRTL);

  const handleSubmit = async () => {
    if (!email || !validateEmailField(email)) {
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email);
      setSent(true);
      toast.success(isRTL ? 'تم إرسال رابط إعادة التعيين' : 'Reset link sent');
      // Start cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      // Don't reveal if email exists or not (security) — still show sent state
      setSent(true);
      toast.success(isRTL ? 'إذا كان الحساب موجوداً، سيتم إرسال رابط إعادة التعيين' : 'If an account exists, a reset link will be sent');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await authService.resetPassword(email);
      toast.success(isRTL ? 'تم إعادة إرسال الرابط' : 'Link resent');
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const lower = msg.toLowerCase();
      if (lower.includes('rate_limit') || lower.includes('too_many') || lower.includes('too many')) {
        toast.error(isRTL ? 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة' : 'Too many attempts, please wait and try again');
      } else if (lower.includes('network') || lower.includes('fetch')) {
        toast.error(isRTL ? 'خطأ في الاتصال، تحقق من الإنترنت' : 'Connection error, check your internet');
      } else {
        toast.error(isRTL ? 'فشل إعادة الإرسال، حاول مجدداً' : 'Failed to resend, please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-foreground">
            {isRTL ? 'تحقق من بريدك الإلكتروني' : 'Check Your Email'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isRTL
              ? <>أرسلنا رابط إعادة تعيين كلمة المرور إلى:<br /><strong className="text-foreground" dir="ltr">{email}</strong></>
              : <>We sent a password reset link to:<br /><strong className="text-foreground">{email}</strong></>
            }
          </p>
        </div>

        {/* Email status tips */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-start">
          <div className="flex items-start gap-2.5">
            <Inbox className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? 'قد يستغرق وصول الرسالة بضع دقائق. تحقق من صندوق الوارد.'
                : 'The email may take a few minutes. Check your inbox.'}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? 'لم تجدها؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam) أو البريد المهمل (Junk).'
                : "Can't find it? Check your Spam or Junk folder."}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? 'تأكد أن البريد الإلكتروني المُدخل صحيح. إذا لم تستلم الرسالة، يمكنك إعادة الإرسال.'
                : 'Make sure the email is correct. If not received, you can resend below.'}
            </p>
          </div>
        </div>

        {/* Resend button with cooldown */}
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || loading}
          className="w-full text-center text-sm text-accent hover:underline font-medium disabled:text-muted-foreground disabled:no-underline inline-flex items-center justify-center gap-1.5 py-2"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {resendCooldown > 0
            ? (isRTL ? `إعادة الإرسال بعد ${resendCooldown} ثانية` : `Resend in ${resendCooldown}s`)
            : (isRTL ? 'أعد الإرسال' : 'Resend')
          }
        </button>

        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <BackArrow className="w-4 h-4" />
          {t('auth.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.reset_password')}</h2>
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين' : 'Enter your email and we will send a reset link'}
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('auth.email')}</Label>
          <div className="relative">
            <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
              onBlur={() => email && validateEmailField(email)}
              dir="ltr"
              style={{ paddingInlineStart: '40px' }}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoComplete="email"
            />
          </div>
          <FieldErrorDisplay message={errors.email} />
        </div>
        <Button onClick={handleSubmit} disabled={loading || !!errors.email} className="w-full h-11" variant="hero">
          {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
          {loading ? t('common.loading') : t('auth.reset_password')}
        </Button>
      </div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <BackArrow className="w-4 h-4" />
        {t('auth.back')}
      </button>
    </div>
  );
};
