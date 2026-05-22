import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { submitQuoteRequest } from '@/modules/quotes/services/submitQuoteRequest';
import { uploadQuoteRequestFile } from '@/modules/quotes/services/uploadQuoteRequestFile';
import { createQuoteRequestFileRecord } from '@/modules/quotes/services/createQuoteRequestFileRecord';
import { useAuth } from '@/contexts/AuthContext';
import { resolveQuoteSectorFromUrl } from '@/lib/sectors-seo';
import {
  CheckCircle2, ChevronLeft, ChevronRight, Upload, X,
  ShieldCheck, ListChecks, MapPin, Layers, Image as ImageIcon, AlertCircle,
} from 'lucide-react';

type Sector =
  | 'aluminum' | 'iron' | 'wood' | 'glass' | 'stainless'
  | 'fabrication' | 'storefronts' | 'project-fitout' | 'other';

type ServiceLocation = 'on-site' | 'at-provider' | 'unsure';
type Timeline = 'week' | 'two-weeks' | 'month' | 'flexible' | 'ask-provider';
type BudgetMode = 'yes' | 'no' | 'after-quotes';
type ClientType = 'individual' | 'contractor' | 'engineering' | 'company' | 'gov' | 'other';
type ContactPref = 'whatsapp' | 'call' | 'email';

interface QuoteForm {
  sector: Sector | '';
  city: string;
  district: string;
  serviceLocation: ServiceLocation | '';
  description: string;
  measurements: string;
  quantity: string;
  files: { name: string; size: number }[];
  timeline: Timeline | '';
  budgetMode: BudgetMode | '';
  budget: string;
  name: string;
  phone: string;
  email: string;
  clientType: ClientType | '';
  contactPref: ContactPref | '';
}

const DRAFT_KEY = 'qitaat_quote_draft_v1';

const emptyForm: QuoteForm = {
  sector: '', city: '', district: '', serviceLocation: '',
  description: '', measurements: '', quantity: '', files: [],
  timeline: '', budgetMode: '', budget: '',
  name: '', phone: '', email: '', clientType: '', contactPref: '',
};

const SECTORS: { value: Sector; ar: string; en: string }[] = [
  { value: 'aluminum',       ar: 'ألمنيوم',         en: 'Aluminum' },
  { value: 'iron',           ar: 'حديد',            en: 'Iron' },
  { value: 'wood',           ar: 'خشب',             en: 'Wood' },
  { value: 'glass',          ar: 'زجاج',            en: 'Glass' },
  { value: 'stainless',      ar: 'ستانلس ستيل',     en: 'Stainless steel' },
  { value: 'fabrication',    ar: 'تصنيع وتركيب',    en: 'Fabrication & install' },
  { value: 'storefronts',    ar: 'واجهات ومحلات',   en: 'Storefronts & shops' },
  { value: 'project-fitout', ar: 'تجهيزات مشاريع',  en: 'Project fit-out' },
  { value: 'other',          ar: 'أخرى',            en: 'Other' },
];

const SAUDI_PHONE = /^(?:\+?966|0)?5\d{8}$/;

const ALLOWED_FILE_TYPES = [
  'image/jpeg','image/png','image/webp','image/gif','image/heic',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/acad','image/vnd.dwg','application/dwg','application/x-dwg',
];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
  return cleaned.slice(-120) || 'file';
}

/* ---------------- helpers ---------------- */

function loadDraft(): QuoteForm {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyForm;
    const parsed = JSON.parse(raw) as Partial<QuoteForm>;
    return { ...emptyForm, ...parsed, files: Array.isArray(parsed.files) ? parsed.files : [] };
  } catch {
    return emptyForm;
  }
}

function saveDraft(f: QuoteForm) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

/* ---------------- step UI primitives ---------------- */

const StepHeading: React.FC<{ ar: string; en: string; help?: { ar: string; en: string } }> = ({ ar, en, help }) => (
  <div className="mb-6">
    <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground"><Bi ar={ar} en={en} /></h2>
    {help && (
      <p className="mt-2 text-sm text-muted-foreground"><Bi ar={help.ar} en={help.en} /></p>
    )}
  </div>
);

