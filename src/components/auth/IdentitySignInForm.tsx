import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService, useOtpFlow } from '@/services/auth';
import { translateAuthError, getAuthErrorHelpLinks } from '@/services/auth/errorMessages';
import { useLoginLockout } from '@/hooks/useLoginLockout';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Phone, Mail, Lock, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { OtpInput } from './OtpInput';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthDivider } from './AuthDivider';
import { AuthErrorHelpLinks } from './AuthErrorHelpLinks';
import { FieldError } from './FieldError';
import { PhoneInput } from './PhoneInput';
import { AuthTrustStrip } from './AuthTrustStrip';
import { trackLoginSuccess, trackLoginFailed, categorizeReason, track } from '@/lib/analytics-events';

type Method = 'phone' | 'email';

interface Props {
  onForgotPassword: () => void;
  /** Optional escape hatch to the classic step-based registration form. */
  onAdvancedRegister: () => void;
}

export const IdentitySignInForm: React.FC<Props> = ({ onForgotPassword, onAdvancedRegister }) => {
  const { isRTL, t } = useLanguage();

  const [method, setMethod] = useState<Method>('phone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState<'identity' | 'otp'>('identity');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverErrorRaw, setServerErrorRaw] = useState('');

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
      try { trackLoginSuccess({ method: 'otp' }); } catch { /* analytics never breaks login */ }
      toast.success(isRTL ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
    },
  });

  const resetServerError = () => { setServerError(''); setServerErrorRaw(''); };

  // ─── Phone → send OTP ────────────────────────────────
  const handleSendOtp = async () => {
    resetServerError();
    if (!validatePhoneField(phone)) return;
    if (!phone || phone.length < 7) {
      toast.error(isRTL ? 'رقم الجوال غير صحيح' : 'Invalid phone number');
      return;
    }
    try { track.signupStarted({ account_type: 'individual', method: 'otp' }); } catch { /* never break flow */ }
    const result = await otp.sendOtp();
    if (result.ok) {
      setStage('otp');
      toast.success(isRTL ? 'تم إرسال رمز التحقق' : 'Verification code sent');
    } else {
      toast.error(
        result.error ||
          (isRTL
            ? 'خدمة الرسائل قيد الإعداد. جرّب البريد الإلكتروني.'
            : 'Messaging service unavailable. Try email instead.'),
      );
    }
  };

  // ─── Email + password ────────────────────────────────
  const handleEmailLogin = async () => {
    resetServerError();
    if (!validateEmailField(email.trim())) return;
    if (!password) { toast.error(isRTL ? 'أدخل كلمة المرور' : 'Enter your password'); return; }
    setLoading(true);
    try {
      await authService.signInWithEmail(email.trim(), password);
      lockout.recordSuccess();
      try { trackLoginSuccess({ method: 'password' }); } catch { /* never break login */ }
      toast.success(isRTL ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lockout.recordFailure();
      try { trackLoginFailed({ method: 'password', source_page: 'auth_login', reason_category: categorizeReason(err) }); } catch { /* never break login */ }
      setServerError(translateAuthError(msg, isRTL));
      setServerErrorRaw(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try { await authService.signInWithGoogle(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Google sign-in failed'); }
    finally { setGoogleLoading(false); }
  };

  // ─── Stage: OTP ──────────────────────────────────────
  if (stage === 'otp') {
    return (
      <div className="space-y-7">
        <div className="space-y-2">
          <h2 className="font-heading font-bold text-3xl text-foreground tracking-tight">
            {isRTL ? 'أدخل رمز التحقق' : 'Enter verification code'}
          </h2>
          <p className="text-sm text-muted-foreground/80">
            {isRTL ? 'أرسلنا رمزاً مكوّناً من 6 أرقام إلى ' : 'We sent a 6-digit code to '}
            <span className="font-mono tech-content text-foreground">
              {countryCode}{phone}
            </span>
          </p>
        </div>
        <OtpInput
          otpCode={otp.otpCode} onCodeChange={otp.setCode} demoOtp={otp.demoOtp}
          cooldown={otp.cooldown} loading={otp.loading}
          onVerify={async () => { const ok = await otp.verifyOtp(); if (!ok && otp.error) toast.error(otp.error); }}
          onResend={async () => { const r = await otp.sendOtp(); if (r.ok) toast.success(isRTL ? 'تم الإرسال' : 'Resent'); }}
          onBack={() => { otp.resetOtp(); setStage('identity'); }}
          isRTL={isRTL} error={otp.error}
        />
      </div>
    );
  }

  // ─── Stage: Identity entry (default) ─────────────────
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-3xl text-foreground tracking-tight">
          {isRTL ? 'مرحباً بك' : 'Welcome'}
        </h2>
        <p className="text-sm text-muted-foreground/80">
          {isRTL ? 'اختر طريقة الدخول المفضّلة لديك' : 'Choose your preferred sign-in method'}
        </p>
      </div>

      {/* Method switcher */}
      <div
        role="tablist"
        aria-label={isRTL ? 'طريقة تسجيل الدخول' : 'Sign-in method'}
        className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/40 border border-border/50"
      >
        <button
          role="tab"
          aria-selected={method === 'phone'}
          onClick={() => { setMethod('phone'); resetServerError(); }}
          className={`h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            method === 'phone'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Phone className="w-4 h-4" />
          {isRTL ? 'الجوال' : 'Phone'}
        </button>
        <button
          role="tab"
          aria-selected={method === 'email'}
          onClick={() => { setMethod('email'); resetServerError(); }}
          className={`h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            method === 'email'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="w-4 h-4" />
          {isRTL ? 'البريد' : 'Email'}
        </button>
      </div>

      {method === 'phone' ? (
        <div className="space-y-4">
          <PhoneInput
            phone={phone}
            countryCode={countryCode}
            onPhoneChange={(v) => { setPhone(v); clearError('phone'); }}
            onCountryCodeChange={setCountryCode}
            isRTL={isRTL}
          />
          <FieldError message={errors.phone} />
          <p className="text-[11px] text-muted-foreground/70 ps-1">
            {isRTL ? 'سنرسل لك رمز تحقق مكوّن من 6 أرقام' : "We'll text you a 6-digit verification code"}
          </p>
          <Button
            onClick={handleSendOtp}
            disabled={!phone || phone.length < 7 || otp.loading}
            className="w-full h-12 rounded-xl text-sm font-semibold"
            variant="hero"
          >
            {otp.loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {isRTL ? 'إرسال رمز التحقق' : 'Send verification code'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{isRTL ? 'البريد الإلكتروني' : 'Email address'}</Label>
            <div className="relative">
              <Mail className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ insetInlineStart: '14px' }} />
              <Input
                type="email"
                value={email}
                autoFocus
                dir="auto"
                inputMode="email"
                autoComplete="email"
                placeholder="email@domain.com"
                onChange={(e) => { setEmail(e.target.value); clearError('email'); resetServerError(); }}
                style={{ paddingInlineStart: '42px' }}
                className="h-12 rounded-xl"
              />
            </div>
            <FieldError message={errors.email} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">{t('auth.password')}</Label>
              <button onClick={onForgotPassword} className="text-xs text-accent hover:underline font-medium">
                {t('auth.forgot')}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ insetInlineStart: '14px' }} />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); resetServerError(); }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                autoComplete="current-password"
                className={`h-12 rounded-xl ${serverError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                style={{ paddingInlineStart: '42px', paddingInlineEnd: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? (isRTL ? 'إخفاء كلمة المرور' : 'Hide password') : (isRTL ? 'إظهار كلمة المرور' : 'Show password')}
                className="absolute top-3.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                style={{ insetInlineEnd: '14px' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError message={serverError} />
            {serverErrorRaw && (
              <AuthErrorHelpLinks
                links={getAuthErrorHelpLinks(serverErrorRaw, isRTL)}
                onAction={(action) => {
                  if (action === 'forgot-password') onForgotPassword();
                  else if (action === 'register') onAdvancedRegister();
                  else if (action === 'contact') window.location.href = '/contact';
                  else if (action === 'resend-confirmation') {
                    authService.resendConfirmation(email.trim())
                      .then(() => toast.success(isRTL ? 'تم إعادة إرسال رابط التحقق' : 'Verification link resent'))
                      .catch(() => toast.error(isRTL ? 'فشل إعادة الإرسال' : 'Failed to resend'));
                  }
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} className="h-4 w-4" />
            <label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer select-none">
              {isRTL ? 'تذكرني لمدة 30 يوماً' : 'Remember me for 30 days'}
            </label>
          </div>

          {lockout.isLocked && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 animate-in fade-in duration-300">
              <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive font-semibold">
                {isRTL
                  ? `تم قفل تسجيل الدخول مؤقتاً. أعد المحاولة بعد ${lockout.remainingSeconds} ثانية.`
                  : `Login locked. Try again in ${lockout.remainingSeconds}s.`}
              </p>
            </div>
          )}

          <Button
            onClick={handleEmailLogin}
            disabled={loading || lockout.isLocked}
            className="w-full h-12 rounded-xl text-sm font-semibold"
            variant="hero"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {isRTL ? 'تسجيل الدخول' : 'Sign in'}
          </Button>
        </div>
      )}

      <AuthDivider isRTL={isRTL} />
      <GoogleAuthButton onClick={handleGoogle} loading={googleLoading} isRTL={isRTL} />

      <div className="text-center pt-1 space-y-1.5">
        <button
          onClick={onAdvancedRegister}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isRTL ? 'تسجيل عمل تجاري بخطوات متقدّمة ←' : 'Register a business with advanced setup →'}
        </button>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed px-4">
          {isRTL
            ? 'بمتابعتك، فأنت توافق على شروط الاستخدام وسياسة الخصوصية.'
            : 'By continuing, you agree to our Terms and Privacy Policy.'}
        </p>
      </div>

      <AuthTrustStrip context="login" />
    </div>
  );
};