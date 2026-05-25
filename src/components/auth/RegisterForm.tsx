import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkPasswordStrength } from '@/lib/password-strength';
import { toast } from 'sonner';
import { User, Building2, Mail, Loader2, ArrowLeft, ArrowRight, CheckCircle, UserPlus, Send } from 'lucide-react';
import { Ticket, FileText, AtSign } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { PasswordField } from './PasswordField';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthDivider } from './AuthDivider';
import { FieldError } from './FieldError';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import type { RegisterStep, RegisterType } from '@/services/auth/types';
import { track, trackRegisterFailed, categorizeReason } from '@/lib/analytics-events';
import { getAttributionPayload } from '@/lib/analytics-attribution';
import { UsernamePicker } from '@/components/common/UsernamePicker';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onEmailSent: (email: string) => void;
}

/**
 * REGISTRATION-UX-VISIBLE-FIX — intent picker surfaced directly on the
 * register screen, mirroring the new Onboarding flow (Model D Hybrid
 * User-First). Four intents: individual / create-entity / join-invite /
 * request-access. The latter two persist a pending intent in localStorage
 * so the post-signup /onboarding flow can resume on the correct step.
 */
type RegisterIntent = 'individual' | 'create-entity' | 'join-invite' | 'request-access';

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin, onEmailSent }) => {
  const { t, isRTL } = useLanguage();

  const [registerType, setRegisterType] = useState<RegisterType>('individual');
  const [step, setStep] = useState<RegisterStep>('type');
  const [intent, setIntent] = useState<RegisterIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameOk, setUsernameOk] = useState(false);
  // Intent-specific fields
  const [inviteToken, setInviteToken] = useState('');
  const [targetEntityRef, setTargetEntityRef] = useState('');
  const [accessReason, setAccessReason] = useState('');

  const passwordStrength = checkPasswordStrength(password);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const { errors, validateEmailField, validatePhoneField, clearError } = useFieldValidation(isRTL);

  const handleEmailBlur = () => {
    if (!email) return;
    const valid = validateEmailField(email);
    if (valid) setEmailExists(false);
  };

  const pickIntent = (id: RegisterIntent) => {
    setIntent(id);
    // Persist pending intent so /onboarding resumes on the correct step.
    try {
      if (id === 'individual' || id === 'create-entity') {
        localStorage.removeItem('qitaat_pending_intent');
      } else {
        localStorage.setItem('qitaat_pending_intent', id);
      }
    } catch { /* storage unavailable — non-blocking */ }
    setRegisterType(id === 'create-entity' ? 'business' : 'individual');
    setStep('details');
  };

  // Persist intent-specific payload right before signup so /onboarding can pick it up.
  const persistIntentPayload = () => {
    try {
      if (intent === 'join-invite' && inviteToken.trim()) {
        localStorage.setItem('qitaat_pending_invite_token', inviteToken.trim());
      }
      if (intent === 'request-access') {
        if (targetEntityRef.trim()) localStorage.setItem('qitaat_pending_access_target', targetEntityRef.trim());
        if (accessReason.trim()) localStorage.setItem('qitaat_pending_access_reason', accessReason.trim());
      }
    } catch { /* non-blocking */ }
  };

  const handleRegister = async () => {
    if (!fullName.trim()) { toast.error(isRTL ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name'); return; }
    if (!email || !validateEmailField(email)) { toast.error(isRTL ? 'البريد الإلكتروني غير صحيح' : 'Invalid email'); return; }
    if (phone && !validatePhoneField(phone)) { toast.error(isRTL ? 'رقم الجوال غير صحيح' : 'Invalid phone number'); return; }
    if (passwordStrength.score < 2) { toast.error(isRTL ? 'كلمة المرور ضعيفة جداً' : 'Password is too weak'); return; }
    if (password !== confirmPassword) { toast.error(isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'); return; }
    if (registerType === 'business' && !usernameOk) { toast.error(isRTL ? 'اختر اسم مستخدم صحيحاً ومتاحاً' : 'Pick a valid, available username'); return; }

    // Intent-specific validation
    if (intent === 'join-invite' && !inviteToken.trim()) {
      toast.error(isRTL ? 'يرجى إدخال رمز الدعوة' : 'Please enter your invitation token');
      return;
    }
    if (intent === 'request-access' && !targetEntityRef.trim()) {
      toast.error(isRTL ? 'يرجى إدخال معرّف المنشأة المطلوبة' : 'Please enter the target entity reference');
      return;
    }
    persistIntentPayload();
    setLoading(true);
    track.signupStarted({ account_type: registerType, method: 'email' });
    try {
      await authService.signUp(email, password, {
        full_name: fullName,
        account_type: registerType,
        phone: phone ? `${countryCode}${phone.replace(/^0/, '')}` : '',
      });
      onEmailSent(email);
      const attribution = getAttributionPayload();
      // Canonical conversion event (Phase 6). `signupCompleted` deprecated.
      track.registerCompleted({ account_type: registerType, method: 'email', ...attribution });
      toast.success(isRTL ? 'تم إرسال رابط التحقق إلى بريدك الإلكتروني' : 'Verification link sent to your email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        trackRegisterFailed({
          account_type: registerType,
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
    try { await authService.signInWithGoogle(); } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Google sign-in failed'); } finally { setGoogleLoading(false); }
  };

  // ─── Step: Intent (NEW design — Compact Card Stack) ───
  if (step === 'type') {
    const totalSteps = 2;
    return (
      <div className="space-y-6" data-feature="register-intent">
        {/* Progress header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading font-bold text-2xl text-foreground tracking-tight">
              {isRTL ? 'إنشاء حساب جديد' : 'Create a new account'}
            </h2>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">
              {isRTL ? `خطوة 1 من ${totalSteps}` : `Step 1 of ${totalSteps}`}
            </span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: '50%' }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'ما هو غرضك الأساسي من الانضمام لقطاعات؟' : 'What brings you to Qitaat?'}
          </p>
        </div>

        {/* Intent grid: 2 full-width primary + 2 half compact */}
        <div className="grid grid-cols-1 gap-3">
          {/* Individual */}
          <button
            type="button"
            data-intent="individual"
            onClick={() => pickIntent('individual')}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all duration-300 text-start active:scale-[0.98] hover-lift"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/10">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-sm text-foreground">
                {isRTL ? 'متابعة كفرد' : 'Continue as individual'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isRTL ? 'للتصفح والبحث وطلب عروض الأسعار' : 'Browse, search, and request quotes'}
              </p>
            </div>
          </button>

          {/* Create entity */}
          <button
            type="button"
            data-intent="create-entity"
            onClick={() => pickIntent('create-entity')}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all duration-300 text-start active:scale-[0.98] hover-lift"
          >
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-sm text-foreground">
                {isRTL ? 'إنشاء منشأة أو شركة' : 'Create a business / entity'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isRTL ? 'مزوّد، مشتري، أو الاثنين' : 'Provider, buyer, or both'}
              </p>
            </div>
          </button>

          {/* Compact pair */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-intent="join-invite"
              onClick={() => pickIntent('join-invite')}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all duration-300 text-start active:scale-[0.98] hover-lift"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-sm text-foreground">
                  {isRTL ? 'انضمام بدعوة' : 'Join by invite'}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isRTL ? 'لديك رمز دعوة' : 'I have a token'}
                </p>
              </div>
            </button>

            <button
              type="button"
              data-intent="request-access"
              onClick={() => pickIntent('request-access')}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all duration-300 text-start active:scale-[0.98] hover-lift"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-sm text-foreground">
                  {isRTL ? 'طلب انضمام' : 'Request access'}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isRTL ? 'لمنشأة قائمة' : 'To existing entity'}
                </p>
              </div>
            </button>
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
  }

  // ─── Step: Details ───
  if (step === 'details') {
    const intentValid =
      (intent !== 'join-invite' || inviteToken.trim().length > 0) &&
      (intent !== 'request-access' || targetEntityRef.trim().length > 0);
    const isFormValid = !!email && fullName.trim().length > 0 && passwordStrength.score >= 2 && password === confirmPassword && !errors.email && !errors.phone && !emailExists && intentValid;
    const intentLabel: Record<RegisterIntent, { ar: string; en: string }> = {
      'individual': { ar: 'متابعة كفرد', en: 'Continue as individual' },
      'create-entity': { ar: 'إنشاء منشأة', en: 'Create entity' },
      'join-invite': { ar: 'انضمام بدعوة', en: 'Join by invite' },
      'request-access': { ar: 'طلب انضمام', en: 'Request access' },
    };
    const activeIntent = intent ?? (registerType === 'business' ? 'create-entity' : 'individual');

    return (
      <div className="space-y-6">
        {/* Progress header (step 2) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading font-bold text-2xl text-foreground tracking-tight">
              {isRTL ? 'أدخل بياناتك' : 'Your details'}
            </h2>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">
              {isRTL ? 'خطوة 2 من 2' : 'Step 2 of 2'}
            </span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-full px-3 py-1">
            <CheckCircle className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">
              {isRTL ? intentLabel[activeIntent].ar : intentLabel[activeIntent].en}
            </span>
          </div>
        </div>

        {/* Intent-specific fields shown BEFORE common details so each path looks distinct */}
        {activeIntent === 'join-invite' && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-primary" />
              {isRTL ? 'رمز الدعوة' : 'Invitation token'} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder={isRTL ? 'الصق الرمز الذي وصلك' : 'Paste the token you received'}
              dir="ltr"
              className="h-12 rounded-xl bg-card tech-content"
            />
            <p className="text-[11px] text-muted-foreground">
              {isRTL ? 'سنربط حسابك بالمنشأة تلقائياً بعد التحقق من البريد.' : 'We will link your account to the entity after email verification.'}
            </p>
          </div>
        )}
        {activeIntent === 'request-access' && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-primary" />
                {isRTL ? 'معرّف أو اسم مستخدم المنشأة' : 'Entity username or reference'} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={targetEntityRef}
                onChange={(e) => setTargetEntityRef(e.target.value)}
                placeholder={isRTL ? 'مثل: my-business أو USR-1000001' : 'e.g. my-business or USR-1000001'}
                dir="ltr"
                className="h-12 rounded-xl bg-card tech-content"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                {isRTL ? 'سبب الطلب (اختياري)' : 'Reason (optional)'}
              </Label>
              <Input
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                placeholder={isRTL ? 'مثل: موظف مبيعات' : 'e.g. sales staff'}
                className="h-12 rounded-xl bg-card"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isRTL ? 'سيراجع مالك المنشأة طلبك بعد إنشاء الحساب.' : 'The entity owner will review your request after signup.'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t('auth.fullname')} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <User className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '14px' }} />
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl" style={{ paddingInlineStart: '42px' }} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t('auth.email')} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Mail className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '14px' }} />
              <Input
                type="email" placeholder="example@email.com" value={email}
                onChange={(e) => { setEmail(e.target.value); clearError('email'); setEmailExists(false); }}
                onBlur={handleEmailBlur}
                dir="ltr" style={{ paddingInlineStart: '42px' }}
                className={`h-12 rounded-xl ${errors.email || emailExists ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
            </div>
            <FieldError message={errors.email} />
            {emailExists && (
              <p className="flex items-center gap-1 text-xs text-destructive mt-1 animate-fade-in">
                {isRTL ? 'هذا البريد مسجل بالفعل.' : 'This email is already registered.'}{' '}
                <button onClick={onSwitchToLogin} className="underline font-medium">
                  {isRTL ? 'تسجيل الدخول' : 'Login'}
                </button>
              </p>
            )}
            {email && !errors.email && !emailExists && (
              <p className="flex items-center gap-1 text-xs text-accent mt-1">
                <CheckCircle className="w-3 h-3" />
                {isRTL ? 'صيغة البريد صحيحة' : 'Valid email format'}
              </p>
            )}
          </div>

          <PhoneInput
            phone={phone} countryCode={countryCode}
            onPhoneChange={(v) => { setPhone(v); clearError('phone'); }}
            onCountryCodeChange={setCountryCode} isRTL={isRTL} optional
            error={errors.phone}
            onBlur={() => phone && validatePhoneField(phone)}
          />

          <PasswordField
            password={password} onChange={setPassword} label={t('auth.password')}
            showStrength isRTL={isRTL} showPassword={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
          />

          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t('auth.password.confirm')}</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 rounded-xl" />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">{isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'}</p>
            )}
          </div>

          {registerType === 'business' ? (
            <Button onClick={() => setStep('business-details')} disabled={!isFormValid} className="w-full h-12 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20" variant="hero">
              {t('auth.next')}
              <BackArrow className="w-4 h-4 ms-2 rotate-180" />
            </Button>
          ) : (
            <Button onClick={handleRegister} disabled={loading || !isFormValid} className="w-full h-12 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20" variant="hero">
              {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {loading ? t('common.loading') : (isRTL ? 'إنشاء الحساب' : 'Create account')}
            </Button>
          )}
        </div>
        <button onClick={() => setStep('type')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <BackArrow className="w-4 h-4" /> {t('auth.back')}
        </button>
      </div>
    );
  }

  // ─── Step: Business Details ───
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading font-bold text-2xl text-foreground tracking-tight">
            {isRTL ? 'بيانات المنشأة' : 'Business details'}
          </h2>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">
            {isRTL ? 'الخطوة الأخيرة' : 'Final step'}
          </span>
        </div>
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full rounded-full" style={{ width: '100%' }} />
        </div>
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'يمكنك إكمال بقية بيانات المنشأة (الموقع، القدرات، الفروع) بعد التحقق من البريد.' : 'You can complete the rest (location, capabilities, branches) after email verification.'}
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">{t('auth.business_name')} <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Building2 className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '14px' }} />
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-12 rounded-xl" style={{ paddingInlineStart: '42px' }} />
          </div>
        </div>
        <UsernamePicker
          isRTL={isRTL}
          required
          label={t('auth.business_username')}
          value={username}
          onChange={setUsername}
          onValidChange={(s) => setUsernameOk(s.isValid && s.isAvailable)}
          placeholder="my-business"
        />
        <Button onClick={handleRegister} disabled={loading || !businessName.trim() || !usernameOk} className="w-full h-12 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20" variant="hero">
          {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
          {loading ? t('common.loading') : (isRTL ? 'إنشاء حساب المنشأة' : 'Create business account')}
          {!loading && <Send className="w-4 h-4 ms-2" />}
        </Button>
      </div>
      <button onClick={() => setStep('details')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <BackArrow className="w-4 h-4" /> {t('auth.back')}
      </button>
    </div>
  );
};
