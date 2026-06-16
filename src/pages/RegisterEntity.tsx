import React, { useMemo, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, UserCog, ArrowRight, ArrowLeft, Loader2, Info, Mail, Hash } from 'lucide-react';
import { PhoneField, toE164 } from '@/components/forms/PhoneField';
import { PasswordField } from '@/components/auth/PasswordField';
import { authService } from '@/services/auth';
import { checkPasswordStrength } from '@/lib/password-strength';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { FieldError } from '@/components/auth/FieldError';

/**
 * ENTITY REGISTRATION SIMPLIFICATION — basic entity + account manager only.
 *
 * This page intentionally collects the MINIMUM data needed to provision a
 * draft business and its account manager. Everything else (services, logo,
 * branches, service areas, descriptions, team members, public visibility)
 * is deferred to the dashboard onboarding wizard.
 *
 * No DB / RLS / RPC migrations are introduced here. The page uses the
 * existing `authService.signUp` + `authService.createBusiness` primitives,
 * which already create the entity in `approval_status = 'draft'` and do
 * NOT make it publicly visible.
 */

type Step = 'entity' | 'manager';

const bi = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);

function deriveUsername(seedAr: string, seedEn: string): string {
  const base = (seedEn || seedAr || 'biz')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20) || 'biz';
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base}-${rand}`.slice(0, 28);
}

const RegisterEntity: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  usePageMeta({
    title: bi(isRTL, 'تسجيل جهة جديدة | قِطاعات', 'Register a new entity | Qitaat'),
    noindex: true,
  });

  const [step, setStep] = useState<Step>('entity');
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Entity basics
  const [entityNameAr, setEntityNameAr] = useState('');
  const [entityNameEn, setEntityNameEn] = useState('');
  const [unifiedNumber, setUnifiedNumber] = useState('');
  const [entityEmail, setEntityEmail] = useState('');

  // Step 2 — Account manager
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPhone, setManagerPhone] = useState<{ countryCode: string; national: string }>({
    countryCode: '+966', national: '',
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { errors, validateEmailField, validatePhoneField, clearError } = useFieldValidation(isRTL);
  const passwordStrength = checkPasswordStrength(password);

  const unifiedDigits = unifiedNumber.replace(/\D/g, '');
  const unifiedValid = unifiedDigits.length === 0 || /^7\d{9}$/.test(unifiedDigits);

  const step1Valid = useMemo(() => (
    entityNameAr.trim().length >= 2 &&
    !!entityEmail && validateEmailField(entityEmail) && unifiedValid
  ), [entityNameAr, entityEmail, unifiedValid, validateEmailField]);

  const step2Valid = useMemo(() => (
    managerName.trim().length >= 2 &&
    !!managerEmail && validateEmailField(managerEmail) &&
    passwordStrength.score >= 2 &&
    (!managerPhone.national || validatePhoneField(managerPhone.national))
  ), [managerName, managerEmail, managerPhone, passwordStrength, validateEmailField, validatePhoneField]);

  if (authLoading) return null;
  // If a user is already signed in, they should use the in-dashboard
  // entity-creation flow (existing onboarding). Send them there.
  if (user) return <Navigate to="/onboarding" replace />;

  const ChevronNext = isRTL ? ArrowLeft : ArrowRight;

  const handleSubmit = async () => {
    if (!step1Valid || !step2Valid) return;
    setSubmitting(true);
    try {
      const username = deriveUsername(entityNameAr, entityNameEn);
      const phoneE164 = toE164(managerPhone);
      const result = await authService.signUp(managerEmail, password, {
        full_name: managerName,
        full_name_ar: isRTL ? managerName : '',
        full_name_en: !isRTL ? managerName : '',
        account_type: 'business',
        phone: phoneE164,
        phone_country_code: managerPhone.national ? managerPhone.countryCode : '',
        phone_national: managerPhone.national,
      });

      const newUserId = result?.user?.id;
      if (newUserId) {
        try {
          await authService.createBusiness(newUserId, entityNameAr.trim(), username, {
            recipientEmail: managerEmail,
            entity_type: 'company',
            name_en: entityNameEn.trim() || undefined,
            email: entityEmail.trim() || undefined,
            unified_number: unifiedDigits || undefined,
          });
        } catch {
          // Entity creation failed — the auth account already exists; the
          // dashboard onboarding wizard will recover on first login by
          // creating a draft entity via `ensureDraftBusiness`.
        }
      }

      try { sessionStorage.setItem('qitaat_entity_welcome', '1'); } catch { /* noop */ }

      if (result?.session) {
        toast.success(bi(isRTL, 'تم إنشاء حساب الجهة بنجاح', 'Entity account created successfully'));
        navigate('/dashboard', { replace: true });
      } else {
        toast.success(bi(
          isRTL,
          'تم إنشاء الحساب. تحقق من بريد مدير الحساب لإكمال التفعيل.',
          'Account created. Check the account manager email to complete activation.',
        ));
        navigate('/auth', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already registered')) {
        // Non-enumerating message per spec
        toast.error(bi(
          isRTL,
          'إذا كان لديك حساب سابق، سجّل الدخول أو اطلب الانضمام من مسؤول الجهة.',
          'If you already have an account, sign in or ask the entity admin to invite you.',
        ));
      } else {
        toast.error(msg || bi(isRTL, 'تعذر إنشاء الحساب', 'Could not create the account'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <main className="flex-1 flex items-start justify-center px-5 py-10">
        <div
          className="w-full max-w-xl space-y-6"
          data-feature="register-entity-basic"
          data-page="register-entity"
        >
          <header className="space-y-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              {bi(isRTL, 'تسجيل جهة جديدة', 'Register a new entity')}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {bi(
                isRTL,
                'ابدأ بتسجيل بيانات الجهة الأساسية ومدير الحساب. يمكنك إكمال الخدمات، الصور، والفروع لاحقًا من لوحة التحكم.',
                'Start by registering the basic entity details and the account manager. You can complete services, images, and branches later from the dashboard.',
              )}
            </p>
          </header>

          {/* Step indicator */}
          <ol className="flex items-center gap-2 text-xs font-semibold">
            {(['entity', 'manager'] as const).map((s, i) => {
              const active = step === s;
              const done = step === 'manager' && s === 'entity';
              return (
                <li
                  key={s}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : done
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-border bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <span className="inline-flex w-5 h-5 rounded-full bg-background items-center justify-center text-[10px]">
                    {i + 1}
                  </span>
                  <span>
                    {s === 'entity'
                      ? bi(isRTL, 'بيانات الجهة', 'Entity details')
                      : bi(isRTL, 'مدير الحساب', 'Account manager')}
                  </span>
                </li>
              );
            })}
          </ol>

          {step === 'entity' && (
            <section
              className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
              data-step="entity"
              aria-labelledby="entity-section-title"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h2 id="entity-section-title" className="font-semibold text-sm">
                  {bi(isRTL, 'بيانات الجهة الأساسية', 'Basic entity details')}
                </h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-name-ar" className="text-xs font-semibold">
                  {bi(isRTL, 'اسم الجهة بالعربية', 'Entity name (Arabic)')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="entity-name-ar"
                  value={entityNameAr}
                  onChange={(e) => setEntityNameAr(e.target.value)}
                  placeholder={bi(isRTL, 'مثال: مصنع الواجهة الحديثة', 'e.g. Modern Facade Factory')}
                  dir="auto"
                  className="h-12 rounded-xl"
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-name-en" className="text-xs font-semibold">
                  {bi(isRTL, 'اسم الجهة بالإنجليزية', 'Entity name (English)')}
                </Label>
                <Input
                  id="entity-name-en"
                  value={entityNameEn}
                  onChange={(e) => setEntityNameEn(e.target.value)}
                  placeholder="Modern Facade Factory"
                  dir="ltr"
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-unified" className="text-xs font-semibold">
                  {bi(isRTL, 'الرقم الموحد / رقم المنشأة', 'Unified / entity number')}
                </Label>
                <div className="relative">
                  <Hash className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ insetInlineStart: '14px' }} />
                  <Input
                    id="entity-unified"
                    value={unifiedNumber}
                    onChange={(e) => setUnifiedNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputMode="numeric"
                    dir="ltr"
                    style={{ paddingInlineStart: '42px' }}
                    className={`h-12 rounded-xl tech-content ${unifiedNumber && !unifiedValid ? 'border-destructive' : ''}`}
                    placeholder="7XXXXXXXXX"
                  />
                </div>
                <p className={`text-[11px] ${unifiedNumber && !unifiedValid ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {bi(isRTL, '10 أرقام تبدأ بـ 7 (اختياري في هذه المرحلة)', '10 digits starting with 7 (optional at this stage)')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-email" className="text-xs font-semibold">
                  {bi(isRTL, 'البريد الإلكتروني للجهة', 'Entity email')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ insetInlineStart: '14px' }} />
                  <Input
                    id="entity-email"
                    type="email"
                    value={entityEmail}
                    onChange={(e) => { setEntityEmail(e.target.value); clearError('email'); }}
                    onBlur={() => entityEmail && validateEmailField(entityEmail)}
                    placeholder="info@example.com"
                    dir="ltr"
                    style={{ paddingInlineStart: '42px' }}
                    className="h-12 rounded-xl"
                    autoComplete="email"
                  />
                </div>
                <FieldError message={errors.email} />
              </div>

              <div
                className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3"
                role="note"
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {bi(
                      isRTL,
                      'إذا كانت الجهة مسجلة مسبقًا في قطاعات، اطلب الانضمام بدل إنشاء جهة جديدة.',
                      'If the entity is already registered on Qitaat, request to join instead of creating a new entity.',
                    )}
                  </p>
                  <Link
                    to="/auth"
                    className="text-[12px] font-semibold text-primary hover:underline"
                  >
                    {bi(isRTL, 'لدي دعوة أو أريد الانضمام إلى جهة', 'I have an invite or want to join an entity')}
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">{bi(isRTL, 'إلغاء', 'Cancel')}</Link>
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep('manager')}
                  disabled={!step1Valid}
                  className="h-11 rounded-xl px-5"
                >
                  {bi(isRTL, 'التالي', 'Next')}
                  <ChevronNext className="w-4 h-4 ms-1" />
                </Button>
              </div>
            </section>
          )}

          {step === 'manager' && (
            <section
              className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
              data-step="manager"
              aria-labelledby="manager-section-title"
            >
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-primary" />
                <h2 id="manager-section-title" className="font-semibold text-sm">
                  {bi(isRTL, 'بيانات مدير الحساب', 'Account manager details')}
                </h2>
              </div>

              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {bi(
                  isRTL,
                  'مدير الحساب سيكون المسؤول الأول عن إدارة بيانات الجهة، الفريق، الخدمات، والطلبات داخل لوحة التحكم.',
                  'The account manager will be the primary person managing the entity\u2019s data, team, services, and requests inside the dashboard.',
                )}
              </p>

              <div className="space-y-2">
                <Label htmlFor="mgr-name" className="text-xs font-semibold">
                  {bi(isRTL, 'اسم مدير الحساب', 'Account manager name')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mgr-name"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  dir="auto"
                  className="h-12 rounded-xl"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mgr-email" className="text-xs font-semibold">
                  {bi(isRTL, 'البريد الإلكتروني لمدير الحساب', 'Account manager email')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute top-3.5 text-muted-foreground/60 w-4 h-4" style={{ insetInlineStart: '14px' }} />
                  <Input
                    id="mgr-email"
                    type="email"
                    value={managerEmail}
                    onChange={(e) => { setManagerEmail(e.target.value); clearError('email'); }}
                    onBlur={() => managerEmail && validateEmailField(managerEmail)}
                    placeholder="manager@example.com"
                    dir="ltr"
                    style={{ paddingInlineStart: '42px' }}
                    className="h-12 rounded-xl"
                    autoComplete="email"
                  />
                </div>
                <FieldError message={errors.email} />
              </div>

              <PhoneField
                value={managerPhone}
                onChange={(v) => { setManagerPhone(v); clearError('phone'); }}
                onBlur={() => { if (managerPhone.national) validatePhoneField(managerPhone.national); }}
                optional
                error={errors.phone}
              />

              <PasswordField
                password={password}
                onChange={setPassword}
                label={bi(isRTL, 'كلمة المرور', 'Password')}
                showStrength
                isRTL={isRTL}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />

              <div className="flex items-center justify-between pt-2 gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('entity')}
                  disabled={submitting}
                >
                  {bi(isRTL, 'رجوع', 'Back')}
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !step1Valid || !step2Valid}
                  className="h-11 rounded-xl px-5"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                  {bi(isRTL, 'إنشاء حساب الجهة', 'Create entity account')}
                </Button>
              </div>
            </section>
          )}

          <p className="text-[11px] text-muted-foreground/70 text-center">
            {bi(
              isRTL,
              'لن تظهر الجهة للعملاء إلا بعد اكتمال البيانات والمراجعة.',
              'The entity will not appear to clients until details are complete and reviewed.',
            )}
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegisterEntity;