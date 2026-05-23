import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { createPasswordResetLog } from '@/modules/identity';
import { PasswordField } from '@/components/auth/PasswordField';
import { PasswordResetSuccessView } from '@/components/auth/PasswordResetSuccessView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkPasswordStrength } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, AlertTriangle, Clock, KeyRound, RefreshCw, LogIn, XCircle } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/common/BrandLogo';

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
  const [resetSuccess, setResetSuccess] = useState(false);
  const [linkStatus, setLinkStatus] = useState<'checking' | 'valid' | 'expired' | 'invalid'>('checking');
  const [resetError, setResetError] = useState<string | null>(null);

  const strength = checkPasswordStrength(password);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const isRecoveryLink = hash.includes('type=recovery') || search.includes('type=recovery');
    const hasToken = hash.includes('access_token') || search.includes('access_token');
    const hasError = hash.includes('error') || search.includes('error');
    const errorDesc = new URLSearchParams(search).get('error_description')
      || new URLSearchParams(hash.replace('#', '')).get('error_description') || '';

    if (hasError) {
      setIsRecovery(false);
      if (errorDesc.toLowerCase().includes('expired') || errorDesc.toLowerCase().includes('otp_expired')) {
        setLinkStatus('expired');
      } else {
        setLinkStatus('invalid');
      }
    } else if (isRecoveryLink || (session && hasToken)) {
      setIsRecovery(true);
      setLinkStatus('valid');
    } else if (session) {
      // User is logged in but no recovery params — maybe direct navigation
      setLinkStatus('invalid');
    } else {
      setLinkStatus('invalid');
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
      // Log successful reset
      try {
        await createPasswordResetLog({
          user_id: session?.user?.id || null,
          email: session?.user?.email || '',
          status: 'completed',
          user_agent: navigator.userAgent?.substring(0, 200) || null,
        });
      } catch { /* silent */ }
      await authService.signOut();
      setResetSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      // Log failed reset
      try {
        await createPasswordResetLog({
          user_id: session?.user?.id || null,
          email: session?.user?.email || '',
          status: 'failed',
          user_agent: navigator.userAgent?.substring(0, 200) || null,
        });
      } catch { /* silent */ }
      const lower = msg.toLowerCase();
      if (lower.includes('same_password') || lower.includes('same password')) {
        setResetError(isRTL ? 'لا يمكن استخدام نفس كلمة المرور الحالية. اختر كلمة مرور جديدة.' : 'Cannot reuse your current password. Choose a new one.');
      } else if (lower.includes('expired') || lower.includes('invalid') || lower.includes('session_not_found')) {
        setLinkStatus('expired');
        setIsRecovery(false);
      } else if (lower.includes('weak') || lower.includes('password_too_short')) {
        setResetError(isRTL ? 'كلمة المرور ضعيفة جداً. استخدم أحرف كبيرة وصغيرة وأرقام ورموز.' : 'Password is too weak. Use uppercase, lowercase, numbers, and symbols.');
      } else if (lower.includes('network') || lower.includes('fetch')) {
        setResetError(isRTL ? 'خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت وأعد المحاولة.' : 'Connection error. Check your internet and try again.');
      } else {
        setResetError(isRTL ? 'فشل في تغيير كلمة المرور. يرجى المحاولة مرة أخرى.' : 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (resetSuccess) {
    return <PasswordResetSuccessView />;
  }

  // Checking state
  if (linkStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Expired link
  if (linkStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning dark:bg-warning/20 flex items-center justify-center">
            <Clock className="w-8 h-8 text-warning dark:text-warning" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'انتهت صلاحية الرابط' : 'Link Expired'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'رابط إعادة تعيين كلمة المرور لم يعد صالحاً. روابط التعيين تنتهي بعد فترة قصيرة لأسباب أمنية.'
                : 'This password reset link is no longer valid. Reset links expire after a short period for security.'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-start">
            <p className="text-xs font-medium text-foreground">{isRTL ? 'ماذا يمكنك فعله؟' : 'What can you do?'}</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc ps-4">
              <li>{isRTL ? 'اطلب رابط إعادة تعيين جديد من صفحة "نسيت كلمة المرور"' : 'Request a new reset link from "Forgot Password"'}</li>
              <li>{isRTL ? 'استخدم الرابط فور وصوله — لا تنتظر طويلاً' : 'Use the link as soon as it arrives — don\'t wait too long'}</li>
              <li>{isRTL ? 'تأكد من استخدام أحدث رابط إذا طلبت عدة روابط' : 'Make sure to use the latest link if you requested multiple'}</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="hero" className="w-full gap-2" onClick={() => navigate('/auth?mode=forgot')}>
              <RefreshCw className="w-4 h-4" />
              {isRTL ? 'طلب رابط جديد' : 'Request New Link'}
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/auth?mode=login')}>
              <LogIn className="w-4 h-4" />
              {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Invalid link
  if (linkStatus === 'invalid' || !isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'رابط غير صالح' : 'Invalid Link'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'هذا الرابط غير صحيح أو تم استخدامه مسبقاً. كل رابط يمكن استخدامه مرة واحدة فقط.'
                : 'This link is incorrect or has already been used. Each link can only be used once.'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-start">
            <p className="text-xs font-medium text-foreground">{isRTL ? 'أسباب محتملة:' : 'Possible reasons:'}</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc ps-4">
              <li>{isRTL ? 'تم نسخ الرابط بشكل غير كامل' : 'The link was copied incompletely'}</li>
              <li>{isRTL ? 'تم استخدام الرابط من قبل' : 'The link was already used'}</li>
              <li>{isRTL ? 'انتهت صلاحية الرابط' : 'The link has expired'}</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="hero" className="w-full gap-2" onClick={() => navigate('/auth?mode=forgot')}>
              <KeyRound className="w-4 h-4" />
              {isRTL ? 'طلب رابط جديد' : 'Request New Link'}
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/auth?mode=login')}>
              <LogIn className="w-4 h-4" />
              {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex">
            <BrandLogo variant="mark" tone="auto" size={48} alt="قِطاعات" />
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.new_password')}</h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'اختر كلمة مرور قوية وفريدة' : 'Choose a strong, unique password'}
            </p>
          </div>

          {/* Valid link indicator */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-accent">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isRTL ? 'الرابط صالح — أدخل كلمة المرور الجديدة' : 'Link verified — enter your new password'}
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

            {/* Inline error */}
            {resetError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 animate-in fade-in duration-300">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive font-medium">{resetError}</p>
              </div>
            )}

            <Button
              onClick={handleReset}
              disabled={loading || strength.score < 2 || password !== confirmPassword || !password}
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
