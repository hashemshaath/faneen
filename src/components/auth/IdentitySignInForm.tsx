import React, { useMemo, useState } from 'react';
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
import {
  Phone, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft,
  Sparkles, ShieldAlert,
} from 'lucide-react';
import { OtpInput } from './OtpInput';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthDivider } from './AuthDivider';
import { AuthErrorHelpLinks } from './AuthErrorHelpLinks';
import { FieldError } from './FieldError';
import { trackLoginSuccess, trackLoginFailed, categorizeReason, track } from '@/lib/analytics-events';

type IdentityKind = 'phone' | 'email' | 'unknown';

/** Detect whether the user typed a phone or an email. */
function detectKind(raw: string): IdentityKind {
  const v = raw.trim();
  if (!v) return 'unknown';
  if (v.includes('@')) return 'email';
  // Strip spaces, dashes, parens, leading +
  const digits = v.replace(/[\s\-()]/g, '');
  if (/^\+?\d{5,}$/.test(digits)) return 'phone';
  return 'unknown';
}

/** Split a raw phone (possibly with + prefix) into country code + local digits. */
function splitPhone(raw: string, fallbackCc = '+966'): { countryCode: string; local: string } {
  const v = raw.trim().replace(/[\s\-()]/g, '');
  if (v.startsWith('+')) {
    // Try the longest plausible country code (1-4 digits after +).
    const match = v.match(/^\+(\d{1,4})(\d+)$/);
    if (match) return { countryCode: `+${match[1]}`, local: match[2] };
  }
  return { countryCode: fallbackCc, local: v.replace(/^0+/, '') };
}

interface Props {
  onForgotPassword: () => void;
  /** Optional escape hatch to the classic step-based registration form. */
  onAdvancedRegister: () => void;
}

