import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkPasswordStrength, validateEmail, validatePhone, validateUsername } from '@/lib/password-strength';
import { toast } from 'sonner';
import { User, Building2, Mail, Globe, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { PasswordField } from './PasswordField';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthDivider } from './AuthDivider';
import type { RegisterStep, RegisterType } from '@/services/auth/types';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onEmailSent: (email: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin, onEmailSent }) => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [registerType, setRegisterType] = useState<RegisterType>('individual');
  const [step, setStep] = useState<RegisterStep>('type');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');

  const passwordStrength = checkPasswordStrength(password);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

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
      toast.error(isRTL ? 'اسم المستخدم غير صحيح' : 'Invalid username');
      return;
    }

    setLoading(true);
    try {
      await authService.signUp(email, password, {
        full_name: fullName,
        account_type: registerType,
        phone: phone ? `${countryCode}${phone.replace(/^0/, '')}` : '',
      });
      onEmailSent(email);
      toast.success(isRTL ? 'تم إرسال رابط التحقق إلى بريدك الإلكتروني' : 'Verification link sent to your email');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      if (result.redirected) return;
      toast.success(t('common.success'));
      navigate('/onboarding');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Step: Account Type ───
  if (step === 'type') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.register')}</h2>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'اختر نوع الحساب المناسب لك' : 'Choose the right account type'}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => { setRegisterType('individual'); setStep('details'); }}
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
            onClick={() => { setRegisterType('business'); setStep('details'); }}
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

        <AuthDivider isRTL={isRTL} />
        <GoogleAuthButton onClick={handleGoogle} loading={googleLoading} isRTL={isRTL} mode="register" />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">{isRTL ? 'لديك حساب؟' : 'Have an account?'} </span>
          <button onClick={onSwitchToLogin} className="text-accent font-medium hover:underline">{t('auth.has_account')}</button>
        </div>
      </div>
    );
  }

  // ─── Step: Details ───
  if (step === 'details') {
    return (
      <div className="space-y-6">
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

          <PhoneInput
            phone={phone}
            countryCode={countryCode}
            onPhoneChange={setPhone}
            onCountryCodeChange={setCountryCode}
            isRTL={isRTL}
            optional
          />

          <PasswordField
            password={password}
            onChange={setPassword}
            label={t('auth.password')}
            showStrength
            isRTL={isRTL}
            showPassword={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
          />

          <div className="space-y-2">
            <Label>{t('auth.password.confirm')}</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">{isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'}</p>
            )}
          </div>

          {registerType === 'business' ? (
            <Button onClick={() => setStep('business-details')} disabled={!email || !fullName || passwordStrength.score < 2 || password !== confirmPassword} className="w-full h-11" variant="hero">
              {t('auth.next')}
            </Button>
          ) : (
            <Button onClick={handleRegister} disabled={loading || !email || !fullName || passwordStrength.score < 2 || password !== confirmPassword} className="w-full h-11" variant="hero">
              {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {loading ? t('common.loading') : t('auth.submit')}
            </Button>
          )}
        </div>
        <button onClick={() => setStep('type')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <BackArrow className="w-4 h-4" />
          {t('auth.back')}
        </button>
      </div>
    );
  }

  // ─── Step: Business Details ───
  return (
    <div className="space-y-6">
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
      <button onClick={() => setStep('details')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <BackArrow className="w-4 h-4" />
        {t('auth.back')}
      </button>
    </div>
  );
};
