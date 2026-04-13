import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { PasswordField } from '@/components/auth/PasswordField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkPasswordStrength } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';

const ResetPassword = () => {
  const { t, isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password', noindex: true });
  const navigate = useNavigate();
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const strength = checkPasswordStrength(password);

  useEffect(() => {
    // Check both hash and query params for recovery token
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setIsRecovery(true);
    }
    // Also check if we have a valid session from recovery flow
    if (session && (hash.includes('access_token') || search.includes('access_token'))) {
      setIsRecovery(true);
    }
  }, [session]);

  const handleReset = async () => {
    if (strength.score < 2) {
      toast.error(isRTL ? 'كلمة المرور ضعيفة' : 'Password is too weak');
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error(isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await authService.updatePassword(password);
      toast.success(isRTL ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      // Sign out after password reset for security
      await authService.signOut();
      navigate('/auth?mode=login', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('same_password')) {
        toast.error(isRTL ? 'يرجى اختيار كلمة مرور مختلفة' : 'Please choose a different password');
      } else {
        toast.error(isRTL ? 'فشل في تغيير كلمة المرور' : 'Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{isRTL ? 'رابط غير صالح أو منتهي الصلاحية' : 'Invalid or expired link'}</p>
          <Button variant="outline" onClick={() => navigate('/auth?mode=login')}>
            {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Button>
        </div>
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
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.new_password')}</h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'اختر كلمة مرور قوية وفريدة' : 'Choose a strong, unique password'}
            </p>
          </div>

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
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">{isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'}</p>
              )}
            </div>

            <Button
              onClick={handleReset}
              disabled={loading || strength.score < 2 || password !== confirmPassword}
              className="w-full"
              variant="hero"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <ShieldCheck className="w-4 h-4 me-2" />}
              {loading ? t('common.loading') : t('auth.reset_password')}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3" />
            {isRTL ? 'سيتم تسجيل خروجك بعد التغيير لأسباب أمنية' : 'You will be signed out after changing for security'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
