import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { checkPasswordStrength, validatePhone, validateEmail, validateUsername } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Phone, Mail, Lock, User, Building2, Globe, Loader2, Shield, ChevronDown } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'email-sent';
type LoginMethod = 'phone' | 'email';
type RegisterType = 'individual' | 'business';
type RegisterStep = 'type' | 'details' | 'business-details';

const countryCodes = [
  { code: '+966', flag: '🇸🇦', name_ar: 'السعودية', name_en: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', name_ar: 'الإمارات', name_en: 'UAE' },
  { code: '+965', flag: '🇰🇼', name_ar: 'الكويت', name_en: 'Kuwait' },
  { code: '+973', flag: '🇧🇭', name_ar: 'البحرين', name_en: 'Bahrain' },
  { code: '+968', flag: '🇴🇲', name_ar: 'عمان', name_en: 'Oman' },
  { code: '+974', flag: '🇶🇦', name_ar: 'قطر', name_en: 'Qatar' },
  { code: '+962', flag: '🇯🇴', name_ar: 'الأردن', name_en: 'Jordan' },
  { code: '+20', flag: '🇪🇬', name_ar: 'مصر', name_en: 'Egypt' },
];

const Auth = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [registerType, setRegisterType] = useState<RegisterType>('individual');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('type');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Phone OTP login state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const passwordStrength = checkPasswordStrength(password);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(isRTL ? 'فشل تسجيل الدخول بحساب Google' : 'Google sign-in failed');
        return;
      }
      if (result.redirected) return;
      toast.success(t('common.success'));
      navigate('/onboarding');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast.error(isRTL ? 'يرجى إدخال البريد وكلمة المرور' : 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(t('common.success'));
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSendOtp = async () => {
    if (!phone || phone.length < 7) {
      toast.error(isRTL ? 'أدخل رقم جوال صحيح' : 'Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      // First, we need to find the user by phone and send OTP
      // For now, use signInWithOtp via phone (Supabase phone auth)
      // Since we're using custom OTP, we'll look up the user by phone first
      const fullPhone = `${countryCode}${phone.replace(/^0/, '')}`;
      
      // Check if a profile with this phone exists
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('phone', fullPhone)
        .eq('phone_verified', true)
        .limit(1)
        .single();
      
      if (!profileData) {
        toast.error(isRTL ? 'لم يتم العثور على حساب بهذا الرقم. يرجى التسجيل أولاً أو استخدام البريد الإلكتروني' : 'No account found with this number. Please register first or use email');
        setLoading(false);
        return;
      }

      // We found the user, now we need their email to login
      // Store it temporarily for OTP verification
      setEmail(profileData.email || '');
      
      // Generate a simple OTP and show it (demo mode)
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      setDemoOtp(otp);
      setOtpStep(true);
      setCooldown(60);
      toast.success(isRTL ? 'تم إرسال رمز التحقق' : 'Verification code sent');
    } catch (err: any) {
      toast.error(isRTL ? 'لم يتم العثور على حساب بهذا الرقم' : 'No account found with this number');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error(isRTL ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter 6-digit code');
      return;
    }
    if (demoOtp && otpCode !== demoOtp) {
      toast.error(isRTL ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
      return;
    }
    setLoading(true);
    try {
      // In demo mode, we'll ask for password to login via email
      // In production, this would use a passwordless flow
      toast.success(isRTL ? 'تم التحقق! أدخل كلمة المرور لإكمال تسجيل الدخول' : 'Verified! Enter password to complete login');
      setLoginMethod('email');
      setOtpStep(false);
      setDemoOtp(null);
      setOtpCode('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !validateEmail(email)) {
      toast.error(isRTL ? 'البريد الإلكتروني غير صحيح' : 'Invalid email');
      return;
    }
    if (phone && !validatePhone(phone)) {
      toast.error(isRTL ? 'رقم الجوال غير صحيح' : 'Invalid phone number');
      return;
    }
    if (passwordStrength.score < 2) {
      toast.error(isRTL ? 'كلمة المرور ضعيفة جداً' : 'Password is too weak');
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (registerType === 'business' && !validateUsername(username)) {
      toast.error(isRTL ? 'اسم المستخدم غير صحيح (3-50 حرف، أحرف إنجليزية وأرقام فقط)' : 'Invalid username (3-50 chars, alphanumeric only)');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            account_type: registerType,
            phone: phone ? `${countryCode}${phone.replace(/^0/, '')}` : '',
          },
        },
      });
      if (error) throw error;
      setMode('email-sent');
      toast.success(isRTL ? 'تم إرسال رابط التحقق إلى بريدك الإلكتروني' : 'Verification link sent to your email');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !validateEmail(email)) {
      toast.error(isRTL ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(t('auth.reset_sent'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = t(`auth.password.${passwordStrength.label}` as any);

  const renderPasswordStrength = () => {
    if (!password) return null;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('auth.password_strength')}</span>
          <span className="font-medium">{strengthLabel}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${passwordStrength.percentage}%`,
              backgroundColor: passwordStrength.score <= 1 ? 'hsl(var(--destructive))' : passwordStrength.score === 2 ? 'hsl(var(--gold))' : 'hsl(142, 76%, 36%)',
            }}
          />
        </div>
      </div>
    );
  };

  // ─── LOGIN ───────────────────────────────────────────
  if (mode === 'login') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'مرحباً بعودتك' : 'Welcome back'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'سجّل دخولك للوصول إلى حسابك' : 'Sign in to access your account'}
            </p>
          </div>

          {/* Login method tabs */}
          <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
            <button
              onClick={() => { setLoginMethod('phone'); setOtpStep(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'phone'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Phone className="w-4 h-4" />
              {isRTL ? 'رقم الجوال' : 'Phone'}
            </button>
            <button
              onClick={() => { setLoginMethod('email'); setOtpStep(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'email'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail className="w-4 h-4" />
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </button>
          </div>

          {/* Phone login */}
          {loginMethod === 'phone' && !otpStep && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label>{isRTL ? 'رقم الجوال' : 'Phone Number'}</Label>
                <div className="flex gap-2" dir="ltr">
                  <div className="relative">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="appearance-none h-10 w-[100px] rounded-lg border border-input bg-background px-3 pe-7 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {countryCodes.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute end-2 top-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="5XXXXXXXX"
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
              </div>

              <Button onClick={handlePhoneSendOtp} disabled={loading} className="w-full h-11" variant="hero">
                {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {isRTL ? 'إرسال رمز التحقق' : 'Send Verification Code'}
              </Button>
            </div>
          )}

          {/* Phone OTP step */}
          {loginMethod === 'phone' && otpStep && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label>{isRTL ? 'رمز التحقق' : 'Verification Code'}</Label>
                <Input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  dir="ltr"
                  className="text-center text-xl tracking-[0.5em] font-mono h-12"
                  maxLength={6}
                />
              </div>

              {/* Demo OTP */}
              {demoOtp && (
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/30">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {isRTL ? '⚠️ الكود المؤقت (لحين تفعيل الرسائل النصية):' : '⚠️ Temp code (until SMS activated):'}
                  </p>
                  <p className="text-center text-2xl font-mono font-bold text-accent tracking-[0.3em]">
                    {demoOtp}
                  </p>
                </div>
              )}

              <Button onClick={handlePhoneVerifyOtp} disabled={loading || otpCode.length !== 6} className="w-full h-11" variant="hero">
                {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {isRTL ? 'تحقق وسجّل الدخول' : 'Verify & Sign In'}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button onClick={() => { setOtpStep(false); setOtpCode(''); setDemoOtp(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  {isRTL ? '← تغيير الرقم' : '← Change number'}
                </button>
                <button
                  onClick={handlePhoneSendOtp}
                  disabled={cooldown > 0 || loading}
                  className="text-accent hover:underline disabled:opacity-50"
                >
                  {cooldown > 0
                    ? (isRTL ? `إعادة الإرسال (${cooldown}ث)` : `Resend (${cooldown}s)`)
                    : (isRTL ? 'إعادة إرسال الرمز' : 'Resend code')
                  }
                </button>
              </div>
            </div>
          )}

          {/* Email login */}
          {loginMethod === 'email' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label>{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('auth.password')}</Label>
                  <button onClick={() => setMode('forgot-password')} className="text-xs text-accent hover:underline">
                    {t('auth.forgot')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 text-muted-foreground hover:text-foreground transition-colors" style={{ [isRTL ? 'left' : 'right']: '12px' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleEmailLogin} disabled={loading} className="w-full h-11" variant="hero">
                {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {loading ? t('common.loading') : t('auth.login')}
              </Button>
            </div>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">{isRTL ? 'أو' : 'or'}</span>
            </div>
          </div>

          {/* Google */}
          <Button onClick={handleGoogleLogin} disabled={googleLoading} variant="outline" className="w-full h-11 gap-2.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? 'الدخول بحساب Google' : 'Continue with Google')}
          </Button>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
              <button onClick={() => { setMode('register'); setRegisterStep('type'); }} className="text-accent font-medium hover:underline">
                {t('auth.no_account')}
              </button>
            </p>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            {isRTL ? 'اتصال آمن ومشفر' : 'Secure & encrypted connection'}
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ─── EMAIL SENT ──────────────────────────────────────
  if (mode === 'email-sent') {
    return (
      <AuthLayout>
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {isRTL
                ? `أرسلنا رابط التحقق إلى ${email}. يرجى فتح بريدك والنقر على الرابط لتأكيد حسابك.`
                : `We sent a verification link to ${email}. Please open your email and click the link.`}
            </p>
          </div>
          <Button onClick={() => setMode('login')} className="w-full h-11" variant="hero">
            {isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'لم يصلك البريد؟ تحقق من مجلد الرسائل غير المرغوب فيها' : "Didn't receive it? Check your spam folder"}
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ─── FORGOT PASSWORD ─────────────────────────────────
  if (mode === 'forgot-password') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.reset_password')}</h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين' : 'Enter your email and we will send a reset link'}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }} />
              </div>
            </div>
            <Button onClick={handleForgotPassword} disabled={loading} className="w-full h-11" variant="hero">
              {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {loading ? t('common.loading') : t('auth.reset_password')}
            </Button>
          </div>
          <button onClick={() => setMode('login')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <BackArrow className="w-4 h-4" />
            {t('auth.back')}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ─── REGISTER ────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="space-y-6">
        {registerStep === 'type' && (
          <>
            <div className="space-y-2">
              <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.register')}</h2>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'اختر نوع الحساب المناسب لك' : 'Choose the right account type'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => { setRegisterType('individual'); setRegisterStep('details'); }}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-accent/50 bg-card hover:bg-accent/5 transition-all text-start group"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors shrink-0">
                  <User className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm">{t('auth.register_individual')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('membership.individual.desc')}</p>
                </div>
              </button>
              <button
                onClick={() => { setRegisterType('business'); setRegisterStep('details'); }}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-accent/30 bg-accent/5 hover:border-accent hover:bg-accent/10 transition-all text-start group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm">{t('auth.register_business')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('membership.business.desc')}</p>
                </div>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-3 text-muted-foreground">{isRTL ? 'أو' : 'or'}</span></div>
            </div>

            <Button onClick={handleGoogleLogin} disabled={googleLoading} variant="outline" className="w-full h-11 gap-2.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? 'التسجيل بحساب Google' : 'Sign up with Google')}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">{isRTL ? 'لديك حساب؟' : 'Have an account?'} </span>
              <button onClick={() => setMode('login')} className="text-accent font-medium hover:underline">{t('auth.has_account')}</button>
            </div>
          </>
        )}

        {registerStep === 'details' && (
          <>
            <div className="space-y-2">
              <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.register')}</h2>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'أدخل بياناتك لإنشاء حسابك' : 'Enter your details to create an account'}
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth.fullname')}</Label>
                <div className="relative">
                  <User className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ paddingInlineStart: '40px' }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.email')} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.phone')} <span className="text-xs text-muted-foreground ms-1">({isRTL ? 'اختياري' : 'optional'})</span></Label>
                <div className="flex gap-2" dir="ltr">
                  <div className="relative">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="appearance-none h-10 w-[100px] rounded-lg border border-input bg-background px-3 pe-7 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {countryCodes.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute end-2 top-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                  <Input
                    type="tel"
                    placeholder="5XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 text-muted-foreground hover:text-foreground transition-colors" style={{ [isRTL ? 'left' : 'right']: '12px' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {renderPasswordStrength()}
              </div>
              <div className="space-y-2">
                <Label>{t('auth.password.confirm')}</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">{isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'}</p>
                )}
              </div>
              {registerType === 'business' ? (
                <Button onClick={() => setRegisterStep('business-details')} disabled={!email || !fullName || passwordStrength.score < 2 || password !== confirmPassword} className="w-full h-11" variant="hero">
                  {t('auth.next')}
                </Button>
              ) : (
                <Button onClick={handleRegister} disabled={loading || !email || !fullName || passwordStrength.score < 2 || password !== confirmPassword} className="w-full h-11" variant="hero">
                  {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                  {loading ? t('common.loading') : t('auth.submit')}
                </Button>
              )}
            </div>
            <button onClick={() => setRegisterStep('type')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <BackArrow className="w-4 h-4" />
              {t('auth.back')}
            </button>
          </>
        )}

        {registerStep === 'business-details' && (
          <>
            <div className="space-y-2">
              <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.register_business')}</h2>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'أدخل بيانات نشاطك التجاري' : 'Enter your business details'}
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth.business_name')}</Label>
                <div className="relative">
                  <Building2 className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={{ paddingInlineStart: '40px' }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.business_username')}</Label>
                <div className="relative">
                  <Globe className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="my-business" dir="ltr" style={{ paddingInlineStart: '40px' }} />
                </div>
                {username && <p className="text-xs text-muted-foreground">faneen.com/{username}</p>}
                {username && !validateUsername(username) && (
                  <p className="text-xs text-destructive">{isRTL ? 'اسم المستخدم غير صحيح (3-50 حرف)' : 'Invalid username (3-50 chars)'}</p>
                )}
              </div>
              <Button onClick={handleRegister} disabled={loading || !businessName || !validateUsername(username)} className="w-full h-11" variant="hero">
                {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {loading ? t('common.loading') : t('auth.submit')}
              </Button>
            </div>
            <button onClick={() => setRegisterStep('details')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <BackArrow className="w-4 h-4" />
              {t('auth.back')}
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default Auth;
