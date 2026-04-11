import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService, useOtpFlow } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Phone, Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { OtpInput } from './OtpInput';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthDivider } from './AuthDivider';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister, onForgotPassword }) => {
  const { t, isRTL } = useLanguage();

  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Phone OTP hook — no navigate here, AuthContext + Auth.tsx handle redirect
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
      toast.success(isRTL ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
      // Auth.tsx useEffect will handle role-based redirect
    },
  });

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast.error(isRTL ? 'يرجى إدخال البريد وكلمة المرور' : 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await authService.signInWithEmail(email, password);
      toast.success(t('common.success'));
      // Auth.tsx useEffect will handle role-based redirect
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login')) {
        toast.error(isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
      } else if (msg.includes('Email not confirmed')) {
        toast.error(isRTL ? 'يرجى تأكيد بريدك الإلكتروني أولاً' : 'Please confirm your email first');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSend = async () => {
    if (!phone || phone.length < 7) {
      toast.error(isRTL ? 'أدخل رقم جوال صحيح' : 'Enter a valid phone number');
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

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await authService.signInWithGoogle();
      // OAuth redirect handles the rest
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-2xl text-foreground">
          {isRTL ? 'مرحباً بعودتك' : 'Welcome back'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'سجّل دخولك للوصول إلى حسابك' : 'Sign in to access your account'}
        </p>
      </div>

      <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
        <button
          onClick={() => { setLoginMethod('phone'); otp.resetOtp(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            loginMethod === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Phone className="w-4 h-4" />
          {isRTL ? 'رقم الجوال' : 'Phone'}
        </button>
        <button
          onClick={() => { setLoginMethod('email'); otp.resetOtp(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            loginMethod === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="w-4 h-4" />
          {isRTL ? 'البريد الإلكتروني' : 'Email'}
        </button>
      </div>

      {loginMethod === 'phone' && !otp.otpStep && (
        <div className="space-y-4 animate-fade-in">
          <PhoneInput phone={phone} countryCode={countryCode} onPhoneChange={setPhone} onCountryCodeChange={setCountryCode} isRTL={isRTL} />
          <Button onClick={handlePhoneSend} disabled={otp.loading} className="w-full h-11" variant="hero">
            {otp.loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {isRTL ? 'إرسال رمز التحقق' : 'Send Verification Code'}
          </Button>
        </div>
      )}

      {loginMethod === 'phone' && otp.otpStep && (
        <OtpInput
          otpCode={otp.otpCode} onCodeChange={otp.setCode} demoOtp={otp.demoOtp}
          cooldown={otp.cooldown} loading={otp.loading} onVerify={handlePhoneVerify}
          onResend={handlePhoneSend} onBack={otp.resetOtp} isRTL={isRTL}
        />
      )}

      {loginMethod === 'email' && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label>{t('auth.email')}</Label>
            <div className="relative">
              <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ paddingInlineStart: '40px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('auth.password')}</Label>
              <button onClick={onForgotPassword} className="text-xs text-accent hover:underline">{t('auth.forgot')}</button>
            </div>
            <div className="relative">
              <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()} />
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

      <AuthDivider isRTL={isRTL} />
      <GoogleAuthButton onClick={handleGoogle} loading={googleLoading} isRTL={isRTL} />

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
          <button onClick={onSwitchToRegister} className="text-accent font-medium hover:underline">{t('auth.no_account')}</button>
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="w-3 h-3" />
        {isRTL ? 'اتصال آمن ومشفر' : 'Secure & encrypted connection'}
      </div>
    </div>
  );
};
