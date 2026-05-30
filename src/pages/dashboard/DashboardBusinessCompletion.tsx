import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerBusiness } from '@/modules/businesses';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Check, Circle, Clock, AlertTriangle, ShieldCheck, Send,
  MapPin, Phone, FileText, Layers, Image as ImageIcon, ArrowRight,
} from 'lucide-react';

type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'needs_changes' | 'rejected' | 'approved';

interface BusinessRow {
  id: string;
  ref_id: string | null;
  approval_status: ApprovalStatus | null;
  onboarding_completion: number | null;
  approval_notes: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  description_ar: string | null;
  short_description_ar: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  city_id: string | null;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  sectors: string[] | null;
  sub_services: string[] | null;
  national_id: string | null;
  unified_number: string | null;
}

interface ChecklistItem {
  key: string;
  label_ar: string;
  label_en: string;
  done: boolean;
  to: string;
  Icon: typeof Building2;
}

function buildChecklist(b: BusinessRow): ChecklistItem[] {
  const has = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : v != null;
  return [
    {
      key: 'identity',
      label_ar: 'اسم المنشأة وشعارها',
      label_en: 'Business name & logo',
      done: has(b.name_ar) && has(b.logo_url),
      to: '/onboarding',
      Icon: ImageIcon,
    },
    {
      key: 'about',
      label_ar: 'وصف ونبذة عن المنشأة',
      label_en: 'About & short description',
      done: has(b.description_ar) && has(b.short_description_ar),
      to: '/onboarding',
      Icon: FileText,
    },
    {
      key: 'contact',
      label_ar: 'وسائل التواصل (هاتف/جوال/إيميل)',
      label_en: 'Contact channels (phone, mobile, email)',
      done: (has(b.phone) || has(b.mobile)) && has(b.email),
      to: '/onboarding',
      Icon: Phone,
    },
    {
      key: 'location',
      label_ar: 'الموقع والعنوان على الخريطة',
      label_en: 'Location & map address',
      done: has(b.city_id) && has(b.address) && b.latitude != null && b.longitude != null,
      to: '/onboarding',
      Icon: MapPin,
    },
    {
      key: 'sectors',
      label_ar: 'القطاعات والخدمات',
      label_en: 'Sectors & services',
      done: has(b.sectors) && has(b.sub_services),
      to: '/onboarding',
      Icon: Layers,
    },
    {
      key: 'legal',
      label_ar: 'البيانات النظامية (الرقم الموحّد/السجل)',
      label_en: 'Legal identifiers (unified / national ID)',
      done: has(b.national_id) || has(b.unified_number),
      to: '/onboarding',
      Icon: ShieldCheck,
    },
  ];
}

const statusMeta: Record<ApprovalStatus, { ar: string; en: string; tone: 'info' | 'success' | 'warning' | 'destructive' }> = {
  draft:         { ar: 'مسودة',           en: 'Draft',           tone: 'warning' },
  submitted:     { ar: 'تم الإرسال',      en: 'Submitted',       tone: 'info' },
  under_review:  { ar: 'تحت المراجعة',    en: 'Under review',    tone: 'info' },
  needs_changes: { ar: 'بحاجة لتعديلات',  en: 'Needs changes',   tone: 'destructive' },
  rejected:      { ar: 'مرفوضة',          en: 'Rejected',        tone: 'destructive' },
  approved:      { ar: 'معتمدة',          en: 'Approved',        tone: 'success' },
};

const toneClasses: Record<'info' | 'success' | 'warning' | 'destructive', string> = {
  info:        'border-info/30 bg-info/5 text-info',
  success:     'border-emerald-500/30 bg-emerald-500/5 text-emerald-600',
  warning:     'border-warning/30 bg-warning/5 text-warning',
  destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
};

