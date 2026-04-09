import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { checkPasswordStrength, validatePhone, validateEmail, validateUsername } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Phone, Mail, Lock, User, Building2, Globe } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'email-sent';
type RegisterType = 'individual' | 'business';
type RegisterStep = 'type' | 'details' | 'business-details';

const Auth = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [registerType, setRegisterType] = useState<RegisterType>('individual');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('type');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');

  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordStrength = checkPasswordStrength(password);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

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
      navigate('/');
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
            phone: phone ? `+966${phone.replace(/^0/, '')}` : '',
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

  if (mode === 'login') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.login')}</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 text-muted-foreground" style={{ [isRTL ? 'left' : 'right']: '12px' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleEmailLogin} disabled={loading} className="w-full" variant="hero">
              {loading ? t('common.loading') : t('auth.login')}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{isRTL ? 'أو' : 'or'}</span></div>
            </div>
            <Button onClick={handleGoogleLogin} disabled={googleLoading} variant="outline" className="w-full gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {googleLoading ? t('common.loading') : (isRTL ? 'الدخول بحساب Google' : 'Sign in with Google')}
            </Button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <button onClick={() => setMode('forgot-password')} className="text-gold hover:underline">{t('auth.forgot')}</button>
            <button onClick={() => { setMode('register'); setRegisterStep('type'); }} className="text-gold hover:underline">{t('auth.no_account')}</button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (mode === 'email-sent') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? `أرسلنا رابط التحقق إلى ${email}. يرجى فتح بريدك والنقر على الرابط لتأكيد حسابك.`
                : `We sent a verification link to ${email}. Please open your email and click the link to confirm your account.`}
            </p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => setMode('login')} className="w-full" variant="hero">
              {isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {isRTL ? 'لم يصلك البريد؟ تحقق من مجلد الرسائل غير المرغوب فيها' : "Didn't receive it? Check your spam folder"}
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

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
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }} />
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
              <button onClick={() => { setRegisterType('individual'); setRegisterStep('details'); }} className="p-6 rounded-xl border-2 border-border hover:border-gold/50 transition-all text-center group">
                <User className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
                <h3 className="font-heading font-bold text-lg">{t('auth.register_individual')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('membership.individual.desc')}</p>
              </button>
              <button onClick={() => { setRegisterType('business'); setRegisterStep('details'); }} className="p-6 rounded-xl border-2 border-gold/30 bg-gold/5 hover:border-gold transition-all text-center group">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
                <h3 className="font-heading font-bold text-lg">{t('auth.register_business')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('membership.business.desc')}</p>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{isRTL ? 'أو' : 'or'}</span></div>
            </div>
            <Button onClick={handleGoogleLogin} disabled={googleLoading} variant="outline" className="w-full gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {googleLoading ? t('common.loading') : (isRTL ? 'التسجيل بحساب Google' : 'Sign up with Google')}
            </Button>
            <div className="text-center text-sm">
              <button onClick={() => setMode('login')} className="text-gold hover:underline">{t('auth.has_account')}</button>
            </div>
          </>
        )}

        {registerStep === 'details' && (
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
                <Label>{t('auth.email')} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.phone')} <span className="text-xs text-muted-foreground ms-1">({isRTL ? 'اختياري' : 'optional'})</span></Label>
                <div className="relative">
                  <Phone className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <div className="absolute top-2.5 text-sm text-muted-foreground font-mono" style={{ [isRTL ? 'right' : 'left']: '36px' }}>+966</div>
                  <Input type="tel" placeholder={t('auth.phone.placeholder')} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))} dir="ltr" style={{ paddingInlineStart: '88px' }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 text-muted-foreground" style={{ [isRTL ? 'left' : 'right']: '12px' }}>
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
                <Button onClick={() => setRegisterStep('business-details')} disabled={!email || !fullName || passwordStrength.score < 2 || password !== confirmPassword} className="w-full" variant="hero">
                  {t('auth.next')}
                </Button>
              ) : (
                <Button onClick={handleRegister} disabled={loading || !email || !fullName || passwordStrength.score < 2 || password !== confirmPassword} className="w-full" variant="hero">
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
                  <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="my-business" dir="ltr" style={{ paddingInlineStart: '40px' }} />
                </div>
                {username && <p className="text-xs text-muted-foreground">faneen.com/{username}</p>}
                {username && !validateUsername(username) && (
                  <p className="text-xs text-destructive">{isRTL ? 'اسم المستخدم غير صحيح (3-50 حرف)' : 'Invalid username (3-50 chars)'}</p>
                )}
              </div>
              <Button onClick={handleRegister} disabled={loading || !businessName || !validateUsername(username)} className="w-full" variant="hero">
                {loading ? t('common.loading') : t('auth.submit')}
              </Button>
            </div>
            <button onClick={() => setRegisterStep('details')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
