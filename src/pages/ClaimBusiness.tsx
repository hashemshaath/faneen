import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  Building2, Loader2, ShieldCheck, Upload, X, CheckCircle2,
  AlertCircle, FileText, ArrowLeft, Mail, Phone, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandLogo } from '@/components/common/BrandLogo';

interface ClaimableBusiness {
  id: string;
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
        const path = `${user.id}/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('ownership-claim-proofs')
          .upload(path, f, { upsert: false, contentType: f.type });
        if (upErr) throw upErr;
        next.push({ path, name: f.name, size: f.size, mime: f.type });
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
    await supabase.storage.from('ownership-claim-proofs').remove([path]);
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

  // Render
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !biz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-3">
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
    );
  }

  if (!biz.placeholder_owner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-3">
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
    );
  }

  if (submittedId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-success/40 bg-success/5 p-8 text-center space-y-4">
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
    );
  }

  const bizName = (isRTL ? biz.name_ar : biz.name_en) || biz.name_ar || biz.name_en || '—';

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <BrandLogo />
          <Badge variant="outline" className="rounded-lg bg-success/10 text-success border-success/30 gap-1">
            <ShieldCheck className="w-3 h-3" /> {isRTL ? 'متاحة للمطالبة' : 'Claimable'}
          </Badge>
        </div>

        {/* Business card */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          {biz.logo_url ? (
            <img src={biz.logo_url} alt={bizName} className="w-16 h-16 rounded-xl object-cover border border-border" loading="lazy" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold truncate" dir="auto">{bizName}</h1>
            {biz.region && <p className="text-[12px] text-muted-foreground mt-0.5" dir="auto">{biz.region}</p>}
            {biz.pending_claims_count > 0 && (
              <p className="text-[11px] text-warning mt-1">
                {isRTL ? `يوجد ${biz.pending_claims_count} طلب/طلبات أخرى معلّقة على نفس المنشأة` : `${biz.pending_claims_count} other pending claim(s) on this entity`}
              </p>
            )}
          </div>
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
    </div>
  );
};

export default ClaimBusiness;