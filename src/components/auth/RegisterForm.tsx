import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkPasswordStrength, validateUsername } from '@/lib/password-strength';
import { toast } from 'sonner';
import { User, Building2, Mail, Globe, Loader2, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { PasswordField } from './PasswordField';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthDivider } from './AuthDivider';
import { FieldError } from './FieldError';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import type { RegisterStep, RegisterType } from '@/services/auth/types';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onEmailSent: (email: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin, onEmailSent }) => {
  const { t, isRTL } = useLanguage();

  const [registerType, setRegisterType] = useState<RegisterType>('individual');
  const [step, setStep] = useState<RegisterStep>('type');
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

  const passwordStrength = checkPasswordStrength(password);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const { errors, validateEmailField, validatePhoneField, clearError } = useFieldValidation(isRTL);

  const handleEmailBlur = () => {
    if (!email) return;
    const valid = validateEmailField(email);
    if (valid) setEmailExists(false);
  };

  const handleRegister = async () => {
    if (!fullName.trim()) { toast.error(isRTL ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name'); return; }
    if (!email || !validateEmailField(email)) { toast.error(isRTL ? 'البريد الإلكتروني غير صحيح' : 'Invalid email'); return; }
    if (phone && !validatePhoneField(phone)) { toast.error(isRTL ? 'رقم الجوال غير صحيح' : 'Invalid phone number'); return; }
    if (passwordStrength.score < 2) { toast.error(isRTL ? 'كلمة المرور ضعيفة جداً' : 'Password is too weak'); return; }
    if (password !== confirmPassword) { toast.error(isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'); return; }
    if (registerType === 'business' && !validateUsername(username)) { toast.error(isRTL ? 'اسم المستخدم غير صحيح' : 'Invalid username'); return; }

    setLoading(true);
    try {
      await authService.signUp(email, password, {
        full_name: fullName,
        account_type: registerType,
        phone: phone ? `${countryCode}${phone.replace(/^0/, '')}` : '',
      });
      onEmailSent(email);
      toast.success(isRTL ? 'تم إرسال رابط التحقق إلى بريدك الإلكتروني' : 'Verification link sent to your email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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

  // ─── Step: Account Type ───
  if (step === 'type') {
    return (
      <div className="space-y-7">
        <div className="space-y-2">
          <h2 className="font-heading font-bold text-3xl text-foreground tracking-tight">{t('auth.register')}</h2>
          <p className="text-sm text-muted-foreground/80">
            {isRTL ? 'اختر نوع الحساب المناسب لك' : 'Choose the right account type'}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => { setRegisterType('individual'); setStep('details'); }}
            className="flex items-center gap-4 p-5 rounded-2xl border-2 border-border/60 hover:border-accent/50 bg-card hover:bg-accent/5 transition-all text-start group"
          >
            <div className="w-13 h-13 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-accent/10 transition-colors shrink-0">
              <User className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm">{t('auth.register_individual')}</h3>
              <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{t('membership.individual.desc')}</p>
            </div>
          </button>
          <button
            onClick={() => { setRegisterType('business'); setStep('details'); }}
            className="flex items-center gap-4 p-5 rounded-2xl border-2 border-accent/30 bg-accent/5 hover:border-accent hover:bg-accent/10 transition-all text-start group"
          >
            <div className="w-13 h-13 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm">{t('auth.register_business')}</h3>
              <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{t('membership.business.desc')}</p>
            </div>
          </button>
        </div>

        <AuthDivider isRTL={isRTL} />
        <GoogleAuthButton onClick={handleGoogle} loading={googleLoading} isRTL={isRTL} mode="register" />

        <div className="text-center text-sm pt-1">
          <span className="text-muted-foreground">{isRTL ? 'لديك حساب؟' : 'Have an account?'} </span>
          <button onClick={onSwitchToLogin} className="text-accent font-semibold hover:underline">{t('auth.has_account')}</button>
        </div>
      </div>
    );
  }

  // ─── Step: Details ───
  if (step === 'details') {
    const isFormValid = email && fullName.trim() && passwordStrength.score >= 2 && password === confirmPassword && !errors.email && !errors.phone && !emailExists;

    return (
      <div className="space-y-7">
        <div className="space-y-2">
          <h2 className="font-heading font-bold text-3xl text-foreground tracking-tight">{t('auth.register')}</h2>
          <p className="text-sm text-muted-foreground/80">
            {isRTL ? 'أدخل بياناتك لإنشاء حسابك' : 'Enter your details to create an account'}
          </p>
        </div>
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
            <Button onClick={() => setStep('business-details')} disabled={!isFormValid} className="w-full h-12 rounded-xl text-sm font-semibold" variant="hero">
              {t('auth.next')}
            </Button>
          ) : (
            <Button onClick={handleRegister} disabled={loading || !isFormValid} className="w-full h-12 rounded-xl text-sm font-semibold" variant="hero">
              {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {loading ? t('common.loading') : t('auth.submit')}
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
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-3xl text-foreground tracking-tight">{t('auth.register_business')}</h2>
        <p className="text-sm text-muted-foreground/80">
          {isRTL ? 'أدخل بيانات نشاطك التجاري' : 'Enter your business details'}
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
        <div className="space-y-2">
          <Label className="text-xs font-semibold">{t('auth.business_username')} <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Globe className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '14px' }} />
            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="my-business" dir="ltr" className="h-12 rounded-xl" style={{ paddingInlineStart: '42px' }} />
          </div>
          {username && <p className="text-xs text-muted-foreground">faneen.com/{username}</p>}
          {username && !validateUsername(username) && (
            <p className="text-xs text-destructive">{isRTL ? 'اسم المستخدم غير صحيح (3-50 حرف)' : 'Invalid username (3-50 chars)'}</p>
          )}
        </div>
        <Button onClick={handleRegister} disabled={loading || !businessName.trim() || !validateUsername(username)} className="w-full h-12 rounded-xl text-sm font-semibold" variant="hero">
          {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
          {loading ? t('common.loading') : t('auth.submit')}
        </Button>
      </div>
      <button onClick={() => setStep('details')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <BackArrow className="w-4 h-4" /> {t('auth.back')}
      </button>
    </div>
  );
};
