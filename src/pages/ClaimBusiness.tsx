import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  Building2, Loader2, ShieldCheck, Upload, X, CheckCircle2,
  AlertCircle, FileText, ArrowLeft, Mail, Phone, User,
  Hash, ExternalLink, Sparkles, Clock, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  uploadPrivateDocument,
  removePrivateDocument,
} from '@/modules/files/services/private';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

interface ClaimableBusiness {
  id: string;
  ref_id: string | null;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  region: string | null;
  sectors: string[] | null;
  placeholder_owner: boolean;
  pending_claims_count: number;
}

interface UploadedFile {
  path: string;
  name: string;
  size: number;
  mime: string;
}

const MAX_FILE_MB = 10;
const MAX_FILES = 5;
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const schema = z.object({
  requester_name: z.string().trim().min(2).max(120),
  requester_phone: z.string().trim().min(6).max(30),
  requester_email: z.string().trim().email().max(180),
  commercial_registration: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().min(10).max(1500),
});

const errorMessage = (raw: string, isRTL: boolean): string => {
  const key = raw.toLowerCase();
  if (key.includes('auth_required'))
    return isRTL ? 'يلزم تسجيل الدخول قبل إرسال طلب المطالبة.' : 'You must sign in before submitting a claim.';
  if (key.includes('rate_limit_exceeded'))
    return isRTL ? 'تجاوزت الحد المسموح به (3 طلبات/ساعة). حاول لاحقاً.' : 'Rate limit exceeded (3 requests/hour). Please try later.';
  if (key.includes('business_not_claimable'))
    return isRTL ? 'هذه المنشأة لم تعد متاحة للمطالبة.' : 'This entity is no longer claimable.';
  if (key.includes('business_not_found'))
    return isRTL ? 'المنشأة غير موجودة.' : 'Entity not found.';
  if (key.includes('invalid_payload'))
    return isRTL ? 'بيانات النموذج غير مكتملة.' : 'Form data is incomplete.';
  return raw;
};

