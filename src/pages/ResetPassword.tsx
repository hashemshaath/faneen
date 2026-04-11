import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { PasswordField } from '@/components/auth/PasswordField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkPasswordStrength } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ResetPassword = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const strength = checkPasswordStrength(password);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
  }, []);

  const handleReset = async () => {
    if (strength.score < 2) {
      toast.error(isRTL ? 'كلمة المرور ضعيفة' : 'Password is too weak');
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authService.updatePassword(password);
      toast.success(t('common.success'));
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">{isRTL ? 'رابط غير صالح' : 'Invalid link'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
            <span className="font-heading font-black text-xl text-secondary-foreground">ف</span>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <h2 className="font-heading font-bold text-2xl text-foreground text-center">{t('auth.new_password')}</h2>

          <div className="space-y-4">
            <PasswordField
              password={password}
              onChange={setPassword}
              label={t('auth.new_password')}
              showStrength
              isRTL={isRTL}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword(!showPassword)}
            />

            <div className="space-y-2">
              <Label>{t('auth.password.confirm')}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <Button onClick={handleReset} disabled={loading} className="w-full" variant="hero">
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {loading ? t('common.loading') : t('auth.reset_password')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