export const IdentitySignInForm: React.FC<Props> = ({ onForgotPassword, onAdvancedRegister }) => {
  const { isRTL, t } = useLanguage();

  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState<'identity' | 'password' | 'otp'>('identity');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverErrorRaw, setServerErrorRaw] = useState('');

  const { errors, validateEmailField, validatePhoneField, clearError } = useFieldValidation(isRTL);
  const lockout = useLoginLockout();

  const kind = useMemo(() => detectKind(identity), [identity]);
  const phoneParts = useMemo(() => splitPhone(identity), [identity]);

  const otp = useOtpFlow({
    isRTL,
    onSendOtp: () => authService.sendLoginOtp(phoneParts.local, phoneParts.countryCode),
    onVerifyOtp: async (code) => {
      const response = await authService.verifyLoginOtp(phoneParts.local, phoneParts.countryCode, code);
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

  // ─── Identity → continue ─────────────────────────────
  const handleContinue = async () => {
    resetServerError();
    if (kind === 'unknown') {
      toast.error(isRTL ? 'أدخل رقم جوال صحيح أو بريداً إلكترونياً' : 'Enter a valid phone or email');
      return;
    }

    if (kind === 'email') {
      if (!validateEmailField(identity.trim())) return;
      setStage('password');
      return;
    }

    // phone → send OTP. Works for both new + existing users (server creates on first verify).
    if (!phoneParts.local || phoneParts.local.length < 7) {
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
    if (!password) { toast.error(isRTL ? 'أدخل كلمة المرور' : 'Enter your password'); return; }
    setLoading(true);
    try {
      await authService.signInWithEmail(identity.trim(), password);
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

  const Back = isRTL ? ArrowRight : ArrowLeft;

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
              {phoneParts.countryCode}{phoneParts.local}
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

  // ─── Stage: Email password ───────────────────────────
  if (stage === 'password') {
    return (
      <div className="space-y-7">
        <button
          onClick={() => { setStage('identity'); resetServerError(); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors -mb-2"
        >
          <Back className="w-3.5 h-3.5" /> {isRTL ? 'تغيير البريد' : 'Change email'}
        </button>
        <div className="space-y-1.5">
          <h2 className="font-heading font-bold text-3xl text-foreground tracking-tight">
            {isRTL ? 'كلمة المرور' : 'Your password'}
          </h2>
          <p className="text-sm text-muted-foreground/80 truncate">
            <span className="tech-content">{identity.trim()}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">{t('auth.password')}</Label>
              <button onClick={onForgotPassword} className="text-xs text-accent hover:underline font-medium">
                {t('auth.forgot')}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '14px' }} />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoFocus
                onChange={(e) => { setPassword(e.target.value); resetServerError(); }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                className={`h-12 rounded-xl ${serverError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                style={{ paddingInlineStart: '42px', paddingInlineEnd: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-3.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                style={{ [isRTL ? 'left' : 'right']: '14px' }}
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
                    authService.resendConfirmation(identity.trim())
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

          <p className="text-center text-xs text-muted-foreground">
            {isRTL ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
            <button onClick={onAdvancedRegister} className="text-accent font-semibold hover:underline">
              {isRTL ? 'إنشاء حساب' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ─── Stage: Identity entry (default) ─────────────────
  const hintIcon =
    kind === 'phone' ? <Phone className="w-4 h-4" /> :
    kind === 'email' ? <Mail className="w-4 h-4" /> :
    <Sparkles className="w-4 h-4" />;

  const hintText =
    kind === 'phone' ? (isRTL ? 'سنرسل رمز تحقق إلى جوالك' : "We'll text you a verification code") :
    kind === 'email' ? (isRTL ? 'سنطلب كلمة المرور في الخطوة التالية' : 'Password on the next step') :
    (isRTL ? 'استخدم جوالك أو بريدك الإلكتروني' : 'Use your phone or your email');

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-3xl text-foreground tracking-tight">
          {isRTL ? 'مرحباً بك' : 'Welcome'}
        </h2>
        <p className="text-sm text-muted-foreground/80">
          {isRTL
            ? 'سجّل دخولك أو أنشئ حساباً جديداً بخطوة واحدة'
            : 'Sign in or create an account in a single step'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">
            {isRTL ? 'رقم الجوال أو البريد الإلكتروني' : 'Phone or email'}
          </Label>
          <div className="relative">
            <span
              className="absolute top-3.5 text-muted-foreground/60 transition-colors"
              style={{ [isRTL ? 'right' : 'left']: '14px' }}
              aria-hidden
            >
              {hintIcon}
            </span>
            <Input
              value={identity}
              autoFocus
              dir="auto"
              inputMode={kind === 'phone' ? 'tel' : 'email'}
              autoComplete="username"
              placeholder={isRTL ? '+966 5XXXXXXXX أو email@domain.com' : '+966 5XXXXXXXX or email@domain.com'}
              onChange={(e) => { setIdentity(e.target.value); clearError('email'); clearError('phone'); resetServerError(); }}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              style={{ paddingInlineStart: '42px' }}
              className="h-12 rounded-xl text-[15px]"
            />
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 ps-1">
            {hintIcon}
            <span>{hintText}</span>
          </p>
          <FieldError message={errors.email || errors.phone} />
        </div>

        <Button
          onClick={handleContinue}
          disabled={kind === 'unknown' || otp.loading}
          className="w-full h-12 rounded-xl text-sm font-semibold"
          variant="hero"
        >
          {otp.loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
          {isRTL ? 'متابعة' : 'Continue'}
        </Button>
      </div>

      <AuthDivider isRTL={isRTL} />
      <GoogleAuthButton onClick={handleGoogle} loading={googleLoading} isRTL={isRTL} />

      <div className="text-center pt-1 space-y-1.5">
        <button
          onClick={onAdvancedRegister}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isRTL
            ? 'تسجيل عمل تجاري بخطوات متقدّمة ←'
            : 'Register a business with advanced setup →'}
        </button>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed px-4">
          {isRTL
            ? 'بمتابعتك، فأنت توافق على شروط الاستخدام وسياسة الخصوصية.'
            : 'By continuing, you agree to our Terms and Privacy Policy.'}
        </p>
      </div>
    </div>
  );
};