const DashboardBusinessCompletion: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  usePageMeta({
    title: isRTL ? 'إكمال بيانات المنشأة | قِطاعات' : 'Complete Business Profile | Qitaat',
    noindex: true,
  });

  const { data: business, isLoading } = useQuery({
    queryKey: ['business-completion', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BusinessRow | null> => {
      if (!user) return null;
      const { data } = await getOwnerBusiness<BusinessRow>({
        userId: user.id,
        select: 'id, ref_id, approval_status, onboarding_completion, approval_notes, name_ar, name_en, logo_url, description_ar, short_description_ar, phone, mobile, email, city_id, region, address, latitude, longitude, sectors, sub_services, national_id, unified_number',
        orderBy: { column: 'created_at', ascending: false },
        limit: 1,
      });
      return (data as BusinessRow | null) ?? null;
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => business ? buildChecklist(business) : [], [business]);
  const completed = items.filter((i) => i.done).length;
  const totalSteps = items.length;
  const computedPct = totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;
  const dbPct = business?.onboarding_completion ?? 0;
  const pct = Math.max(computedPct, dbPct);
  const status: ApprovalStatus = (business?.approval_status as ApprovalStatus) ?? 'draft';
  const meta = statusMeta[status];

  // First incomplete checklist item — drives the "Resume setup" CTA so the
  // user lands directly on the missing field instead of restarting the wizard.
  const firstIncomplete = useMemo(() => items.find((i) => !i.done) ?? null, [items]);
  const resumeTarget = firstIncomplete
    ? `${firstIncomplete.to}?focus=${firstIncomplete.key}#${firstIncomplete.key}`
    : '/onboarding';
  const resumeLabel = firstIncomplete
    ? (isRTL ? firstIncomplete.label_ar : firstIncomplete.label_en)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:py-12 max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {isRTL ? 'إكمال بيانات المنشأة' : 'Complete your business profile'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isRTL
              ? 'الخطوات تتغيّر حسب حالة الاعتماد لمساعدتك على رفع جاهزية منشأتك بأسرع وقت.'
              : 'Steps adapt to your approval status to help you reach readiness fast.'}
          </p>
        </header>

        {business && (
          <section
            className="mb-5 rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
            aria-label={isRTL ? 'هوية المنشأة' : 'Business identity'}
          >
            <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {isRTL ? 'بيانات المنشأة (وليس بيانات المستخدم)' : 'Entity profile (not user account)'}
              </p>
              <p className="text-sm font-semibold text-foreground truncate" dir="auto">
                {(isRTL ? business.name_ar : business.name_en) || business.name_ar || business.name_en
                  || (isRTL ? 'منشأة بدون اسم' : 'Unnamed entity')}
              </p>
              {business.ref_id && (
                <p className="text-[11px] text-muted-foreground mt-0.5 tech-content font-mono">
                  {business.ref_id}
                </p>
              )}
            </div>
          </section>
        )}

        {isLoading && (
          <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            {isRTL ? 'جارِ التحميل...' : 'Loading…'}
          </div>
        )}

        {!isLoading && !business && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-6">
            <p className="text-sm text-foreground mb-3">
              {isRTL ? 'لا توجد منشأة مرتبطة بحسابك بعد.' : 'No business is linked to your account yet.'}
            </p>
            <Button size="sm" onClick={() => navigate('/onboarding')} className="gap-1.5">
              <Building2 className="w-4 h-4" />
              {isRTL ? 'إنشاء المنشأة' : 'Create business'}
            </Button>
          </div>
        )}

        {business && (
          <>
            {/* Status banner */}
            <section className={`rounded-xl border px-4 py-4 mb-5 ${toneClasses[meta.tone]}`} aria-live="polite">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {status === 'approved' ? <ShieldCheck className="w-5 h-5" />
                    : status === 'needs_changes' || status === 'rejected' ? <AlertTriangle className="w-5 h-5" />
                    : status === 'submitted' || status === 'under_review' ? <Clock className="w-5 h-5" />
                    : <Building2 className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isRTL ? 'حالة الاعتماد:' : 'Approval status:'}{' '}
                    <span>{isRTL ? meta.ar : meta.en}</span>
                  </p>
                  {business.ref_id && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRTL ? 'الرقم المرجعي:' : 'Reference:'}{' '}
                      <span className="tech-content font-mono font-semibold text-foreground">{business.ref_id}</span>
                    </p>
                  )}
                  {status === 'needs_changes' && business.approval_notes && (
                    <p className="text-xs text-foreground/80 mt-2 leading-relaxed" dir="auto">
                      <span className="font-semibold">{isRTL ? 'ملاحظات المراجعة:' : 'Review notes:'}</span>{' '}
                      {business.approval_notes}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Progress */}
            <section className="rounded-xl border border-border bg-card px-4 py-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">
                  {isRTL ? 'جاهزية المنشأة' : 'Profile readiness'}
                </p>
                <span className="text-sm font-mono text-foreground">{pct}%</span>
              </div>
              <Progress value={pct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {isRTL
                  ? `${completed} من ${totalSteps} خطوات مكتملة`
                  : `${completed} of ${totalSteps} steps completed`}
              </p>
            </section>

            {/* Status-specific guidance */}
            <section className="rounded-xl border border-border bg-card px-4 py-4 mb-5">
              <p className="text-sm font-semibold text-foreground mb-1">
                {isRTL ? 'الخطوة التالية الموصى بها' : 'Recommended next step'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {status === 'approved'
                  ? (isRTL ? 'منشأتك معتمدة. يمكنك تحسين الجاهزية بإكمال أي عناصر متبقية.' : 'Your business is approved. You can still improve readiness by completing remaining items.')
                  : status === 'under_review' || status === 'submitted'
                    ? (isRTL ? 'طلبك قيد المراجعة. يمكنك مراجعة بياناتك أو الانتظار حتى يتم الرد.' : 'Your submission is under review. You may refine details while you wait.')
                    : status === 'needs_changes' || status === 'rejected'
                      ? (isRTL ? 'يرجى معالجة الملاحظات أعلاه ثم إعادة الإرسال.' : 'Please address the notes above, then resubmit.')
                      : completed < totalSteps
                        ? (isRTL ? 'أكمل العناصر المتبقية ثم أرسل المنشأة للمراجعة.' : 'Complete the remaining items, then submit your business for review.')
                        : (isRTL ? 'بياناتك مكتملة — أرسل المنشأة للمراجعة الآن.' : 'Everything is filled in — submit your business for review now.')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => navigate(resumeTarget)}
                  aria-label={resumeLabel
                    ? (isRTL ? `استئناف الإعداد عند: ${resumeLabel}` : `Resume setup at: ${resumeLabel}`)
                    : (isRTL ? 'استئناف الإعداد' : 'Resume setup')}
                >
                  <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                  {isRTL ? 'استئناف الإعداد' : 'Resume setup'}
                  {resumeLabel && (
                    <span className="opacity-80">
                      {isRTL ? `– ${resumeLabel}` : `– ${resumeLabel}`}
                    </span>
                  )}
                </Button>
                {status === 'draft' && completed === totalSteps && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => navigate('/onboarding?step=summary')}>
                    <Send className="w-3.5 h-3.5" />
                    {isRTL ? 'إرسال للمراجعة' : 'Submit for review'}
                  </Button>
                )}
              </div>
            </section>

            {/* Checklist */}
            <section className="rounded-xl border border-border bg-card divide-y divide-border" aria-label={isRTL ? 'قائمة الإكمال' : 'Completion checklist'}>
              {items.map((it) => (
                <Link
                  key={it.key}
                  to={it.to}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${it.done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    {it.done ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </span>
                  <it.Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className={`text-sm flex-1 ${it.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {isRTL ? it.label_ar : it.label_en}
                  </span>
                  <ArrowRight className={`w-4 h-4 text-muted-foreground shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              ))}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DashboardBusinessCompletion;