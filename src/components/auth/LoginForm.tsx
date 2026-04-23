import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService, useOtpFlow } from '@/services/auth';
import { useLoginLockout } from '@/hooks/useLoginLockout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Phone, Mail, Lock, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { OtpInput } from './OtpInput';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthDivider } from './AuthDivider';
import { FieldError } from './FieldError';
import { useFieldValidation } from '@/hooks/useFieldValidation';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister, onForgotPassword }) => {
  const { t, isRTL } = useLanguage();

  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');

  const { errors, validateEmailField, validatePhoneField, clearError } = useFieldValidation(isRTL);
  const lockout = useLoginLockout();

  const otp = useOtpFlow({
    isRTL,
    onSendOtp: () => authService.sendLoginOtp(phone, countryCode),
    onVerifyOtp: async (code) => {
      const response = await authService.verifyLoginOtp(phone, countryCode, code);
      if (!response.success) {
        const errorMap: Record<string, string> = {
          otp_already_used: isRTL ? 'تم استخدام هذا الرمز' : 'Code already used',
          otp_expired: isRTL ? 'انتهت صلاحية الرمز' : 'Code expired',
          too_many_attempts: isRTL ? 'تم تجاوز عدد المحاولات' : 'Too many attempts',
          invalid_otp: isRTL ? 'رمز التحقق غير صحيح' : 'Invalid code',
        };
        throw new Error(errorMap[response.error || ''] || response.message || (isRTL ? 'تعذر التحقق' : 'Verification failed'));
      }
      await authService.setSessionFromOtp(response);
      toast.success(isRTL ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
    },
  });

  const getArabicErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login') || lower.includes('invalid_credentials')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    }
    if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
      return 'يرجى تأكيد بريدك الإلكتروني أولاً';
    }
    if (lower.includes('too_many_requests') || lower.includes('rate_limit') || lower.includes('too many') || lower.includes('over_request_rate_limit')) {
      return 'محاولات كثيرة جداً، يرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى';
    }
    if (lower.includes('user not found') || lower.includes('no user')) {
      return 'لا يوجد حساب مسجّل بهذا البريد الإلكتروني';
    }
    if (lower.includes('user already registered') || lower.includes('already_exists')) {
      return 'هذا البريد الإلكتروني مسجّل مسبقاً، جرّب تسجيل الدخول';
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
      return 'خطأ في الاتصال بالإنترنت، تحقق من اتصالك وحاول مجدداً';
    }
    if (lower.includes('user banned') || lower.includes('banned')) {
      return 'تم تعليق هذا الحساب، يرجى التواصل مع الدعم';
    }
    if (lower.includes('password') && lower.includes('weak')) {
      return 'كلمة المرور ضعيفة جداً، استخدم كلمة مرور أقوى';
    }
    if (lower.includes('signups not allowed') || lower.includes('signup_disabled')) {
      return 'التسجيل غير متاح حالياً';
    }
    return msg;
  };

  const getEnglishErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login') || lower.includes('invalid_credentials')) {
      return 'Incorrect email or password';
    }
    if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
      return 'Please confirm your email first';
    }
    if (lower.includes('too_many_requests') || lower.includes('rate_limit') || lower.includes('too many') || lower.includes('over_request_rate_limit')) {
      return 'Too many attempts, please wait a few minutes and try again';
    }
    if (lower.includes('user not found') || lower.includes('no user')) {
      return 'No account found with this email';
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
      return 'Connection error, check your internet and try again';
    }
    if (lower.includes('user banned') || lower.includes('banned')) {
      return 'This account has been suspended, please contact support';
    }
    return msg;
  };

  const handleEmailLogin = async () => {
    setLoginError('');
    setPasswordError('');
    if (!email || !validateEmailField(email)) {
      if (!email) clearError('email');
      return;
    }
    if (!password) {
      setPasswordError(isRTL ? 'يرجى إدخال كلمة المرور' : 'Please enter your password');
      return;
    }
    setLoading(true);
    try {
      await authService.signInWithEmail(email, password);
      lockout.recordSuccess();
      toast.success(t('common.success'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendlyMsg = isRTL ? getArabicErrorMessage(msg) : getEnglishErrorMessage(msg);
      lockout.recordFailure();
      setLoginError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSend = async () => {
    if (!phone || !validatePhoneField(phone)) {
      if (!phone) toast.error(isRTL ? 'أدخل رقم جوال صحيح' : 'Enter a valid phone number');
      return;
    }
    const ok = await otp.sendOtp();
    if (ok) toast.success(isRTL ? 'تم إرسال رمز التحقق' : 'Verification code sent');
    else if (otp.error) toast.error(otp.error);
  };

  const handlePhoneVerify = async () => {
    const ok = await otp.verifyOtp();
    if (!ok && otp.error) toast.error(otp.error);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-3xl text-foreground tracking-tight">
          {isRTL ? 'مرحباً بعودتك' : 'Welcome back'}
        </h2>
        <p className="text-sm text-muted-foreground/80">
          {isRTL ? 'سجّل دخولك للوصول إلى حسابك' : 'Sign in to access your account'}
        </p>
      </div>

      {/* Method toggle */}
      <div className="flex rounded-2xl bg-muted/40 p-1 gap-1">
        <button
          onClick={() => { setLoginMethod('phone'); otp.resetOtp(); clearError('phone'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            loginMethod === 'phone' ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Phone className="w-4 h-4" />
          {isRTL ? 'رقم الجوال' : 'Phone'}
        </button>
        <button
          onClick={() => { setLoginMethod('email'); otp.resetOtp(); clearError('email'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            loginMethod === 'email' ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="w-4 h-4" />
          {isRTL ? 'البريد الإلكتروني' : 'Email'}
        </button>
      </div>

      {loginMethod === 'phone' && !otp.otpStep && (
        <div className="space-y-4 animate-fade-in">
          <PhoneInput
            phone={phone} countryCode={countryCode} onPhoneChange={(v) => { setPhone(v); clearError('phone'); }}
            onCountryCodeChange={setCountryCode} isRTL={isRTL}
            error={errors.phone}
            onBlur={() => phone && validatePhoneField(phone)}
          />
          <Button onClick={handlePhoneSend} disabled={otp.loading || !!errors.phone} className="w-full h-12 rounded-xl text-sm font-semibold" variant="hero">
            {otp.loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {isRTL ? 'إرسال رمز التحقق' : 'Send Verification Code'}
          </Button>
        </div>
      )}

      {loginMethod === 'phone' && otp.otpStep && (
        <OtpInput
          otpCode={otp.otpCode} onCodeChange={otp.setCode} demoOtp={otp.demoOtp}
          cooldown={otp.cooldown} loading={otp.loading} onVerify={handlePhoneVerify}
          onResend={handlePhoneSend} onBack={otp.resetOtp} isRTL={isRTL}
        />
      )}

      {loginMethod === 'email' && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t('auth.email')}</Label>
            <div className="relative">
              <Mail className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '14px' }} />
              <Input
                type="email" placeholder="example@email.com" value={email}
                onChange={(e) => { setEmail(e.target.value); clearError('email'); setLoginError(''); }}
                onBlur={() => email && validateEmailField(email)}
                dir="ltr"
                style={{ paddingInlineStart: '42px' }}
                className={`h-12 rounded-xl ${errors.email || loginError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              />
            </div>
            <FieldError message={errors.email} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">{t('auth.password')}</Label>
              <button onClick={onForgotPassword} className="text-xs text-accent hover:underline font-medium">{t('auth.forgot')}</button>
            </div>
            <div className="relative">
              <Lock className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '14px' }} />
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(''); setLoginError(''); }}
                className={`h-12 rounded-xl ${passwordError || loginError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                style={{ paddingInlineStart: '42px', paddingInlineEnd: '42px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3.5 text-muted-foreground/60 hover:text-foreground transition-colors" style={{ [isRTL ? 'left' : 'right']: '14px' }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError message={passwordError} />
            <FieldError message={loginError} />
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              className="h-4 w-4"
            />
            <label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer select-none">
              {isRTL ? 'تذكرني لمدة 30 يوماً' : 'Remember me for 30 days'}
            </label>
          </div>

          {/* Lockout warning */}
          {lockout.isLocked && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 animate-in fade-in duration-300">
              <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs text-destructive font-semibold">
                  {isRTL
                    ? `تم قفل تسجيل الدخول مؤقتاً. أعد المحاولة بعد ${lockout.remainingSeconds} ثانية.`
                    : `Login temporarily locked. Try again in ${lockout.remainingSeconds}s.`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isRTL
                    ? 'تم تجاوز الحد الأقصى للمحاولات الفاشلة. هذا الإجراء لحماية حسابك.'
                    : 'Maximum failed attempts exceeded. This is to protect your account.'}
                </p>
              </div>
            </div>
          )}

          {/* Attempts warning (near limit) */}
          {!lockout.isLocked && lockout.failedAttempts >= 3 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              {isRTL
                ? `تبقى ${lockout.maxAttempts - lockout.failedAttempts} محاولة قبل القفل المؤقت`
                : `${lockout.maxAttempts - lockout.failedAttempts} attempt(s) remaining before lockout`}
            </p>
          )}

          <Button onClick={handleEmailLogin} disabled={loading || !!errors.email || lockout.isLocked} className="w-full h-12 rounded-xl text-sm font-semibold" variant="hero">
            {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {loading ? t('common.loading') : t('auth.login')}
          </Button>
        </div>
      )}

      <AuthDivider isRTL={isRTL} />
      <GoogleAuthButton onClick={handleGoogle} loading={googleLoading} isRTL={isRTL} />

      <div className="text-center pt-1">
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
          <button onClick={onSwitchToRegister} className="text-accent font-semibold hover:underline">{t('auth.no_account')}</button>
        </p>
      </div>
    </div>
  );
};
