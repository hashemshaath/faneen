import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { checkPasswordStrength, validatePhone, validateEmail, validateUsername } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Phone, Mail, Lock, User, Building2, Globe } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'verify-otp' | 'forgot-password';
type RegisterType = 'individual' | 'business';
type RegisterStep = 'type' | 'phone' | 'otp' | 'details' | 'business-details';

const Auth = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [registerType, setRegisterType] = useState<RegisterType>('individual');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('type');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');

  const passwordStrength = checkPasswordStrength(password);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const handlePhoneLogin = async () => {
    if (!validatePhone(phone)) {
      toast.error(isRTL ? 'رقم الجوال غير صحيح' : 'Invalid phone number');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+966${phone.replace(/^0/, '')}`,
      });
      if (error) throw error;
      setMode('verify-otp');
      toast.success(t('auth.otp_sent'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+966${phone.replace(/^0/, '')}`,
        token: otpCode,
        type: 'sms',
      });
      if (error) throw error;
      toast.success(t('common.success'));
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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

  const handleRegister = async () => {
    if (!validatePhone(phone)) {
      toast.error(isRTL ? 'رقم الجوال غير صحيح' : 'Invalid phone number');
      return;
    }
    if (email && !validateEmail(email)) {
      toast.error(isRTL ? 'البريد الإلكتروني غير صحيح' : 'Invalid email');
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
        phone: `+966${phone.replace(/^0/, '')}`,
        password,
        options: {
          data: {
            full_name: fullName,
            account_type: registerType,
            email,
          },
        },
      });
      if (error) throw error;
      setRegisterStep('otp');
      toast.success(t('auth.otp_sent'));
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

  // LOGIN MODE
  if (mode === 'login') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.login')}</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.phone')}</Label>
              <div className="relative">
                <Phone className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <div className="absolute top-2.5 text-sm text-muted-foreground font-mono" style={{ [isRTL ? 'right' : 'left']: '36px' }}>+966</div>
                <Input
                  type="tel"
                  placeholder={t('auth.phone.placeholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="text-left dir-ltr"
                  style={{ paddingInlineStart: '88px' }}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3 text-muted-foreground"
                  style={{ [isRTL ? 'left' : 'right']: '12px' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button onClick={handleEmailLogin} disabled={loading} className="w-full" variant="hero">
              {loading ? t('common.loading') : t('auth.login')}
            </Button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{isRTL ? 'أو' : 'or'}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button onClick={handlePhoneLogin} disabled={loading} variant="outline" className="w-full">
              <Phone className="w-4 h-4" />
              {isRTL ? 'دخول برمز الجوال' : 'Login with Phone OTP'}
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button onClick={() => setMode('forgot-password')} className="text-gold hover:underline">
              {t('auth.forgot')}
            </button>
            <button onClick={() => { setMode('register'); setRegisterStep('type'); }} className="text-gold hover:underline">
              {t('auth.no_account')}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // VERIFY OTP MODE
  if (mode === 'verify-otp' || registerStep === 'otp') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.verify_phone')}</h2>
            <p className="text-sm text-muted-foreground">{t('auth.otp_sent')} +966{phone}</p>
          </div>

          <div className="space-y-4">
            <Input
              type="text"
              placeholder={t('auth.otp_code')}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              dir="ltr"
              maxLength={6}
            />

            <Button onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 6} className="w-full" variant="hero">
              {loading ? t('common.loading') : t('auth.verify')}
            </Button>

            <button className="text-sm text-gold hover:underline w-full text-center">
              {t('auth.resend')}
            </button>
          </div>

          <button onClick={() => { setMode('login'); setRegisterStep('type'); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <BackArrow className="w-4 h-4" />
            {t('auth.back')}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // FORGOT PASSWORD
  if (mode === 'forgot-password') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.reset_password')}</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  style={{ paddingInlineStart: '40px' }}
                />
              </div>
            </div>

            <Button onClick={handleForgotPassword} disabled={loading} className="w-full" variant="hero">
              {loading ? t('common.loading') : t('auth.reset_password')}
            </Button>
          </div>

          <button onClick={() => setMode('login')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <BackArrow className="w-4 h-4" />
            {t('auth.back')}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // REGISTER MODE
  return (
    <AuthLayout>
      <div className="space-y-6">
        {registerStep === 'type' && (
          <>
            <div className="text-center space-y-2">
              <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.register')}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => { setRegisterType('individual'); setRegisterStep('phone'); }}
                className="p-6 rounded-xl border-2 border-border hover:border-gold/50 transition-all text-center group"
              >
                <User className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
                <h3 className="font-heading font-bold text-lg">{t('auth.register_individual')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('membership.individual.desc')}</p>
              </button>
              <button
                onClick={() => { setRegisterType('business'); setRegisterStep('phone'); }}
                className="p-6 rounded-xl border-2 border-gold/30 bg-gold/5 hover:border-gold transition-all text-center group"
              >
                <Building2 className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
                <h3 className="font-heading font-bold text-lg">{t('auth.register_business')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('membership.business.desc')}</p>
              </button>
            </div>
            <div className="text-center text-sm">
              <button onClick={() => setMode('login')} className="text-gold hover:underline">
                {t('auth.has_account')}
              </button>
            </div>
          </>
        )}

        {registerStep === 'phone' && (
          <>
            <div className="text-center space-y-2">
              <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.register')}</h2>
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
                <Label>{t('auth.phone')}</Label>
                <div className="relative">
                  <Phone className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <div className="absolute top-2.5 text-sm text-muted-foreground font-mono" style={{ [isRTL ? 'right' : 'left']: '36px' }}>+966</div>
                  <Input
                    type="tel"
                    placeholder={t('auth.phone.placeholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    dir="ltr"
                    style={{ paddingInlineStart: '88px' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 text-muted-foreground" style={{ [isRTL ? 'left' : 'right']: '12px' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {renderPasswordStrength()}
              </div>

              <div className="space-y-2">
                <Label>{t('auth.password.confirm')}</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">{isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'}</p>
                )}
              </div>

              {registerType === 'business' ? (
                <Button onClick={() => setRegisterStep('business-details')} disabled={!phone || !fullName || passwordStrength.score < 2 || password !== confirmPassword} className="w-full" variant="hero">
                  {t('auth.next')}
                </Button>
              ) : (
                <Button onClick={handleRegister} disabled={loading || !phone || !fullName || passwordStrength.score < 2 || password !== confirmPassword} className="w-full" variant="hero">
                  {loading ? t('common.loading') : t('auth.submit')}
                </Button>
              )}
            </div>

            <button onClick={() => setRegisterStep('type')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <BackArrow className="w-4 h-4" />
              {t('auth.back')}
            </button>
          </>
        )}

        {registerStep === 'business-details' && (
          <>
            <div className="text-center space-y-2">
              <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.register_business')}</h2>
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
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="my-business"
                    dir="ltr"
                    style={{ paddingInlineStart: '40px' }}
                  />
                </div>
                {username && (
                  <p className="text-xs text-muted-foreground">
                    faneen.com/{username}
                  </p>
                )}
                {username && !validateUsername(username) && (
                  <p className="text-xs text-destructive">
                    {isRTL ? 'اسم المستخدم غير صحيح (3-50 حرف)' : 'Invalid username (3-50 chars)'}
                  </p>
                )}
              </div>

              <Button
                onClick={handleRegister}
                disabled={loading || !businessName || !validateUsername(username)}
                className="w-full"
                variant="hero"
              >
                {loading ? t('common.loading') : t('auth.submit')}
              </Button>
            </div>

            <button onClick={() => setRegisterStep('phone')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <BackArrow className="w-4 h-4" />
              {t('auth.back')}
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
              <span className="font-heading font-black text-xl text-secondary-foreground">ف</span>
            </div>
            <div className="text-start">
              <h1 className="font-heading font-bold text-xl text-foreground leading-none">فنيين</h1>
              <span className="text-xs text-gold font-body">Faneen</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {children}
        </div>

        {/* Language toggle */}
        <div className="text-center mt-4">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="text-sm text-muted-foreground hover:text-gold transition-colors"
          >
            {t('nav.language')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
