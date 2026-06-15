import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkPasswordStrength } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle, Info } from 'lucide-react';
import { PhoneField, toE164 } from '@/components/forms/PhoneField';
import { BilingualNameField } from '@/components/forms/BilingualNameField';
import { PasswordField } from './PasswordField';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthDivider } from './AuthDivider';
import { FieldError } from './FieldError';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { track, trackRegisterFailed, categorizeReason } from '@/lib/analytics-events';
import { getAttributionPayload } from '@/lib/analytics-attribution';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onEmailSent: (email: string) => void;
  onForgotPassword?: () => void;
}

/**
 * AUTH SIMPLIFICATION UX — One Account + Post-Login Context Selection.
 *
 * Single-screen registration: no account-type picker, no intent cards.
 * Every user creates ONE personal account. After verifying their email
 * and signing in, they pick a usage context (individual / create entity /
 * join entity) at `/start` — see `src/pages/Start.tsx`. The legacy 4-card
 * intent picker has been removed from this surface.
 *
 * The `accountType` constant is retained as an internal field set to
 * `'individual'` because downstream profile records and the AUTH-14B guard
 * test expect the field to exist. It no longer branches the UI.
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin, onEmailSent, onForgotPassword }) => {
  const { t, isRTL } = useLanguage();

  // Every register submits a personal account. Context (individual /
  // entity / join entity) is selected post-login at /start.
  const accountType: 'individual' = 'individual';

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const [fullNameAr, setFullNameAr] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [email, setEmail] = useState('');
  const [phoneParts, setPhoneParts] = useState<{ countryCode: string; national: string }>({ countryCode: '+966', national: '' });
  const [password, setPassword] = useState('');

  const passwordStrength = checkPasswordStrength(password);
  const fullName = (fullNameAr.trim() || fullNameEn.trim());
  const phoneE164 = toE164(phoneParts);
  const { errors, validateEmailField, validatePhoneField, clearError } = useFieldValidation(isRTL);

  const handleEmailBlur = async () => {
    if (!email) return;
    const valid = validateEmailField(email);
    if (!valid) { setEmailExists(false); return; }
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.rpc('check_email_registered', { _email: email.trim() });
      if (!error) setEmailExists(Boolean(data));
    } catch { /* non-blocking */ }
  };

  const handleRegister = async () => {
    if (!fullNameAr.trim() && !fullNameEn.trim()) {
      toast.error(isRTL ? 'يرجى إدخال الاسم بالعربية أو الإنجليزية' : 'Please enter your name (Arabic or English)');
      return;
    }
    if (!email || !validateEmailField(email)) {
      toast.error(isRTL ? 'البريد الإلكتروني غير صحيح' : 'Invalid email');
      return;
    }
    if (phoneParts.national && !validatePhoneField(phoneParts.national)) {
      toast.error(isRTL ? 'رقم الجوال غير صحيح' : 'Invalid phone number');
      return;
    }
    if (passwordStrength.score < 2) {
      toast.error(isRTL ? 'كلمة المرور ضعيفة جداً' : 'Password is too weak');
      return;
    }

    setLoading(true);
    track.signupStarted({ account_type: accountType, method: 'email' });
    try {
      await authService.signUp(email, password, {
        full_name: fullName,
        full_name_ar: fullNameAr,
        full_name_en: fullNameEn,
        account_type: accountType,
        phone: phoneE164,
        phone_country_code: phoneParts.national ? phoneParts.countryCode : '',
        phone_national: phoneParts.national,
      });
      onEmailSent(email);
      const attribution = getAttributionPayload();
      track.registerCompleted({ account_type: accountType, method: 'email', ...attribution });
      toast.success(isRTL ? 'تم إنشاء حسابك. تحقق من بريدك لإكمال التفعيل.' : 'Account created. Check your email to complete activation.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        trackRegisterFailed({
          account_type: accountType,
          method: 'email',
          source_page: 'auth_register',
          reason_category: msg.includes('already registered') ? 'validation' : categorizeReason(err),
        });
      } catch { /* analytics never breaks register */ }
      if (msg.includes('already registered')) {
        setEmailExists(true);
        toast.error(isRTL ? 'هذا البريد مسجل بالفعل' : 'This email is already registered');
      } else {
        toast.error(msg);
      }
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

  const isFormValid =
    !!email && fullName.length > 0 && passwordStrength.score >= 2 &&
    !errors.email && !errors.phone && !emailExists;

  return (
    <div className="space-y-6" data-feature="register-single-account">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-2xl text-foreground tracking-tight">
          {isRTL ? 'إنشاء حساب جديد' : 'Create a new account'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isRTL
            ? 'حساب واحد يتيح لك إدارة مشاريعك كفرد، أو إنشاء منشأة، أو الانضمام إلى منشأة لاحقًا.'
            : 'One account lets you manage projects as an individual, create a business, or join a business later.'}
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <BilingualNameField
          value={{ full_name_ar: fullNameAr, full_name_en: fullNameEn }}
          onChange={(v) => { setFullNameAr(v.full_name_ar); setFullNameEn(v.full_name_en); }}
          showUsername={false}
          required
        />

        <div className="space-y-2">
          <Label className="text-xs font-semibold">
            {t('auth.email')} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ insetInlineStart: '14px' }} />
            <Input
              type="email" placeholder="example@email.com" value={email}
              onChange={(e) => { setEmail(e.target.value); clearError('email'); setEmailExists(false); }}
              onBlur={handleEmailBlur}
              dir="ltr" style={{ paddingInlineStart: '42px' }}
              autoComplete="email"
              className={`h-12 rounded-xl ${errors.email || emailExists ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
          </div>
          <FieldError message={errors.email} />
          {emailExists && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 mt-1 animate-fade-in space-y-2">
              <p className="text-xs text-destructive font-medium">
                {isRTL ? 'هذا البريد مسجل بالفعل في قِطاعات.' : 'This email is already registered on Qitaat.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                  {isRTL ? 'تسجيل الدخول' : 'Sign in'}
                </button>
                {onForgotPassword && (
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition"
                  >
                    {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                )}
              </div>
            </div>
          )}
          {email && !errors.email && !emailExists && (
            <p className="flex items-center gap-1 text-xs text-accent mt-1">
              <CheckCircle className="w-3 h-3" />
              {isRTL ? 'صيغة البريد صحيحة' : 'Valid email format'}
            </p>
          )}
        </div>

        <PhoneField
          value={phoneParts}
          onChange={(v) => { setPhoneParts(v); clearError('phone'); }}
          onBlur={() => { if (phoneParts.national) validatePhoneField(phoneParts.national); }}
          optional
          error={errors.phone}
        />

        <PasswordField
          password={password} onChange={setPassword} label={t('auth.password')}
          showStrength isRTL={isRTL} showPassword={showPassword}
          onToggleShow={() => setShowPassword(!showPassword)}
        />

        <Button
          onClick={handleRegister}
          disabled={loading || !isFormValid}
          className="w-full h-12 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20"
          variant="hero"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
          {loading ? t('common.loading') : (isRTL ? 'إنشاء الحساب' : 'Create account')}
        </Button>

        {/* Helper note: context selection happens later */}
        <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/30 p-3">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isRTL
              ? 'بعد إنشاء الحساب يمكنك اختيار طريقة استخدامك لقطاعات من داخل لوحة التحكم.'
              : 'After creating your account, you can choose how to use Qitaat from inside the dashboard.'}
          </p>
        </div>
      </div>

      <AuthDivider isRTL={isRTL} />
      <GoogleAuthButton onClick={handleGoogle} loading={googleLoading} isRTL={isRTL} mode="register" />

      <div className="text-center text-sm pt-1">
        <span className="text-muted-foreground">{isRTL ? 'لديك حساب؟' : 'Have an account?'} </span>
        <button onClick={onSwitchToLogin} className="text-primary font-semibold hover:underline">
          {t('auth.has_account')}
        </button>
      </div>
    </div>
  );
};
