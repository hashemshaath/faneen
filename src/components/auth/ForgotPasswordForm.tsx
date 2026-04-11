import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateEmail } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const handleSubmit = async () => {
    if (!email || !validateEmail(email)) {
      toast.error(isRTL ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email);
      toast.success(t('auth.reset_sent'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }} />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="w-full h-11" variant="hero">
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
