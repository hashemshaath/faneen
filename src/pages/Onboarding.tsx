import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService, useOtpFlow, countryCodes } from '@/services/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { User, Building2, Phone, Globe, Check, Loader2, CheckCircle2, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { track } from '@/lib/analytics-events';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SectorPicker } from '@/components/onboarding/SectorPicker';
import type { SectorId } from '@/data/onboarding-sectors';
import { supabase } from '@/integrations/supabase/client';
import { updateOnboardingProgress } from '@/modules/users';
import {
  readDraft,
  saveDraft,
  clearDraft,
  pullRemoteDraft,
  syncDraftToServer,
} from '@/lib/onboarding-draft';

type OnboardingStep =
  | 'account-type'
  | 'details'
  | 'phone-verify'
  | 'business-details'
  | 'business-sectors'
  | 'summary';

const STEP_ORDER: OnboardingStep[] = [
  'account-type',
  'details',
  'phone-verify',
  'business-details',
  'business-sectors',
  'summary',
];

const Onboarding = () => {
  const { t, language, isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'إعداد الحساب' : 'Account Setup', noindex: true });
  const navigate = useNavigate();
  const { user, profile, refreshProfile, isAdmin, isSuperAdmin } = useAuth();
  const { getTargetRoute } = useRoleRedirect();

  const [step, setStep] = useState<OnboardingStep>('account-type');
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [sectors, setSectors] = useState<SectorId[]>([]);
  const [subServices, setSubServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Persist draft on every relevant change
  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft({
      step, accountType, fullName, phone, countryCode,
      businessName, username,
      description: businessDescription,
      sectors, subServices,
    });
    if (user?.id) void syncDraftToServer(user.id);
  }, [step, accountType, fullName, phone, countryCode, businessName, username,
      businessDescription, sectors, subServices, draftLoaded, user?.id]);

  // Track step views (no PII) + persist current step index to profile
  useEffect(() => {
    if (!draftLoaded) return;
    const idx = STEP_ORDER.indexOf(step);
    track.onboardingStepViewed({ onboarding_step: step, account_type: accountType });
    if (user?.id) {
      void updateOnboardingProgress({
        userId: user.id,
        values: {
          onboarding_step: idx,
          onboarding_started_at: new Date().toISOString(),
        },
      });
    }
  }, [step, draftLoaded, accountType, user?.id]);

  const otp = useOtpFlow({
    isRTL,
    onSendOtp: () => authService.sendOtp(phone, countryCode),
    onVerifyOtp: async (code) => {
      const data = await authService.verifyOtp(phone, countryCode, code);
      if (!data?.verified) throw new Error(data?.error || 'Verification failed');
      toast.success(isRTL ? 'تم التحقق من رقم الجوال بنجاح' : 'Phone verified successfully');
      await refreshProfile();
      if (accountType === 'business') {
        setStep('business-details');
      } else {
        await completeOnboarding();
      }
    },
  });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    // Admins bypass onboarding entirely.
    if (isAdmin || isSuperAdmin) { navigate(getTargetRoute(), { replace: true }); return; }
    // Existing individual accounts do not need business onboarding.
    if (profile?.account_type === 'individual') { navigate('/dashboard', { replace: true }); return; }
    // Allow the user to stay on the post-completion summary screen even
    // after `is_onboarded` flips true (refreshProfile fires before redirect).
    if (profile?.is_onboarded && step !== 'summary') { navigate(getTargetRoute()); return; }
    let cancelled = false;
    (async () => {
      const draft = await pullRemoteDraft(user.id);
      const local = readDraft();
      const d = { ...local, ...draft };
      if (cancelled) return;
      // Profile takes precedence for identity fields
      if (profile?.full_name) setFullName(profile.full_name);
      else if (d.fullName) setFullName(d.fullName);
      else if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
      // Profile is the source of truth for account_type. Only fall back to
      // the local/remote draft when the profile has no value yet.
      const effectiveAccountType: 'individual' | 'business' =
        (profile?.account_type as 'individual' | 'business' | undefined) ??
        (d.accountType as 'individual' | 'business' | undefined) ??
        'individual';
      setAccountType(effectiveAccountType);
      if (d.phone) setPhone(d.phone);
      if (d.countryCode) setCountryCode(d.countryCode);
      if (d.businessName) setBusinessName(d.businessName);
      if (d.username) setUsername(d.username);
      if (d.description) setBusinessDescription(d.description);
      if (d.sectors?.length) setSectors(d.sectors as SectorId[]);
      if (d.subServices?.length) setSubServices(d.subServices);
      if (d.step && STEP_ORDER.includes(d.step as OnboardingStep)) {
        const draftStep = d.step as OnboardingStep;
        // Never resume on business-only steps when the account is individual —
        // prevents a stale draft from a previous session forcing the provider flow.
        const isBusinessOnlyStep =
          draftStep === 'business-details' || draftStep === 'business-sectors';
      if (effectiveAccountType === 'individual' && isBusinessOnlyStep) {
          clearDraft();
          setStep('details');
        } else {
          setStep(draftStep);
        }
      }
      setDraftLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, isAdmin, isSuperAdmin, getTargetRoute, navigate]);

  // Completion percentage for the header progress bar
  const completionPct = useMemo(() => {
    let total = 3; // account type, full name, account creation
    let done = 1; // account type implicit
    if (fullName.trim()) done++;
    if (accountType === 'business') {
      total += 4; // name, username, description, sectors
      if (businessName.trim()) done++;
      if (username.length >= 3) done++;
      if (businessDescription.trim()) done++;
      if (sectors.length > 0) done++;
    }
    if (phone && phone.length >= 7) { total += 1; done += 1; }
    return Math.min(100, Math.round((done / total) * 100));
  }, [fullName, accountType, businessName, username, businessDescription, sectors, phone]);

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await authService.updateProfile(user!.id, {
        full_name: fullName,
        account_type: accountType,
        is_onboarded: true,
        ...(phone && !profile?.phone_verified ? { phone: `${countryCode}${phone}`, country_code: countryCode } : {}),
      });

      if (accountType === 'business' && businessName && username) {
        await authService.createBusiness(user!.id, businessName, username, {
          sectors,
          sub_services: subServices,
          description_ar: businessDescription || undefined,
          recipientEmail: user?.email || undefined,
        });
      }

      await refreshProfile();
      clearDraft();
      // provider_signup_submit fires only when a business profile is created.
      if (accountType === 'business') {
        track.providerSignupSubmit({});
      }
      track.onboardingCompleted({ account_type: accountType });
      toast.success(isRTL ? 'تم حفظ بيانات منشأتك' : 'Your business profile is saved');

      if (accountType === 'business') {
        // Show end-of-onboarding summary instead of redirecting immediately.
        setStep('summary');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const fallback = isRTL
        ? 'تعذّر إكمال التسجيل. يرجى المحاولة مرة أخرى.'
        : 'Could not complete registration. Please try again.';
      toast.error(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPhone = async () => {
    if (accountType === 'business') setStep('business-details');
    else await completeOnboarding();
  };

  const handlePhoneSend = async () => {
    if (!phone || phone.length < 7) {
      toast.error(isRTL ? 'يرجى إدخال رقم جوال صحيح' : 'Please enter a valid phone number');
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

  if (isAdmin || isSuperAdmin) {
    return <Navigate to={getTargetRoute()} replace />;
  }

  if (step === 'account-type') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{isRTL ? 'مرحباً بك في قِطاعات' : 'Welcome to Qitaat'}</h2>
            <p className="text-sm text-muted-foreground">{isRTL ? 'اختر نوع حسابك للمتابعة' : 'Choose your account type to continue'}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => { setAccountType('individual'); setStep('details'); }}
              className="p-6 rounded-xl border-2 border-border hover:border-gold/50 transition-all text-center group">
              <User className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
              <h3 className="font-heading font-bold text-lg">{isRTL ? 'مستخدم عادي' : 'Regular User'}</h3>
              <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'أبحث عن مزودي خدمة وأقارن بينهم' : 'Looking for service providers'}</p>
            </button>
            <button onClick={() => { setAccountType('business'); setStep('details'); }}
              className="p-6 rounded-xl border-2 border-gold/30 bg-gold/5 hover:border-gold transition-all text-center group">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
              <h3 className="font-heading font-bold text-lg">{isRTL ? 'مزود خدمة' : 'Service Provider'}</h3>
              <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'أعرض خدماتي ومشاريعي للعملاء' : 'Showcase my services and projects'}</p>
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'details') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{isRTL ? 'أكمل بياناتك' : 'Complete your profile'}</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'الاسم الكامل' : 'Full Name'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'} style={{ paddingInlineStart: '40px' }} />
              </div>
            </div>
            <PhoneInput phone={phone} countryCode={countryCode} onPhoneChange={setPhone} onCountryCodeChange={setCountryCode} isRTL={isRTL} optional />
            <Button
              onClick={() => {
                if (!fullName.trim()) { toast.error(isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name'); return; }
                if (phone && phone.length >= 7) setStep('phone-verify');
                else if (accountType === 'business') setStep('business-details');
                else completeOnboarding();
              }}
              disabled={!fullName.trim() || loading} className="w-full" variant="hero"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {isRTL ? 'متابعة' : 'Continue'}
            </Button>
          </div>
          <button onClick={() => setStep('account-type')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'phone-verify') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
              <Phone className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">{isRTL ? 'التحقق من رقم الجوال' : 'Verify Phone Number'}</h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? `سنرسل رمز تحقق إلى ${countryCode}${phone}` : `We'll send a verification code to ${countryCode}${phone}`}
            </p>
          </div>
          {!otp.otpStep ? (
            <div className="space-y-4">
              <Button onClick={handlePhoneSend} disabled={otp.loading} className="w-full" variant="hero">
                {otp.loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {isRTL ? 'إرسال رمز التحقق' : 'Send Verification Code'}
              </Button>
              <Button onClick={handleSkipPhone} variant="ghost" className="w-full text-muted-foreground">
                {isRTL ? 'تخطي التحقق الآن' : 'Skip verification for now'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {otp.demoOtp && (
                <div className="p-3 rounded-lg bg-gold/10 border border-gold/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'رمز تجريبي (Twilio غير مربوط)' : 'Demo code (Twilio not connected)'}</p>
                  <p className="font-mono text-2xl font-bold text-gold tracking-widest">{otp.demoOtp}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>{isRTL ? 'رمز التحقق' : 'Verification Code'}</Label>
                <Input value={otp.otpCode} onChange={(e) => otp.setCode(e.target.value)} placeholder="000000" className="text-center text-2xl tracking-[0.5em] font-mono" dir="ltr" maxLength={6} />
              </div>
              <Button onClick={handlePhoneVerify} disabled={otp.loading || otp.otpCode.length !== 6} className="w-full" variant="hero">
                {otp.loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Check className="w-4 h-4 me-2" />}
                {isRTL ? 'تحقق' : 'Verify'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button onClick={handlePhoneSend} disabled={otp.cooldown > 0 || otp.loading} className="text-gold hover:underline disabled:text-muted-foreground">
                  {otp.cooldown > 0 ? `${isRTL ? 'إعادة الإرسال بعد' : 'Resend in'} ${otp.cooldown}${isRTL ? ' ثانية' : 's'}` : (isRTL ? 'إعادة إرسال الرمز' : 'Resend code')}
                </button>
                <button onClick={handleSkipPhone} className="text-muted-foreground hover:text-foreground">{isRTL ? 'تخطي' : 'Skip'}</button>
              </div>
            </div>
          )}
          <button onClick={() => { setStep('details'); otp.resetOtp(); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'business-details') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground text-center">
              {isRTL ? 'بيانات النشاط التجاري' : 'Business Details'}
            </h2>
            <Progress value={completionPct} className="h-1.5" />
            <p
              className="text-center text-xs text-muted-foreground tech-content"
              role="status"
              aria-live="polite"
            >
              {completionPct}% — {isRTL ? 'يمكنك الحفظ والمتابعة لاحقاً' : 'You can save and continue later'}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'اسم النشاط التجاري' : 'Business Name'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Building2 className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} dir="auto" style={{ paddingInlineStart: '40px' }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'اسم المستخدم' : 'Username'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Globe className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="my-business" dir="ltr" style={{ paddingInlineStart: '40px' }} />
              </div>
              {username && (
                <p className="text-xs text-muted-foreground tech-content">
                  qitaat.com/{username} · {isRTL ? 'بانتظار موافقة الإدارة قبل النشر' : 'Pending admin approval before publishing'}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'وصف مختصر للنشاط' : 'Short business description'}</Label>
              <Textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value.slice(0, 500))}
                placeholder={isRTL ? 'مثال: مصنع ألمنيوم متخصص في الواجهات والنوافذ' : 'e.g. Aluminum factory specializing in facades and windows'}
                rows={3}
                dir="auto"
              />
              <p className="text-[11px] text-muted-foreground tech-content text-end">{businessDescription.length}/500</p>
            </div>
            <Button onClick={() => {
              if (!businessName.trim()) { toast.error(isRTL ? 'يرجى إدخال اسم النشاط' : 'Please enter business name'); return; }
              if (!username || username.length < 3) { toast.error(isRTL ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters'); return; }
              setStep('business-sectors');
            }} disabled={!businessName.trim() || !username || username.length < 3} className="w-full" variant="hero">
              {isRTL ? 'متابعة' : 'Continue'}
            </Button>
          </div>
          <button onClick={() => setStep(phone ? 'phone-verify' : 'details')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // Final business step: sector picker + sub-services
  if (step === 'summary') {
    // Required-fields readiness for the post-completion guidance line.
    const missing: { ar: string; en: string }[] = [];
    if (!businessDescription.trim()) missing.push({ ar: 'وصف النشاط', en: 'Description' });
    if (sectors.length === 0) missing.push({ ar: 'القطاعات', en: 'Sectors' });
    if (!phone) missing.push({ ar: 'رقم التواصل', en: 'Phone' });
    const readyToSubmit = completionPct >= 50 && missing.length === 0;
    const Arrow = isRTL ? ArrowLeft : ArrowRight;

    return (
      <AuthLayout>
        <div className="space-y-6" role="status" aria-live="polite">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'تم حفظ بيانات منشأتك' : 'Your business profile is saved'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'يمكنك إكمال أي بيانات ناقصة من لوحة التحكم ثم إرسال الملف للمراجعة.'
                : 'You can complete any remaining fields from the dashboard, then submit your profile for review.'}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isRTL ? 'نسبة الإكمال' : 'Completion'}
              </span>
              <span className="tech-content font-bold text-foreground">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2" />

            {readyToSubmit ? (
              <p className="text-xs text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isRTL
                  ? 'يمكنك الآن إرسال الملف للمراجعة من لوحة التحكم.'
                  : 'You can now submit your profile for review from the dashboard.'}
              </p>
            ) : missing.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'بيانات يُنصح بإكمالها لزيادة فرص الظهور:' : 'Fields to complete for better visibility:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.slice(0, 4).map((m) => (
                    <span key={m.en} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[11px]">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      {isRTL ? m.ar : m.en}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">
              {isRTL ? 'ماذا يحدث بعد ذلك؟' : "What happens next?"}
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>{isRTL ? 'يبقى ملفك كمسودة حتى تُرسله للمراجعة.' : 'Your profile stays as a draft until you submit it.'}</li>
              <li>{isRTL ? 'بعد الإرسال يقوم الفريق بمراجعته خلال فترة قصيرة.' : 'After submission, our team reviews it shortly.'}</li>
              <li>{isRTL ? 'سيظهر ملفك للجمهور بعد الموافقة.' : 'Your profile becomes public after approval.'}</li>
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/settings')}
              className="text-sm"
            >
              {isRTL ? 'إكمال البيانات الآن' : 'Complete fields now'}
            </Button>
            <Button
              variant="hero"
              className="sm:w-72"
              onClick={() => navigate(readyToSubmit ? '/dashboard#provider-readiness' : '/dashboard')}
            >
              {readyToSubmit
                ? (isRTL ? 'الانتقال للمراجعة' : 'Go to review')
                : (isRTL ? 'الذهاب إلى لوحة التحكم' : 'Go to dashboard')}
              <Arrow className="w-4 h-4 ms-1" />
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Final business step: sector picker + sub-services
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-heading font-bold text-2xl text-foreground text-center">
            {isRTL ? 'القطاعات والخدمات' : 'Sectors & Services'}
          </h2>
          <Progress value={completionPct} className="h-1.5" />
          <p
            className="text-center text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {isRTL
              ? 'اختر القطاع/القطاعات والخدمات الفرعية التي يقدمها نشاطك'
              : 'Pick the sectors and sub-services your business operates in'}
          </p>
        </div>

        <SectorPicker
          selectedSectors={sectors}
          selectedSubServices={subServices}
          onSectorsChange={setSectors}
          onSubServicesChange={setSubServices}
          maxSectors={5}
        />

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          {isRTL
            ? 'لن يظهر ملفك للجمهور إلا بعد مراجعة الإدارة والموافقة. يمكنك الحفظ والعودة لاحقاً في أي وقت.'
            : 'Your profile will not be public until an admin reviews and approves it. You can save and continue later anytime.'}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => setStep('business-details')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isRTL ? '→ رجوع' : '← Back'}
          </button>
          <Button
            onClick={completeOnboarding}
            disabled={loading || sectors.length === 0}
            variant="hero"
            className="sm:w-64"
            aria-label={isRTL ? 'إنشاء الحساب وحفظ كمسودة' : 'Create account and save as draft'}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
            {isRTL ? 'إنشاء الحساب وحفظ كمسودة' : 'Create account & save as draft'}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Onboarding;
