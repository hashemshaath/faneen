import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
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
    } catch (err: any) {
      // Don't reveal if email exists or not (security)
      setSent(true);
      toast.success(isRTL ? 'إذا كان الحساب موجوداً، سيتم إرسال رابط إعادة التعيين' : 'If an account exists, a reset link will be sent');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-foreground">
            {isRTL ? 'تم الإرسال' : 'Email Sent'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? `إذا كان الحساب مرتبطاً بـ ${email}، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور`
              : `If an account is associated with ${email}, you'll receive a password reset link`
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها' : "Didn't receive it? Check your spam folder"}
          </p>
        </div>
        <Button onClick={() => { setSent(false); setEmail(''); }} variant="outline" className="w-full">
          {isRTL ? 'إعادة المحاولة' : 'Try again'}
        </Button>
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