const ChoiceGrid: React.FC<{
  options: { value: string; ar: string; en: string }[];
  value: string;
  onChange: (v: string) => void;
  cols?: string;
  name: string;
}> = ({ options, value, onChange, cols = 'sm:grid-cols-2 lg:grid-cols-3', name }) => (
  <div role="radiogroup" aria-label={name} className={`grid grid-cols-1 ${cols} gap-3`}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(opt.value)}
          className={`h-12 px-4 rounded-xl border text-sm font-semibold transition-all hover-lift text-start ${
            active
              ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
              : 'border-border bg-card text-foreground hover:border-primary/40'
          }`}
        >
          <Bi ar={opt.ar} en={opt.en} />
        </button>
      );
    })}
  </div>
);

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-destructive">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </p>
  ) : null;

/* ---------------- main page ---------------- */

const TOTAL_STEPS = 5;

const STEP_LABELS = [
  { ar: 'القطاع',     en: 'Sector' },
  { ar: 'الموقع',     en: 'Location' },
  { ar: 'التفاصيل',   en: 'Details' },
  { ar: 'الموعد',     en: 'Timeline' },
  { ar: 'التواصل',    en: 'Contact' },
];

const Quote: React.FC = () => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<QuoteForm>(() => loadDraft());
  const [fileObjects, setFileObjects] = useState<File[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialDraftHadSector = useRef<boolean>(!!loadDraft().sector);
  const [draftNotice, setDraftNotice] = useState<boolean>(false);

  // Prefill sector from ?sector= (e.g. /quote?sector=aluminum). Runs once.
  // If a different sector was already saved as a draft, prefer the URL value
  // and surface a small notice so the user can keep or reset their draft.
  useEffect(() => {
    const raw = searchParams.get('sector');
    const next = resolveQuoteSectorFromUrl(raw);
    if (!next) return;
    setForm((p) => {
      if (p.sector === next) return p;
      if (p.sector && p.sector !== next) setDraftNotice(true);
      return { ...p, sector: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist draft on every change
  useEffect(() => { saveDraft(form); }, [form]);

  // scroll to top of form on step change
  useEffect(() => {
    const el = document.getElementById('quote-form-anchor');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  usePageMeta({
    title: 'اطلب عرض سعر لأعمال الألمنيوم والحديد والخشب والزجاج | قطاعات',
    description:
      'أرسل تفاصيل مشروعك عبر قطاعات واطلب عروض أسعار من مزودي خدمات الصناعات الخفيفة في الألمنيوم، الحديد، الخشب، الزجاج، والستانلس ستيل حسب القطاع والمدينة.',
    canonical: 'https://qitaat.com/quote',
    ogType: 'website',
    ogTitle: 'اطلب عرض سعر — قطاعات',
    ogDescription:
      'أرسل طلب عرض سعر منظم لمشروعك في الصناعات الخفيفة، وقارن العروض قبل أن تختار.',
  });

  useMultiJsonLd(useMemo(() => ([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'اطلب عرض سعر',
      url: 'https://qitaat.com/quote',
      inLanguage: 'ar-SA',
      description: 'صفحة إرسال طلب عرض سعر لمشاريع الصناعات الخفيفة عبر قطاعات.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://qitaat.com/' },
        { '@type': 'ListItem', position: 2, name: 'اطلب عرض سعر', item: 'https://qitaat.com/quote' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question', name: 'هل طلب عرض السعر مجاني؟',
          acceptedAnswer: { '@type': 'Answer', text: 'يمكنك إرسال طلب عرض سعر عبر قطاعات. إذا وُجدت أي رسوم مستقبلية أو خدمات إضافية، سيتم توضيحها قبل المتابعة.' },
        },
        {
          '@type': 'Question', name: 'هل يجب أن أضيف صورًا؟',
          acceptedAnswer: { '@type': 'Answer', text: 'ليست إلزامية، لكنها تساعد المزودين على فهم الطلب بشكل أفضل.' },
        },
        {
          '@type': 'Question', name: 'هل قطاعات تنفذ المشروع؟',
          acceptedAnswer: { '@type': 'Answer', text: 'لا. قطاعات تساعد على تنظيم الطلب وربطك بمزودي الخدمة، بينما التنفيذ والاتفاق النهائي يكونان بينك وبين المزود.' },
        },
        {
          '@type': 'Question', name: 'هل يمكنني طلب أكثر من خدمة؟',
          acceptedAnswer: { '@type': 'Answer', text: 'نعم، يمكنك توضيح ذلك في وصف المشروع، أو إرسال أكثر من طلب إذا كانت الخدمات مختلفة.' },
        },
      ],
    },
  ]), []));

  const update = <K extends keyof QuoteForm>(k: K, v: QuoteForm[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validateStep = (s: number): boolean => {
    const e: Partial<Record<keyof QuoteForm, string>> = {};
    if (s === 1 && !form.sector) {
      e.sector = bi('اختر القطاع الأقرب لطلبك للمتابعة.', 'Pick the closest sector to continue.');
    }
    if (s === 2) {
      if (!form.city.trim()) e.city = bi('أضف المدينة حتى نتمكن من توجيه الطلب بشكل أفضل.', 'Add the city so we can route your request.');
      if (!form.serviceLocation) e.serviceLocation = bi('اختر مكان تنفيذ الخدمة.', 'Choose where the service will be delivered.');
    }
    if (s === 3 && form.description.trim().length < 10) {
      e.description = bi('اكتب وصفًا مختصرًا للمشروع ليساعد المزود على فهم احتياجك.', 'Add a short description so providers understand your need.');
    }
    if (s === 4 && !form.timeline) {
      e.timeline = bi('اختر الموعد المناسب للتنفيذ.', 'Choose your preferred timeline.');
    }
    if (s === 5) {
      if (!form.name.trim()) e.name = bi('أضف اسمك للمتابعة.', 'Add your name to continue.');
      if (!SAUDI_PHONE.test(form.phone.trim())) e.phone = bi('أضف رقم جوال صحيح للتواصل حول الطلب.', 'Add a valid mobile number.');
      if (!form.clientType) e.clientType = bi('اختر نوع العميل.', 'Choose your client type.');
      if (!form.contactPref) e.contactPref = bi('اختر طريقة التواصل المفضلة.', 'Choose a preferred contact method.');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };
  const goPrev = () => { if (step > 1) setStep((s) => s - 1); };

  const handleFiles = (filesList: FileList | null) => {
    if (!filesList) return;
    const nextMeta = [...form.files];
    const nextFiles = [...fileObjects];
    const remaining = 8 - nextMeta.length;
    Array.from(filesList).slice(0, remaining).forEach((f) => {
      if (f.size > MAX_FILE_BYTES) return;
      if (ALLOWED_FILE_TYPES.length && f.type && !ALLOWED_FILE_TYPES.includes(f.type)) {
        // allow unknown mime (some DWG/DXF have no mime), but block scripts/exe by extension
        if (/\.(exe|bat|cmd|sh|js|html|svg)$/i.test(f.name)) return;
      }
      nextMeta.push({ name: f.name, size: f.size });
      nextFiles.push(f);
    });
    setFileObjects(nextFiles);
    update('files', nextMeta);
  };
  const removeFile = (idx: number) => {
    const next = form.files.filter((_, i) => i !== idx);
    const nextFiles = fileObjects.filter((_, i) => i !== idx);
    setFileObjects(nextFiles);
    update('files', next);
  };

  const submit = async () => {
    if (!validateStep(5)) return;
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setUploadProgress(null);

    const customerTypeMap: Record<string, string> = {
      individual: 'individual',
      contractor: 'contractor',
      engineering: 'engineering_office',
      company: 'company',
      gov: 'government',
      other: 'other',
    };
    const serviceLocationMap: Record<string, string> = {
      'on-site': 'project_site',
      'at-provider': 'provider_location',
      'unsure': 'not_sure',
    };

    const payload = {
      customer_name: form.name.trim(),
      customer_phone: form.phone.trim(),
      customer_email: form.email.trim() || null,
      customer_type: customerTypeMap[form.clientType as string] ?? 'other',
      preferred_contact_method: form.contactPref,
      sector: form.sector,
      city: form.city.trim(),
      district: form.district.trim() || null,
      service_location_type: serviceLocationMap[form.serviceLocation as string] ?? 'not_sure',
      project_description: form.description.trim(),
      approx_dimensions: form.measurements.trim() || null,
      quantity: form.quantity.trim() || null,
      execution_timeline: form.timeline,
      has_budget: form.budgetMode === 'yes',
      budget_amount: form.budgetMode === 'yes' && form.budget ? Number(form.budget) || null : null,
      budget_note: form.budgetMode === 'after-quotes'
        ? 'after-quotes'
        : form.budgetMode === 'no' ? 'no-budget' : null,
      metadata: { locale: isRTL ? 'ar' : 'en' },
    };

    try {
      const result = await submitQuoteRequest(payload);
      const quoteId = result.quote_request_id;

      // Upload files (best-effort: the request is already saved)
      if (fileObjects.length) {
        setUploadProgress({ done: 0, total: fileObjects.length });
        for (let i = 0; i < fileObjects.length; i++) {
          const f = fileObjects[i];
          const path = `${quoteId}/${Date.now()}-${i}-${safeFileName(f.name)}`;
          let uploaded = true;
          try {
            await uploadQuoteRequestFile({ path, file: f });
          } catch (upErr) {
            uploaded = false;
            console.warn('quote file upload failed', upErr);
          }
          if (uploaded) {
            try {
              await createQuoteRequestFileRecord({
                quote_request_id: quoteId,
                user_id: user?.id ?? null,
                file_name: f.name,
                file_path: path,
                file_size: f.size,
                file_type: f.type || null,
              });
            } catch {
              // preserve previous fire-and-forget semantics — insert errors were not checked
            }
          }
          setUploadProgress({ done: i + 1, total: fileObjects.length });
        }
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setSubmittedId(quoteId);
      setSubmitted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setSubmitError(msg || bi(
        'تعذر إرسال الطلب حاليًا. حاول مرة أخرى، أو تواصل معنا إذا استمرت المشكلة.',
        'Could not send the request. Please try again or contact us.',
      ));
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  /* ---------------- success view ---------------- */

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container-app py-16 sm:py-24">
          <Card className="max-w-2xl mx-auto p-8 sm:p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-3">
              <Bi ar="تم استلام طلبك بنجاح" en="Your request was received" />
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-8">
              <Bi
                ar="وصلتنا تفاصيل طلبك. سيتم توجيهه حسب القطاع والمدينة لمساعدة مزودي الخدمة على فهم احتياجك والرد عليك بطريقة أوضح."
                en="We received your request. It will be routed by sector and city so providers can respond clearly."
              />
            </p>
            {submittedId && (
              <p className="text-xs text-muted-foreground mb-4 tech-content">
                <Bi ar="رقم الطلب: " en="Request ID: " />
                <span className="font-mono">{submittedId.slice(0, 8)}</span>
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <Button size="appLg" variant="primary" className="w-full sm:w-auto" onClick={() => navigate('/dashboard/my-requests')}>
                  <Bi ar="متابعة الطلب" en="Track request" />
                </Button>
              ) : (
                <Button size="appLg" variant="primary" className="w-full sm:w-auto" onClick={() => navigate('/auth?mode=signup')}>
                  <Bi ar="أنشئ حسابًا لمتابعة طلبك بسهولة" en="Create an account to track your request" />
                </Button>
              )}
              <Link to="/search">
                <Button size="appLg" variant="outline" className="w-full sm:w-auto">
                  <Bi ar="استعراض مزودين" en="Browse providers" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              <Bi
                ar="يمكنك تعديل بيانات الطلب أو إضافة صور لاحقًا إذا احتجت."
                en="You can update the details or add images later if needed."
              />
            </p>
          </Card>
        </main>
        <Footer />
        <ScrollToTop />
      </div>
    );
  }

  const progressPct = (step / TOTAL_STEPS) * 100;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const ChevronBack = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-muted/40 to-background border-b border-border/40">
          <div className="container-app py-10 sm:py-14 text-center max-w-3xl">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl text-foreground tracking-tight leading-tight">
              <Bi ar="اطلب عرض سعر لمشروعك" en="Request a quote for your project" />
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              <Bi
                ar="أرسل تفاصيل احتياجك بوضوح، وساعد مزودي الخدمة على تقديم عروض أدق حسب القطاع والمدينة."
                en="Send clear project details so providers can quote accurately by sector and city."
              />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <Bi ar="كلما كانت التفاصيل أوضح، كانت المقارنة أسهل." en="The clearer the details, the easier the comparison." />
            </p>
            <a href="#quote-form-anchor">
              <Button size="appLg" variant="primary" className="mt-6">
                <Bi ar="ابدأ الطلب" en="Start request" />
              </Button>
            </a>
          </div>
        </section>

        {/* Form + side trust panel */}
        <section className="container-app py-10 sm:py-14">
          <div id="quote-form-anchor" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <Card className="p-6 sm:p-8">
                {/* Stepper */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="font-semibold text-foreground">
                      <Bi ar={`الخطوة ${step} من ${TOTAL_STEPS}`} en={`Step ${step} of ${TOTAL_STEPS}`} />
                    </span>
                    <span><Bi ar={STEP_LABELS[step - 1].ar} en={STEP_LABELS[step - 1].en} /></span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Draft notice when ?sector= overrides a saved draft */}
                {draftNotice && (
                  <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-foreground">لديك طلب محفوظ سابقًا. يمكنك المتابعة أو بدء طلب جديد.</p>
                      <button
                        type="button"
                        onClick={() => {
                          try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
                          setForm({ ...emptyForm, sector: form.sector });
                          setFileObjects([]);
                          setStep(1);
                          setDraftNotice(false);
                        }}
                        className="mt-1 text-primary font-semibold hover:underline"
                      >
                        ابدأ طلبًا جديدًا
                      </button>
                    </div>
                  </div>
                )}

                {/* Step content */}
                {step === 1 && (
                  <div>
                    <StepHeading
                      ar="ما نوع الخدمة التي تحتاجها؟"
                      en="What service do you need?"
                      help={{
                        ar: 'اختر أقرب قطاع لاحتياجك. يمكنك توضيح التفاصيل في الخطوة التالية.',
                        en: 'Pick the closest sector. You can add specifics in the next step.',
                      }}
                    />
                    <ChoiceGrid
                      name={bi('القطاع', 'Sector')}
                      options={SECTORS.map((s) => ({ value: s.value, ar: s.ar, en: s.en }))}
                      value={form.sector}
                      onChange={(v) => update('sector', v as Sector)}
                    />
                    <FieldError message={errors.sector} />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <StepHeading
                      ar="أين يقع المشروع؟"
                      en="Where is the project located?"
                      help={{
                        ar: 'الموقع يساعد على توجيه الطلب لمزودين أقرب أو أنسب.',
                        en: 'Location helps route the request to nearer providers.',
                      }}
                    />
                    <div>
                      <Label htmlFor="q-city"><Bi ar="المدينة" en="City" /></Label>
                      <Input
                        id="q-city"
                        dir="auto"
                        className="h-12 mt-1.5"
                        placeholder={bi('مثال: الرياض', 'e.g. Riyadh')}
                        value={form.city}
                        onChange={(e) => update('city', e.target.value)}
                      />
                      <FieldError message={errors.city} />
                    </div>
                    <div>
                      <Label htmlFor="q-district">
                        <Bi ar="الحي (اختياري)" en="District (optional)" />
                      </Label>
                      <Input
                        id="q-district"
                        dir="auto"
                        className="h-12 mt-1.5"
                        placeholder={bi('مثال: العليا', 'e.g. Al Olaya')}
                        value={form.district}
                        onChange={(e) => update('district', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold text-foreground">
                        <Bi ar="هل الخدمة مطلوبة في موقع العميل أم لدى المزود؟" en="On client site or at provider?" />
                      </div>
                      <ChoiceGrid
                        name={bi('مكان الخدمة', 'Service location')}
                        cols="sm:grid-cols-3"
                        options={[
                          { value: 'on-site',     ar: 'في موقع المشروع',       en: 'At project site' },
                          { value: 'at-provider', ar: 'لدى الورشة أو المصنع',  en: 'At workshop / factory' },
                          { value: 'unsure',      ar: 'غير متأكد',              en: 'Not sure' },
                        ]}
                        value={form.serviceLocation}
                        onChange={(v) => update('serviceLocation', v as ServiceLocation)}
                      />
                      <FieldError message={errors.serviceLocation} />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <StepHeading
                      ar="ما تفاصيل المشروع؟"
                      en="What are the project details?"
                      help={{
                        ar: 'إضافة الصور أو المقاسات تساعد المزود على فهم الطلب بشكل أسرع.',
                        en: 'Photos or measurements help providers understand faster.',
                      }}
                    />
                    <div>
                      <Label htmlFor="q-desc"><Bi ar="وصف المشروع" en="Project description" /></Label>
                      <Textarea
                        id="q-desc"
                        dir="auto"
                        rows={5}
                        className="mt-1.5"
                        placeholder={bi(
                          'مثال: أحتاج تفصيل وتركيب شبابيك ألمنيوم لمنزل في جدة، مع توضيح المقاسات والصور إن وجدت.',
                          'e.g. I need aluminum windows fabricated and installed for a home in Jeddah.',
                        )}
                        value={form.description}
                        onChange={(e) => update('description', e.target.value)}
                      />
                      <FieldError message={errors.description} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="q-meas"><Bi ar="المقاسات التقريبية" en="Approx. measurements" /></Label>
                        <Input
                          id="q-meas"
                          dir="auto"
                          className="h-12 mt-1.5 tech-content"
                          placeholder={bi('مثال: 3 شبابيك، كل شباك 120×100 سم', 'e.g. 3 windows, 120×100 cm each')}
                          value={form.measurements}
                          onChange={(e) => update('measurements', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="q-qty"><Bi ar="الكمية (إن وجدت)" en="Quantity (if any)" /></Label>
                        <Input
                          id="q-qty"
                          dir="auto"
                          className="h-12 mt-1.5"
                          placeholder={bi('مثال: 5 وحدات', 'e.g. 5 units')}
                          value={form.quantity}
                          onChange={(e) => update('quantity', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label><Bi ar="صور أو مخططات (اختياري)" en="Photos or plans (optional)" /></Label>
                      <label
                        htmlFor="q-files"
                        className="mt-1.5 flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/40 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          <Bi ar="اسحب الملفات هنا أو اضغط للرفع" en="Drag files here or click to upload" />
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <Bi ar="صور، مخططات، PDF" en="Images, plans, PDF" />
                        </span>
                      </label>
                      <input
                        id="q-files"
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                      />
                      {form.files.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {form.files.map((f, i) => (
                            <li
                              key={`${f.name}-${i}`}
                              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-sm"
                            >
                              <span className="flex items-center gap-2 truncate">
                                <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="truncate">{f.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0 tech-content">
                                  {(f.size / 1024).toFixed(0)} KB
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="p-1 rounded hover:bg-destructive/10 text-destructive"
                                aria-label={bi('إزالة', 'Remove')}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <StepHeading
                      ar="متى تحتاج التنفيذ؟"
                      en="When do you need it done?"
                      help={{
                        ar: 'الموعد والميزانية يساعدان المزود على تقديم عرض أقرب لاحتياجك.',
                        en: 'Timeline and budget help providers send a closer match.',
                      }}
                    />
                    <div>
                      <ChoiceGrid
                        name={bi('الموعد', 'Timeline')}
                        options={[
                          { value: 'week',         ar: 'خلال أسبوع',                  en: 'Within a week' },
                          { value: 'two-weeks',    ar: 'خلال أسبوعين',                en: 'Within two weeks' },
                          { value: 'month',        ar: 'خلال شهر',                    en: 'Within a month' },
                          { value: 'flexible',     ar: 'غير مستعجل',                  en: 'Flexible' },
                          { value: 'ask-provider', ar: 'أريد معرفة المدة من المزود',  en: 'Ask the provider' },
                        ]}
                        value={form.timeline}
                        onChange={(v) => update('timeline', v as Timeline)}
                      />
                      <FieldError message={errors.timeline} />
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold text-foreground">
                        <Bi ar="هل لديك ميزانية تقريبية؟" en="Do you have an approximate budget?" />
                      </div>
                      <ChoiceGrid
                        name={bi('الميزانية', 'Budget')}
                        cols="sm:grid-cols-3"
                        options={[
                          { value: 'yes',          ar: 'نعم',                          en: 'Yes' },
                          { value: 'no',           ar: 'لا',                           en: 'No' },
                          { value: 'after-quotes', ar: 'أفضل استلام عروض أولًا',      en: 'Receive quotes first' },
                        ]}
                        value={form.budgetMode}
                        onChange={(v) => update('budgetMode', v as BudgetMode)}
                      />
                      {form.budgetMode === 'yes' && (
                        <div className="mt-3">
                          <Label htmlFor="q-budget">
                            <Bi ar="الميزانية التقريبية (ريال)" en="Approx. budget (SAR)" />
                          </Label>
                          <Input
                            id="q-budget"
                            inputMode="numeric"
                            className="h-12 mt-1.5 tech-content"
                            placeholder={bi('مثال: 5000', 'e.g. 5000')}
                            value={form.budget}
                            onChange={(e) => update('budget', e.target.value.replace(/[^\d]/g, ''))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-5">
                    <StepHeading ar="بيانات التواصل" en="Contact details" />
                    <div>
                      <Label htmlFor="q-name"><Bi ar="الاسم" en="Name" /></Label>
                      <Input
                        id="q-name"
                        dir="auto"
                        className="h-12 mt-1.5"
                        placeholder={bi('الاسم الكامل', 'Full name')}
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        autoComplete="name"
                      />
                      <FieldError message={errors.name} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="q-phone"><Bi ar="رقم الجوال" en="Mobile number" /></Label>
                        <Input
                          id="q-phone"
                          type="tel"
                          inputMode="tel"
                          dir="ltr"
                          className="h-12 mt-1.5 tech-content"
                          placeholder="05XXXXXXXX"
                          value={form.phone}
                          onChange={(e) => update('phone', e.target.value)}
                          autoComplete="tel"
                        />
                        <FieldError message={errors.phone} />
                      </div>
                      <div>
                        <Label htmlFor="q-email">
                          <Bi ar="البريد الإلكتروني (اختياري)" en="Email (optional)" />
                        </Label>
                        <Input
                          id="q-email"
                          type="email"
                          dir="ltr"
                          className="h-12 mt-1.5"
                          placeholder="name@example.com"
                          value={form.email}
                          onChange={(e) => update('email', e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold text-foreground">
                        <Bi ar="نوع العميل" en="Client type" />
                      </div>
                      <ChoiceGrid
                        name={bi('نوع العميل', 'Client type')}
                        options={[
                          { value: 'individual',  ar: 'فرد',                          en: 'Individual' },
                          { value: 'contractor',  ar: 'مقاول',                        en: 'Contractor' },
                          { value: 'engineering', ar: 'مكتب هندسي',                   en: 'Engineering office' },
                          { value: 'company',     ar: 'شركة',                         en: 'Company' },
                          { value: 'gov',         ar: 'جهة حكومية أو شبه حكومية',     en: 'Government / semi-gov' },
                          { value: 'other',       ar: 'أخرى',                         en: 'Other' },
                        ]}
                        value={form.clientType}
                        onChange={(v) => update('clientType', v as ClientType)}
                      />
                      <FieldError message={errors.clientType} />
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold text-foreground">
                        <Bi ar="طريقة التواصل المفضلة" en="Preferred contact method" />
                      </div>
                      <ChoiceGrid
                        name={bi('طريقة التواصل', 'Contact method')}
                        cols="sm:grid-cols-3"
                        options={[
                          { value: 'whatsapp', ar: 'واتساب',          en: 'WhatsApp' },
                          { value: 'call',     ar: 'اتصال',           en: 'Call' },
                          { value: 'email',    ar: 'بريد إلكتروني',    en: 'Email' },
                        ]}
                        value={form.contactPref}
                        onChange={(v) => update('contactPref', v as ContactPref)}
                      />
                      <FieldError message={errors.contactPref} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Bi
                        ar="سيتم استخدام بياناتك للتواصل حول طلبك فقط."
                        en="Your details will only be used to contact you about this request."
                      />
                    </p>
                    {submitError && (
                      <p role="alert" className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {submitError}
                      </p>
                    )}
                    {uploadProgress && (
                      <p className="text-sm text-muted-foreground">
                        <Bi
                          ar={`جارٍ رفع الملفات (${uploadProgress.done}/${uploadProgress.total})...`}
                          en={`Uploading files (${uploadProgress.done}/${uploadProgress.total})...`}
                        />
                      </p>
                    )}
                  </div>
                )}

                {/* Nav buttons */}
                <div className="mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    size="appLg"
                    onClick={goPrev}
                    disabled={step === 1 || submitting}
                    className="sm:min-w-[140px]"
                  >
                    <ChevronBack className="w-4 h-4" />
                    <Bi ar="السابق" en="Back" />
                  </Button>
                  {step < TOTAL_STEPS ? (
                    <Button type="button" variant="primary" size="appLg" onClick={goNext} className="sm:min-w-[180px]">
                      <Bi ar="التالي" en="Next" />
                      <Chevron className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="appLg"
                      onClick={submit}
                      disabled={submitting}
                      className="sm:min-w-[220px]"
                    >
                      {submitting
                        ? <Bi ar="جارٍ الإرسال..." en="Sending..." />
                        : <Bi ar="إرسال طلب عرض السعر" en="Send quote request" />}
                    </Button>
                  )}
                </div>
              </Card>
            </div>

            {/* Trust side panel */}
            <aside className="lg:col-span-1 space-y-6">
              <Card className="p-6">
                <h2 className="font-heading font-bold text-lg text-foreground mb-4">
                  <Bi ar="طلب أوضح. ردود أفضل." en="Clearer request. Better replies." />
                </h2>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {[
                    { icon: ListChecks, ar: 'تفاصيل منظمة بدل رسائل متفرقة',           en: 'Organized details instead of scattered chats' },
                    { icon: ImageIcon,  ar: 'إمكانية إضافة صور ومقاسات',                en: 'Attach photos and measurements' },
                    { icon: MapPin,     ar: 'توجيه الطلب حسب القطاع والمدينة',          en: 'Routed by sector and city' },
                    { icon: Layers,     ar: 'مناسب للأفراد والمقاولين والشركات',        en: 'For individuals, contractors and companies' },
                  ].map((it) => (
                    <li key={it.en} className="flex items-start gap-2.5">
                      <it.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span><Bi ar={it.ar} en={it.en} /></span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-5 border-t border-border/50 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <Bi
                      ar="قطاعات تساعدك على تنظيم طلب عرض السعر والتواصل مع مزودي الخدمة. الاتفاق النهائي وجودة التنفيذ يتمان بين العميل ومزود الخدمة."
                      en="Qitaat helps you organize the request and connect with providers. Final agreements and execution are between you and the provider."
                    />
                  </span>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="font-heading font-bold text-lg text-foreground mb-4">
                  <Bi ar="ماذا يحدث بعد إرسال الطلب؟" en="What happens after you send it?" />
                </h2>
                <ol className="space-y-3 text-sm text-muted-foreground list-decimal ms-5">
                  <li><Bi ar="نراجع تفاصيل الطلب من حيث الوضوح."        en="We review the request for clarity." /></li>
                  <li><Bi ar="يتم توجيهه حسب القطاع والمدينة."           en="It is routed by sector and city." /></li>
                  <li><Bi ar="يستطيع المزودون المناسبون فهم الطلب والرد." en="Relevant providers can understand and reply." /></li>
                  <li><Bi ar="تقارن الخيارات وتتواصل مع الأنسب."          en="You compare options and contact the best fit." /></li>
                </ol>
                <p className="mt-4 text-xs text-muted-foreground">
                  <Bi ar="كلما أضفت تفاصيل أكثر، كانت الردود أدق." en="The more details you add, the more accurate the replies." />
                </p>
              </Card>
            </aside>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border/40 bg-muted/20">
          <div className="container-app py-12 sm:py-16 max-w-3xl">
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground text-center mb-8">
              <Bi ar="أسئلة قد تساعدك قبل أن تبدأ" en="Questions before you start" />
            </h2>
            <div className="space-y-3">
              {[
                {
                  qAr: 'هل طلب عرض السعر مجاني؟',
                  qEn: 'Is requesting a quote free?',
                  aAr: 'يمكنك إرسال طلب عرض سعر عبر قطاعات. إذا وُجدت أي رسوم مستقبلية أو خدمات إضافية، سيتم توضيحها قبل المتابعة.',
                  aEn: 'You can send a quote request via Qitaat. Any future fees or extra services will be clarified beforehand.',
                },
                {
                  qAr: 'هل يجب أن أضيف صورًا؟',
                  qEn: 'Do I have to add images?',
                  aAr: 'ليست إلزامية، لكنها تساعد المزودين على فهم الطلب بشكل أفضل.',
                  aEn: 'Not required, but they help providers understand the request better.',
                },
                {
                  qAr: 'هل قطاعات تنفذ المشروع؟',
                  qEn: 'Does Qitaat execute the project?',
                  aAr: 'لا. قطاعات تساعد على تنظيم الطلب وربطك بمزودي الخدمة، بينما التنفيذ والاتفاق النهائي يكونان بينك وبين المزود.',
                  aEn: 'No. Qitaat helps organize the request and connects you with providers. Execution and final agreements are with the provider.',
                },
                {
                  qAr: 'هل يمكنني طلب أكثر من خدمة؟',
                  qEn: 'Can I request more than one service?',
                  aAr: 'نعم، يمكنك توضيح ذلك في وصف المشروع، أو إرسال أكثر من طلب إذا كانت الخدمات مختلفة.',
                  aEn: 'Yes — mention it in the description, or send separate requests for clearly different services.',
                },
              ].map((it) => (
                <details
                  key={it.qEn}
                  className="group rounded-xl border border-border/60 bg-card p-4 sm:p-5 open:shadow-[var(--elev-1)]"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-foreground">
                    <span><Bi ar={it.qAr} en={it.qEn} /></span>
                    <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    <Bi ar={it.aAr} en={it.aEn} />
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Provider CTA */}
        <section className="container-app py-14 sm:py-20">
          <Card className="p-8 sm:p-12 text-center bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-3">
              <Bi ar="هل تقدم هذه الخدمات؟" en="Do you provide these services?" />
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
              <Bi
                ar="أضف منشأتك في قطاعات ليصل إليك العملاء عند البحث عن مزودين في مجالك."
                en="Add your business on Qitaat so clients can find you when they search for providers in your field."
              />
            </p>
            <Link to="/auth?mode=signup&role=provider">
              <Button size="appLg" variant="primary">
                <Bi ar="أضف منشأتك" en="Add your business" />
              </Button>
            </Link>
          </Card>
        </section>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Quote;