const ClaimBusiness: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  usePageMeta({
    title: isRTL ? 'مطالبة بملكية منشأة' : 'Claim Business Ownership',
    noindex: true,
  });
  useNoIndex();

  const [biz, setBiz] = useState<ClaimableBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    requester_name: '',
    requester_phone: '',
    requester_email: user?.email ?? '',
    commercial_registration: '',
    message: '',
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load business
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!businessId) { setNotFound(true); setLoading(false); return; }
      setLoading(true);
      const { data, error: rpcErr } = await supabase.rpc('get_claimable_business', { p_business_id: businessId });
      if (cancelled) return;
      if (rpcErr || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
      } else {
        const row = (Array.isArray(data) ? data[0] : data) as ClaimableBusiness;
        setBiz(row);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  // Auto-fill email from auth user if available
  useEffect(() => {
    if (user?.email && !form.requester_email) {
      setForm((f) => ({ ...f, requester_email: user.email ?? '' }));
    }
  }, [user?.email, form.requester_email]);

  const handleFiles = useCallback(async (selected: FileList | null) => {
    if (!selected || selected.length === 0 || !user) return;
    setError(null);
    setUploading(true);
    try {
      const incoming = Array.from(selected);
      const next: UploadedFile[] = [...files];
      for (const f of incoming) {
        if (next.length >= MAX_FILES) {
          throw new Error(isRTL ? `الحد الأقصى ${MAX_FILES} ملفات` : `Max ${MAX_FILES} files`);
        }
        if (!ALLOWED_MIME.includes(f.type)) {
          throw new Error(isRTL ? 'الصيغ المسموحة: PDF, JPG, PNG, WEBP' : 'Allowed: PDF, JPG, PNG, WEBP');
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          throw new Error(isRTL ? `حجم الملف يتجاوز ${MAX_FILE_MB}MB` : `File exceeds ${MAX_FILE_MB}MB`);
        }
        const ext = f.name.split('.').pop()?.toLowerCase() ?? 'bin';
        // Compress images before upload (PDFs pass through untouched).
        const { compressImage } = await import('@/lib/image-compress');
        const toUpload = f.type.startsWith('image/') ? await compressImage(f) : f;
        const finalExt = toUpload.type === 'image/webp' ? 'webp' : ext;
        const path = `${user.id}/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${finalExt}`;
        const { error: upErr } = await uploadPrivateDocument({
          bucket: 'ownership-claim-proofs',
          path,
          file: toUpload,
          options: { upsert: false, contentType: toUpload.type || f.type },
        });
        if (upErr) throw upErr;
        next.push({ path, name: f.name, size: toUpload.size, mime: toUpload.type || f.type });
      }
      setFiles(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, [files, user, businessId, isRTL]);

  const removeFile = useCallback(async (path: string) => {
    await removePrivateDocument({ bucket: 'ownership-claim-proofs', paths: [path] });
    setFiles((curr) => curr.filter((f) => f.path !== path));
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    if (!user) {
      setError(isRTL ? 'يلزم تسجيل الدخول.' : 'You must sign in first.');
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      setError(first ? `${first.path.join('.')}: ${first.message}` : (isRTL ? 'بيانات غير صحيحة' : 'Invalid data'));
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('submit_ownership_claim', {
        p_business_id: businessId!,
        p_requester_name: parsed.data.requester_name,
        p_requester_phone: parsed.data.requester_phone,
        p_requester_email: parsed.data.requester_email,
        p_commercial_registration: parsed.data.commercial_registration ?? '',
        p_message: parsed.data.message,
        p_proof_files: files as unknown as never,
      });
      if (rpcErr) throw rpcErr;
      const row = (Array.isArray(data) ? data[0] : data) as { request_id: string; status: string } | null;
      setSubmittedId(row?.request_id ?? 'submitted');
      toast.success(isRTL ? 'تم إرسال طلب المطالبة بنجاح' : 'Claim submitted successfully');
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = errorMessage(raw, isRTL);
      setError(friendly);
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  }, [user, form, files, businessId, isRTL]);

  // Centered shell used by every state so the page always shows Navbar + Footer.
  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 sm:pt-24 pb-12">{children}</main>
      <Footer />
    </div>
  );

  // Render — loading
  if (loading) {
    return (
      <Shell>
        <div className="container-app max-w-3xl space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </Shell>
    );
  }

  if (notFound || !biz) {
    return (
      <Shell>
        <div className="container-app max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-3 shadow-sm">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h1 className="text-lg font-bold">{isRTL ? 'المنشأة غير موجودة' : 'Entity not found'}</h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'تأكّد من صحة الرابط الذي وصلك.' : 'Please verify the link you received.'}
            </p>
            <Button asChild variant="outline" className="rounded-xl mt-2">
              <Link to="/"><ArrowLeft className="w-4 h-4 me-2" /> {isRTL ? 'العودة للرئيسية' : 'Back to home'}</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!biz.placeholder_owner) {
    return (
      <Shell>
        <div className="container-app max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-3 shadow-sm">
            <ShieldCheck className="w-12 h-12 mx-auto text-success" />
            <h1 className="text-lg font-bold">{isRTL ? 'هذه المنشأة لها مالك بالفعل' : 'Entity already has an owner'}</h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'لا يمكن المطالبة بمنشأة مملوكة لمستخدم نشط.' : 'You cannot claim an entity that already has an active owner.'}
            </p>
            <Button asChild variant="outline" className="rounded-xl mt-2">
              <Link to="/"><ArrowLeft className="w-4 h-4 me-2" /> {isRTL ? 'العودة للرئيسية' : 'Back to home'}</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (submittedId) {
    return (
      <Shell>
        <div className="container-app max-w-lg">
          <div className="rounded-3xl border border-success/40 bg-gradient-to-b from-success/5 to-background p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-success" />
            </div>
            <h1 className="text-xl font-bold">{isRTL ? 'تم استلام طلبك' : 'Claim received'}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isRTL
                ? 'سيقوم فريق الإدارة بمراجعة طلبك خلال 24 - 72 ساعة. ستصلك رسالة بنتيجة المراجعة على البريد المرفق.'
                : 'Our team will review your claim within 24 - 72 hours. You will receive an email with the result.'}
            </p>
            <div className="text-[12px] text-muted-foreground bg-card border border-border rounded-xl p-3">
              <div>{isRTL ? 'رقم الطلب' : 'Request ID'}</div>
              <div className="font-mono tech-content text-[11px] mt-1 break-all">{submittedId}</div>
            </div>
            <Button asChild className="rounded-xl">
              <Link to="/"><ArrowLeft className="w-4 h-4 me-2" /> {isRTL ? 'العودة للرئيسية' : 'Back to home'}</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  const bizName = (isRTL ? biz.name_ar : biz.name_en) || biz.name_ar || biz.name_en || '—';
  const profileHref = biz.username ? `/${encodeURIComponent(biz.username)}` : null;

  return (
    <Shell>
      <div className="container-app max-w-3xl space-y-5">
        {/* Hero — welcoming, professional, branded */}
        <section
          className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-6 sm:p-8"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="pointer-events-none absolute -top-16 -end-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -start-10 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            {biz.logo_url ? (
              <img
                src={biz.logo_url}
                alt={bizName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-border bg-card shadow-sm shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="w-10 h-10 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className="rounded-lg bg-success/10 text-success border-success/30 gap-1">
                  <ShieldCheck className="w-3 h-3" /> {isRTL ? 'متاحة للمطالبة' : 'Claimable'}
                </Badge>
                {biz.ref_id && (
                  <Badge variant="outline" className="rounded-lg gap-1 tech-content">
                    <Hash className="w-3 h-3" /> {biz.ref_id}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight" dir="auto">{bizName}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                {biz.region && <span dir="auto">{biz.region}</span>}
                {profileHref && (
                  <Link
                    to={profileHref}
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {isRTL ? 'عرض الملف العام' : 'View public profile'}
                  </Link>
                )}
                {biz.pending_claims_count > 0 && (
                  <span className="text-warning">
                    {isRTL
                      ? `${biz.pending_claims_count} طلب آخر قيد المراجعة`
                      : `${biz.pending_claims_count} other pending claim(s)`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <h2 className="relative mt-6 text-base sm:text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            {isRTL
              ? 'مرحبًا بك — استلم ملكية منشأتك على قِطاعات'
              : 'Welcome — take ownership of your business on Qitaat'}
          </h2>
          <p className="relative mt-1.5 text-[13px] sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {isRTL
              ? 'أكمل النموذج بالأسفل لإثبات صلتك بالمنشأة. بعد الموافقة، ستتمكن من تعديل بيانات الجهة، إضافة الخدمات والفروع، واستقبال طلبات العملاء مباشرة.'
              : 'Complete the form below to verify your relationship. Once approved, you can edit the entity profile, add services and branches, and receive customer requests directly.'}
          </p>

          {/* Trust strip */}
          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: ShieldCheck, ar: 'تحقّق آمن', en: 'Secure verification' },
              { icon: Clock, ar: 'مراجعة 24-72 ساعة', en: '24-72h review' },
              { icon: Lock, ar: 'بياناتك محمية', en: 'Your data is protected' },
            ].map(({ icon: Icon, ar, en }) => (
              <div
                key={en}
                className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-2.5 py-2 text-[11px] sm:text-[12px]"
              >
                <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">{isRTL ? ar : en}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Steps card */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 text-[13px] leading-relaxed">
          <p className="font-semibold mb-2">{isRTL ? 'كيف تعمل عملية المطالبة؟' : 'How does the claim work?'}</p>
          <ol className="grid sm:grid-cols-3 gap-3">
            {[
              { n: 1, ar: 'تعبئة بياناتك ورفع إثبات الملكية', en: 'Fill in your details and upload proof' },
              { n: 2, ar: 'مراجعة الفريق خلال 24-72 ساعة', en: 'Team review within 24-72 hours' },
              { n: 3, ar: 'نقل الملكية لحسابك', en: 'Ownership transferred to your account' },
            ].map((s) => (
              <li key={s.n} className="flex items-start gap-2.5">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center tech-content">
                  {s.n}
                </span>
                <span className="text-muted-foreground mt-0.5">{isRTL ? s.ar : s.en}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Intro */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-[13px] leading-relaxed">
          <p className="font-semibold mb-1">{isRTL ? 'كيف تعمل عملية المطالبة؟' : 'How claim works'}</p>
          <ol className="list-decimal ms-5 space-y-1 text-muted-foreground">
            <li>{isRTL ? 'تعبئة بياناتك ورفع إثبات الملكية (سجل تجاري، تفويض…).' : 'Fill in your details and upload proof (CR, authorization…).'}</li>
            <li>{isRTL ? 'يراجع فريق الإدارة الطلب خلال 24-72 ساعة.' : 'Our team reviews the claim within 24-72 hours.'}</li>
            <li>{isRTL ? 'عند الموافقة تُنقَل ملكية المنشأة لحسابك.' : 'Once approved, ownership is transferred to your account.'}</li>
          </ol>
        </div>

        {/* Auth gate */}
        {!user ? (
          <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5 text-center space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-warning" />
            <p className="text-sm">
              {isRTL ? 'يلزم تسجيل الدخول قبل تقديم طلب المطالبة.' : 'You must sign in before submitting a claim.'}
            </p>
            <Button asChild className="rounded-xl">
              <Link to={`/auth?redirect=${encodeURIComponent(`/claim/${businessId}`)}`}>
                {isRTL ? 'تسجيل الدخول' : 'Sign in'}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-bold">{isRTL ? 'بيانات الطالب' : 'Claimant details'}</h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11.5px] font-medium flex items-center gap-1.5"><User className="w-3 h-3" /> {isRTL ? 'الاسم الكامل' : 'Full name'} *</label>
                <Input dir="auto" className="h-11 rounded-xl" value={form.requester_name}
                  onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                  placeholder={isRTL ? 'مثال: محمد العتيبي' : 'e.g. Mohammed Al-Otaibi'} />
              </div>
              <div className="space-y-1">
                <label className="text-[11.5px] font-medium flex items-center gap-1.5"><Phone className="w-3 h-3" /> {isRTL ? 'رقم الجوال' : 'Mobile'} *</label>
                <Input dir="ltr" className="h-11 rounded-xl tech-content" value={form.requester_phone}
                  onChange={(e) => setForm({ ...form, requester_phone: e.target.value })}
                  placeholder="+9665XXXXXXXX" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11.5px] font-medium flex items-center gap-1.5"><Mail className="w-3 h-3" /> {isRTL ? 'البريد الإلكتروني' : 'Email'} *</label>
                <Input dir="ltr" type="email" className="h-11 rounded-xl tech-content" value={form.requester_email}
                  onChange={(e) => setForm({ ...form, requester_email: e.target.value.toLowerCase().trim() })}
                  placeholder="you@company.com" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11.5px] font-medium flex items-center gap-1.5"><FileText className="w-3 h-3" /> {isRTL ? 'رقم السجل التجاري' : 'Commercial Registration'}</label>
                <Input dir="ltr" className="h-11 rounded-xl tech-content" value={form.commercial_registration}
                  onChange={(e) => setForm({ ...form, commercial_registration: e.target.value })}
                  placeholder="1010xxxxxx" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11.5px] font-medium">{isRTL ? 'رسالة للإدارة' : 'Message for admin'} *</label>
                <Textarea dir="auto" rows={4} className="rounded-xl"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={isRTL
                    ? 'اشرح علاقتك بالمنشأة وأي معلومات تُسهّل التحقق…'
                    : 'Explain your relation to the entity and any verification info…'} />
                <div className="text-[10.5px] text-muted-foreground text-end">{form.message.length}/1500</div>
              </div>
            </div>

            {/* Proof files */}
            <div className="space-y-2">
              <label className="text-[11.5px] font-medium">{isRTL ? 'ملفات الإثبات (PDF / صور — اختياري)' : 'Proof files (PDF / images — optional)'}</label>
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f.path} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-[12px] truncate flex-1" dir="auto">{f.name}</span>
                    <span className="text-[10.5px] text-muted-foreground tech-content">{(f.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => void removeFile(f.path)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {files.length < MAX_FILES && (
                  <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer text-[12px] text-muted-foreground">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{isRTL ? `اختر ملفاً (حد أقصى ${MAX_FILE_MB}MB)` : `Choose file (max ${MAX_FILE_MB}MB)`}</span>
                    <input type="file" multiple accept={ALLOWED_MIME.join(',')} className="hidden"
                      onChange={(e) => { void handleFiles(e.target.files); e.target.value = ''; }} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12px] text-destructive flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1 break-words">{error}</span>
              </div>
            )}

            <Button onClick={() => void submit()} disabled={submitting || uploading} className="w-full h-11 rounded-xl">
              {submitting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 me-2" />}
              {isRTL ? 'إرسال طلب المطالبة' : 'Submit claim'}
            </Button>

            <p className="text-[10.5px] text-muted-foreground text-center">
              {isRTL
                ? 'بإرسال هذا الطلب فإنك تُقرّ بصحة البيانات وتوافق على شروط الخدمة.'
                : 'By submitting you confirm the accuracy of the data and agree to the terms of service.'}
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
};

export default ClaimBusiness;