import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Building2, Phone, Globe, ChevronDown, Check, Loader2 } from 'lucide-react';

const countries = [
  { code: '+966', flag: '🇸🇦', name_ar: 'السعودية', name_en: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', name_ar: 'الإمارات', name_en: 'UAE' },
  { code: '+965', flag: '🇰🇼', name_ar: 'الكويت', name_en: 'Kuwait' },
  { code: '+973', flag: '🇧🇭', name_ar: 'البحرين', name_en: 'Bahrain' },
  { code: '+968', flag: '🇴🇲', name_ar: 'عمان', name_en: 'Oman' },
  { code: '+974', flag: '🇶🇦', name_ar: 'قطر', name_en: 'Qatar' },
  { code: '+962', flag: '🇯🇴', name_ar: 'الأردن', name_en: 'Jordan' },
  { code: '+20', flag: '🇪🇬', name_ar: 'مصر', name_en: 'Egypt' },
  { code: '+964', flag: '🇮🇶', name_ar: 'العراق', name_en: 'Iraq' },
  { code: '+961', flag: '🇱🇧', name_ar: 'لبنان', name_en: 'Lebanon' },
];

type OnboardingStep = 'account-type' | 'details' | 'phone-verify' | 'business-details';

const Onboarding = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [step, setStep] = useState<OnboardingStep>('account-type');
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (profile?.is_onboarded) {
      navigate('/');
      return;
    }
    // Pre-fill from profile or user metadata
    if (profile?.full_name) setFullName(profile.full_name);
    else if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
    if (profile?.account_type && profile.account_type !== 'individual') {
      setAccountType(profile.account_type as 'individual' | 'business');
    }
  }, [user, profile]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 7) {
      toast.error(isRTL ? 'يرجى إدخال رقم جوال صحيح' : 'Please enter a valid phone number');
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone, country_code: countryCode },
      });
      if (error) throw error;
      if (data?.success) {
        setOtpSent(true);
        setCooldown(60);
        if (data.demo_otp) {
          setDemoOtp(data.demo_otp);
        }
        toast.success(isRTL ? 'تم إرسال رمز التحقق' : 'Verification code sent');
      } else {
        throw new Error(data?.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error(isRTL ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام' : 'Please enter the 6-digit code');
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, country_code: countryCode, otp_code: otpCode },
      });
      if (error) throw error;
      if (data?.verified) {
        toast.success(isRTL ? 'تم التحقق من رقم الجوال بنجاح' : 'Phone verified successfully');
        await refreshProfile();
        if (accountType === 'business') {
          setStep('business-details');
        } else {
          await completeOnboarding();
        }
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSkipPhone = async () => {
    if (accountType === 'business') {
      setStep('business-details');
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          account_type: accountType,
          is_onboarded: true,
          ...(phone && !profile?.phone_verified ? { phone: `${countryCode}${phone}`, country_code: countryCode } : {}),
        })
        .eq('user_id', user!.id);

      if (profileError) throw profileError;

      // If business type, create business record
      if (accountType === 'business' && businessName && username) {
        const { error: bizError } = await supabase
          .from('businesses')
          .insert({
            user_id: user!.id,
            name_ar: businessName,
            username: username,
          });
        if (bizError && !bizError.message.includes('duplicate')) throw bizError;
      }

      await refreshProfile();
      toast.success(isRTL ? 'تم إكمال التسجيل بنجاح!' : 'Registration completed successfully!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessComplete = async () => {
    if (!businessName.trim()) {
      toast.error(isRTL ? 'يرجى إدخال اسم النشاط التجاري' : 'Please enter business name');
      return;
    }
    if (!username || username.length < 3) {
      toast.error(isRTL ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters');
      return;
    }
    await completeOnboarding();
  };

  const selectedCountry = countries.find(c => c.code === countryCode) || countries[0];

  // Step: Account Type
  if (step === 'account-type') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'مرحباً بك في فنيين' : 'Welcome to Faneen'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'اختر نوع حسابك للمتابعة' : 'Choose your account type to continue'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => { setAccountType('individual'); setStep('details'); }}
              className="p-6 rounded-xl border-2 border-border hover:border-gold/50 transition-all text-center group"
            >
              <User className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
              <h3 className="font-heading font-bold text-lg">
                {isRTL ? 'مستخدم عادي' : 'Regular User'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL ? 'أبحث عن مزودي خدمة وأقارن بينهم' : 'Looking for service providers'}
              </p>
            </button>
            <button
              onClick={() => { setAccountType('business'); setStep('details'); }}
              className="p-6 rounded-xl border-2 border-gold/30 bg-gold/5 hover:border-gold transition-all text-center group"
            >
              <Building2 className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
              <h3 className="font-heading font-bold text-lg">
                {isRTL ? 'مزود خدمة' : 'Service Provider'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL ? 'أعرض خدماتي ومشاريعي للعملاء' : 'Showcase my services and projects'}
              </p>
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Step: Details (name)
  if (step === 'details') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'أكمل بياناتك' : 'Complete your profile'}
            </h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'الاسم الكامل' : 'Full Name'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                  style={{ paddingInlineStart: '40px' }}
                />
              </div>
            </div>

            {/* Phone with country code */}
            <div className="space-y-2">
              <Label>
                {isRTL ? 'رقم الجوال' : 'Phone Number'}
                <span className="text-xs text-muted-foreground ms-1">({isRTL ? 'اختياري' : 'optional'})</span>
              </Label>
              <div className="flex gap-2">
                {/* Country code selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="flex items-center gap-1.5 h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors min-w-[100px]"
                  >
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="font-mono text-xs">{selectedCountry.code}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                  {showCountryPicker && (
                    <div className="absolute top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto w-56">
                      {countries.map(c => (
                        <button
                          key={c.code}
                          onClick={() => { setCountryCode(c.code); setShowCountryPicker(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${c.code === countryCode ? 'bg-accent' : ''}`}
                        >
                          <span>{c.flag}</span>
                          <span>{language === 'ar' ? c.name_ar : c.name_en}</span>
                          <span className="font-mono text-xs text-muted-foreground ms-auto">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="5XXXXXXXX"
                    dir="ltr"
                    style={{ paddingInlineStart: '40px' }}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                if (!fullName.trim()) {
                  toast.error(isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name');
                  return;
                }
                if (phone && phone.length >= 7) {
                  setStep('phone-verify');
                } else if (accountType === 'business') {
                  setStep('business-details');
                } else {
                  completeOnboarding();
                }
              }}
              disabled={!fullName.trim() || loading}
              className="w-full"
              variant="hero"
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

  // Step: Phone Verification
  if (step === 'phone-verify') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
              <Phone className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'التحقق من رقم الجوال' : 'Verify Phone Number'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? `سنرسل رمز تحقق إلى ${countryCode}${phone}`
                : `We'll send a verification code to ${countryCode}${phone}`
              }
            </p>
          </div>

          {!otpSent ? (
            <div className="space-y-4">
              <Button onClick={handleSendOtp} disabled={otpLoading} className="w-full" variant="hero">
                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {isRTL ? 'إرسال رمز التحقق' : 'Send Verification Code'}
              </Button>
              <Button onClick={handleSkipPhone} variant="ghost" className="w-full text-muted-foreground">
                {isRTL ? 'تخطي التحقق الآن' : 'Skip verification for now'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {demoOtp && (
                <div className="p-3 rounded-lg bg-gold/10 border border-gold/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isRTL ? 'رمز تجريبي (Twilio غير مربوط)' : 'Demo code (Twilio not connected)'}
                  </p>
                  <p className="font-mono text-2xl font-bold text-gold tracking-widest">{demoOtp}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>{isRTL ? 'رمز التحقق' : 'Verification Code'}</Label>
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  dir="ltr"
                  maxLength={6}
                />
              </div>
              <Button onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length !== 6} className="w-full" variant="hero">
                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Check className="w-4 h-4 me-2" />}
                {isRTL ? 'تحقق' : 'Verify'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={handleSendOtp}
                  disabled={cooldown > 0 || otpLoading}
                  className="text-gold hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0
                    ? `${isRTL ? 'إعادة الإرسال بعد' : 'Resend in'} ${cooldown}${isRTL ? ' ثانية' : 's'}`
                    : (isRTL ? 'إعادة إرسال الرمز' : 'Resend code')
                  }
                </button>
                <button onClick={handleSkipPhone} className="text-muted-foreground hover:text-foreground">
                  {isRTL ? 'تخطي' : 'Skip'}
                </button>
              </div>
            </div>
          )}

          <button onClick={() => { setStep('details'); setOtpSent(false); setOtpCode(''); setDemoOtp(null); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // Step: Business Details
  if (step === 'business-details') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'بيانات النشاط التجاري' : 'Business Details'}
            </h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'اسم النشاط التجاري' : 'Business Name'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Building2 className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={isRTL ? 'مثال: مؤسسة الخليج للألمنيوم' : 'e.g. Gulf Aluminum Co.'}
                  style={{ paddingInlineStart: '40px' }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'اسم المستخدم (رابط الصفحة)' : 'Username (page URL)'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Globe className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="my-business"
                  dir="ltr"
                  style={{ paddingInlineStart: '40px' }}
                />
              </div>
              {username && (
                <p className="text-xs text-muted-foreground">faneen.com/{username}</p>
              )}
            </div>
            <Button
              onClick={handleBusinessComplete}
              disabled={loading || !businessName.trim() || username.length < 3}
              className="w-full"
              variant="hero"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {isRTL ? 'إتمام التسجيل' : 'Complete Registration'}
            </Button>
          </div>
          <button onClick={() => setStep('phone-verify')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return null;
};

export default Onboarding;
