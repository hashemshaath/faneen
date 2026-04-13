import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService, useOtpFlow, countryCodes } from '@/services/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Building2, Phone, Globe, Check, Loader2 } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';

type OnboardingStep = 'account-type' | 'details' | 'phone-verify' | 'business-details';

const Onboarding = () => {
  const { t, language, isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'إعداد الحساب' : 'Account Setup', noindex: true });
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { getTargetRoute } = useRoleRedirect();

  const [step, setStep] = useState<OnboardingStep>('account-type');
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (profile?.is_onboarded) { navigate(getTargetRoute()); return; }
    if (profile?.full_name) setFullName(profile.full_name);
    else if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
    if (profile?.account_type && profile.account_type !== 'individual') {
      setAccountType(profile.account_type as 'individual' | 'business');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

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
        await authService.createBusiness(user!.id, businessName, username);
      }

      await refreshProfile();
      toast.success(isRTL ? 'تم إكمال التسجيل بنجاح!' : 'Registration completed successfully!');
      
      // Role-based redirect after onboarding
      if (accountType === 'business') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
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

  if (step === 'account-type') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{isRTL ? 'مرحباً بك في فنيين' : 'Welcome to Faneen'}</h2>
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

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-heading font-bold text-2xl text-foreground">{isRTL ? 'بيانات النشاط التجاري' : 'Business Details'}</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{isRTL ? 'اسم النشاط التجاري' : 'Business Name'} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Building2 className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={{ paddingInlineStart: '40px' }} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? 'اسم المستخدم' : 'Username'} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Globe className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="my-business" dir="ltr" style={{ paddingInlineStart: '40px' }} />
            </div>
            {username && <p className="text-xs text-muted-foreground">faneen.com/{username}</p>}
          </div>
          <Button onClick={async () => {
            if (!businessName.trim()) { toast.error(isRTL ? 'يرجى إدخال اسم النشاط' : 'Please enter business name'); return; }
            if (!username || username.length < 3) { toast.error(isRTL ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters'); return; }
            await completeOnboarding();
          }} disabled={loading || !businessName.trim() || !username || username.length < 3} className="w-full" variant="hero">
            {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
            {isRTL ? 'إنشاء الحساب' : 'Create Account'}
          </Button>
        </div>
        <button onClick={() => setStep(phone ? 'phone-verify' : 'details')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
        </button>
      </div>
    </AuthLayout>
  );
};

export default Onboarding;
