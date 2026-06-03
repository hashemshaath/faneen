import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { listActiveCategories } from '@/modules/categories';
import { submitProviderLead } from './services/submitProviderLead';
import {
  PROVIDER_LEAD_DOC_MAX_BYTES,
  PROVIDER_LEAD_DOC_MIMES,
} from '@/modules/files/domain/providerLeadDocuments';
import {
  EMPTY_PROVIDER_LEAD_FORM,
  type ProviderLeadFormState,
  type ProviderLeadBranchInput,
  type StepNumber,
  type ErrorMap,
} from './types';
import { STEPS, DRAFT_STORAGE_KEY } from './constants';
import {
  validateProviderLeadForm,
  pickStepErrors,
  completionPercent,
} from './validation';
import { ProviderLeadStepper } from './components/ProviderLeadStepper';
import { FormBottomBar } from './components/FormBottomBar';
import { BusinessAndServicesStep } from './steps/BusinessAndServicesStep';
import { ContactAndLocationStep } from './steps/ContactAndLocationStep';
import { OfficialAndBranchesStep } from './steps/OfficialAndBranchesStep';
import { ReviewSubmitStep } from './steps/ReviewSubmitStep';

interface CategoryOption { id: string; name_ar: string; name_en: string }

export const ProviderLeadFormPage: React.FC = () => {
  const { isRTL } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const [form, setForm] = useState<ProviderLeadFormState>(EMPTY_PROVIDER_LEAD_FORM);
  const [branches, setBranches] = useState<ProviderLeadBranchInput[]>([]);
  const [crFile, setCrFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [step, setStep] = useState<StepNumber>(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [catalogNames, setCatalogNames] = useState<string[]>([]);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number>(Date.now());

  // Restore draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          setForm((f) => ({ ...f, ...saved.form }));
          if (Array.isArray(saved.branches)) setBranches(saved.branches);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Categories
  useEffect(() => {
    let alive = true;
    listActiveCategories<CategoryOption>({ select: 'id, name_ar, name_en' }).then(({ data }) => {
      if (alive && data) setCatalogNames(data.map((c) => (isRTL ? c.name_ar : c.name_en) || c.name_ar || c.name_en));
    });
    return () => { alive = false; };
  }, [isRTL]);

  // Sync branches with branches_count
  useEffect(() => {
    const target = Math.max(1, Number(form.branches_count) || 1);
    setBranches((prev) => {
      const needed = Math.max(0, target - 1);
      if (prev.length === needed) return prev;
      if (prev.length < needed) {
        return [
          ...prev,
          ...Array.from({ length: needed - prev.length }, () => ({
            branch_name: '', city: '', address: '', map_link: '', phone: '',
          })),
        ];
      }
      return prev.slice(0, needed);
    });
  }, [form.branches_count]);

  const setField = <K extends keyof ProviderLeadFormState>(k: K, v: ProviderLeadFormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      if (!e[k as string]) return e;
      const { [k as string]: _, ...rest } = e;
      return rest;
    });
    if (submitError) setSubmitError(null);
  };

  const clearError = (k: string) =>
    setErrors((e) => (e[k] ? Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)) : e));

  const onBranchChange = (i: number, k: keyof ProviderLeadBranchInput, v: string) =>
    setBranches((b) => b.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setCrFile(null); return; }
    if (f.size > PROVIDER_LEAD_DOC_MAX_BYTES) {
      const msg = t('حجم الملف يتجاوز 5 ميغابايت', 'File exceeds 5 MB');
      setErrors((er) => ({ ...er, cr_file: msg }));
      toast.error(msg);
      e.target.value = '';
      return;
    }
    if (!(PROVIDER_LEAD_DOC_MIMES as readonly string[]).includes(f.type)) {
      const msg = t('نوع الملف غير مدعوم. PDF أو JPG أو PNG فقط.', 'Unsupported file type. PDF/JPG/PNG only.');
      setErrors((er) => ({ ...er, cr_file: msg }));
      toast.error(msg);
      e.target.value = '';
      return;
    }
    clearError('cr_file');
    setCrFile(f);
  };

  const focusFirstError = (er: ErrorMap) => {
    const first = Object.keys(er)[0];
    if (!first) return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-error-key="${first}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el.querySelector('input, select, textarea, button') as HTMLElement | null)?.focus();
      }
    });
  };

  const goNext = () => {
    const all = validateProviderLeadForm(form, branches, t);
    const stepErr = pickStepErrors(all, step);
    if (Object.keys(stepErr).length) {
      setErrors((prev) => ({ ...prev, ...stepErr }));
      focusFirstError(stepErr);
      return;
    }
    setStep((s) => (s < STEPS.length ? ((s + 1) as StepNumber) : s));
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const goBack = () => {
    setStep((s) => (s > 1 ? ((s - 1) as StepNumber) : s));
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form, branches }));
      toast.success(t('تم حفظ المسودة', 'Draft saved'));
    } catch {
      toast.error(t('تعذّر حفظ المسودة', 'Could not save draft'));
    }
  };

  const onSubmit = async () => {
    if (honeypotRef.current?.value) return;
    if (Date.now() - startedAt.current < 1500) {
      const msg = t('يرجى المحاولة بعد لحظات.', 'Please try again in a moment.');
      setSubmitError(msg);
      return;
    }
    const er = validateProviderLeadForm(form, branches, t);
    setErrors(er);
    if (Object.keys(er).length > 0) {
      const msg = t('يوجد حقول تحتاج إلى مراجعة.', 'Some fields need attention.');
      setSubmitError(msg);
      // jump back to the first step with errors
      const firstStep = (Object.keys(er).some((k) => ['name_ar'].includes(k)) ? 1
        : Object.keys(er).some((k) => ['contact_name','email','phone','website','map_link','national_address'].includes(k)) ? 2
        : 3) as StepNumber;
      setStep(firstStep);
      focusFirstError(er);
      return;
    }
    setSubmitError(null);
    setLoading(true);
    try {
      const result = await submitProviderLead(
        {
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || undefined,
          contact_name: form.contact_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          preferred_channel: form.preferred_channel,
          website: form.website.trim() || undefined,
          cr_number: form.cr_number.trim() || undefined,
          unified_number: form.unified_number.trim() || undefined,
          vat_number: form.vat_number.trim() || undefined,
          main_activity: form.main_activity.trim() || undefined,
          specialties: form.specialties.map((s) => s.trim()).filter(Boolean),
          brands: form.brands.map((s) => s.trim()).filter(Boolean),
          brief: form.brief.trim() || undefined,
          map_link: form.map_link.trim() || undefined,
          national_address: form.national_address.trim() || undefined,
          city: form.city.trim() || undefined,
          branches_count: Math.max(1, Number(form.branches_count) || 1),
          branches: branches
            .filter((b) => b.branch_name.trim().length > 0)
            .map((b) => ({
              branch_name: b.branch_name.trim(),
              city: b.city?.trim() || undefined,
              address: b.address?.trim() || undefined,
              map_link: b.map_link?.trim() || undefined,
              phone: b.phone?.trim() || undefined,
            })),
        },
        crFile,
      );
      if (!result.ok) {
        const map: Record<string, string> = {
          invalid_email: t('البريد الإلكتروني غير صحيح', 'Invalid email'),
          invalid_phone: t('رقم الجوال غير صحيح', 'Invalid phone'),
          duplicate_request: t('يبدو أن هناك طلباً مسجلاً بهذه البيانات. سنقوم بمراجعته أو التواصل معكم.', 'A request with these details already exists. We will review or contact you.'),
          rate_limited: t('عدد كبير من المحاولات. حاول لاحقاً.', 'Too many attempts. Try later.'),
          upload_failed: t('فشل رفع السجل التجاري', 'CR upload failed'),
          unknown: t('تعذّر إرسال الطلب. حاول مرة أخرى.', 'Could not submit. Please try again.'),
        };
        const msg = map[result.errorCode ?? 'unknown'];
        if (result.errorCode === 'invalid_email') setErrors((e) => ({ ...e, email: msg }));
        if (result.errorCode === 'invalid_phone') setErrors((e) => ({ ...e, phone: msg }));
        setSubmitError(msg);
        toast.error(msg);
        return;
      }
      try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignore */ }
      setSuccess(result.data!.reference_code);
    } catch {
      const msg = t('حدث خطأ غير متوقع. حاول مرة أخرى.', 'Unexpected error. Please try again.');
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const percent = useMemo(() => completionPercent(form), [form]);

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full rounded-2xl shadow-elegant">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-[20px] font-bold">{t('تم استلام طلبكم بنجاح', 'Your request was received')}</h1>
              <p className="text-[13px] text-muted-foreground">
                {t(
                  'سعادتنا بثقتكم بقطاعات. الطلب الآن قيد المراجعة وسيتم التواصل معكم قريباً.',
                  "Thank you for trusting Qitaat. Your request is under review and we'll be in touch soon.",
                )}
              </p>
              <div className="rounded-xl border bg-muted/40 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{t('الرقم المرجعي', 'Reference')}</div>
                <div className="font-mono text-[16px] tech-content">{success}</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild className="rounded-xl h-11">
                  <a href={`/join/qitaat/edit?ref=${encodeURIComponent(success)}`}>
                    {t('تعديل بياناتي', 'Edit my request')}
                  </a>
                </Button>
                <Button
                  onClick={() => {
                    setSuccess(null);
                    setForm(EMPTY_PROVIDER_LEAD_FORM);
                    setBranches([]);
                    setCrFile(null);
                    setStep(1);
                  }}
                  variant="outline"
                  className="rounded-xl h-11"
                >
                  {t('تقديم طلب جديد', 'Submit another')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section
          className="mx-auto"
          style={{
            maxWidth: 420,
            paddingInline: 16,
            paddingTop: 12,
            paddingBottom: 96,
          }}
        >
          <div className="text-center mb-3">
            <div className="text-[11px] text-muted-foreground">{t('منصة قِطاعات الصناعية', 'Qitaat Industrial Platform')}</div>
            <h1 className="text-[18px] font-semibold mt-0.5">{t('نموذج طلب الانضمام', 'Join Request Form')}</h1>
          </div>

          <ProviderLeadStepper current={step} isRTL={isRTL} percent={percent} />

          {submitError && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive p-3 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[12px] leading-[18px]">{submitError}</p>
            </div>
          )}

          {/* Honeypot */}
          <input
            ref={honeypotRef}
            type="text"
            name="company_url_hp"
            tabIndex={-1}
            autoComplete="off"
            className="absolute opacity-0 pointer-events-none -z-10 h-0 w-0"
            aria-hidden="true"
          />

          <div className="mt-4">
            {step === 1 && (
              <BusinessAndServicesStep
                form={form} errors={errors} catalogNames={catalogNames} isRTL={isRTL} setField={setField}
              />
            )}
            {step === 2 && (
              <ContactAndLocationStep form={form} errors={errors} isRTL={isRTL} setField={setField} />
            )}
            {step === 3 && (
              <OfficialAndBranchesStep
                form={form}
                branches={branches}
                errors={errors}
                crFile={crFile}
                isRTL={isRTL}
                setField={setField}
                onBranchChange={onBranchChange}
                onFileChange={onFileChange}
                clearError={clearError}
              />
            )}
            {step === 4 && (
              <ReviewSubmitStep form={form} branches={branches} crFile={crFile} isRTL={isRTL} />
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-4">
            {t('بالإرسال توافق على ', 'By submitting you agree to ')}
            <a href="/privacy" className="underline">{t('سياسة الخصوصية', 'Privacy')}</a>
            {t(' و', ' and ')}
            <a href="/terms" className="underline">{t('الشروط', 'Terms')}</a>.
          </p>
        </section>

        <FormBottomBar
          step={step}
          totalSteps={STEPS.length}
          loading={loading}
          isRTL={isRTL}
          onBack={goBack}
          onNext={goNext}
          onSaveDraft={saveDraft}
          onSubmit={onSubmit}
        />
      </main>
      <Footer />
    </div>
  );
};

export default ProviderLeadFormPage;