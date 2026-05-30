import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Check, Circle, Clock, AlertTriangle, ShieldCheck, Send,
  MapPin, Phone, FileText, Layers, Image as ImageIcon, ArrowRight,
  Sparkles, TrendingUp, ExternalLink, Eye, Zap, ChevronRight, Lightbulb,
  CalendarClock, Target, Award,
} from 'lucide-react';

type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'needs_changes' | 'rejected' | 'approved' | 'published';

interface BusinessRow {
  id: string;
  ref_id: string | null;
  username: string | null;
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
  updated_at?: string | null;
  submitted_at?: string | null;
}

const has = (v: unknown) =>
  typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : v != null;

interface ChecklistField {
  key: string;
  label_ar: string;
  label_en: string;
  done: boolean;
  to: string;
}

interface ChecklistGroup {
  key: string;
  title_ar: string;
  title_en: string;
  hint_ar: string;
  hint_en: string;
  weight: number; // visibility / impact weight 0-100
  Icon: typeof Building2;
  fields: ChecklistField[];
}

function buildGroups(b: BusinessRow): ChecklistGroup[] {
  const link = (anchor: string) => `/dashboard/business-edit#${anchor}`;
  return [
    {
      key: 'identity',
      title_ar: 'الهوية البصرية',
      title_en: 'Brand identity',
      hint_ar: 'الاسم والشعار يحدّدان انطباع الزائر الأول.',
      hint_en: 'Name and logo shape the first impression.',
      weight: 20,
      Icon: ImageIcon,
      fields: [
        { key: 'name', label_ar: 'اسم المنشأة', label_en: 'Business name', done: has(b.name_ar) || has(b.name_en), to: link('name') },
        { key: 'logo', label_ar: 'الشعار', label_en: 'Logo', done: has(b.logo_url), to: link('logo') },
      ],
    },
    {
      key: 'about',
      title_ar: 'الوصف والتعريف',
      title_en: 'About & description',
      hint_ar: 'صفحات بوصف غني تتفوّق بفارق ٤٠٪ في الظهور.',
      hint_en: 'Pages with rich descriptions rank up to 40% higher.',
      weight: 18,
      Icon: FileText,
      fields: [
        { key: 'short', label_ar: 'نبذة مختصرة', label_en: 'Short description', done: has(b.short_description_ar), to: link('description') },
        { key: 'long', label_ar: 'وصف تفصيلي', label_en: 'Full description', done: has(b.description_ar), to: link('description') },
      ],
    },
    {
      key: 'contact',
      title_ar: 'وسائل التواصل',
      title_en: 'Contact channels',
      hint_ar: 'كل قناة تواصل إضافية ترفع نسبة التحويل.',
      hint_en: 'Each extra channel boosts conversion.',
      weight: 17,
      Icon: Phone,
      fields: [
        { key: 'phone', label_ar: 'هاتف أو جوال', label_en: 'Phone or mobile', done: has(b.phone) || has(b.mobile), to: link('phone') },
        { key: 'email', label_ar: 'البريد الإلكتروني', label_en: 'Email', done: has(b.email), to: link('email') },
      ],
    },
    {
      key: 'location',
      title_ar: 'الموقع الجغرافي',
      title_en: 'Location',
      hint_ar: 'الإحداثيات الدقيقة تُظهرك في خرائط البحث.',
      hint_en: 'Precise coordinates surface you in map search.',
      weight: 18,
      Icon: MapPin,
      fields: [
        { key: 'city', label_ar: 'المدينة', label_en: 'City', done: has(b.city_id), to: link('city') },
        { key: 'address', label_ar: 'العنوان', label_en: 'Address', done: has(b.address), to: link('address') },
        { key: 'geo', label_ar: 'دبوس الخريطة', label_en: 'Map pin', done: b.latitude != null && b.longitude != null, to: link('map') },
      ],
    },
    {
      key: 'sectors',
      title_ar: 'القطاعات والخدمات',
      title_en: 'Sectors & services',
      hint_ar: 'التصنيف الدقيق يربطك بالعملاء المهتمين فعلياً.',
      hint_en: 'Accurate tagging matches you with real intent.',
      weight: 15,
      Icon: Layers,
      fields: [
        { key: 'sectors', label_ar: 'القطاعات', label_en: 'Sectors', done: has(b.sectors), to: link('sectors') },
        { key: 'sub', label_ar: 'الخدمات الفرعية', label_en: 'Sub‑services', done: has(b.sub_services), to: link('sectors') },
      ],
    },
    {
      key: 'legal',
      title_ar: 'البيانات النظامية',
      title_en: 'Legal identifiers',
      hint_ar: 'الرقم الموحّد يُسرّع الاعتماد ويمنح شارة الموثوقية.',
      hint_en: 'Unified number speeds approval and unlocks verified badge.',
      weight: 12,
      Icon: ShieldCheck,
      fields: [
        { key: 'unified', label_ar: 'الرقم الموحّد / السجل', label_en: 'Unified / commercial ID', done: has(b.national_id) || has(b.unified_number), to: link('legal') },
      ],
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
  published:     { ar: 'منشورة',          en: 'Published',       tone: 'success' },
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = React.useState(false);
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
        select: 'id, ref_id, username, approval_status, onboarding_completion, approval_notes, name_ar, name_en, logo_url, description_ar, short_description_ar, phone, mobile, email, city_id, region, address, latitude, longitude, sectors, sub_services, national_id, unified_number, updated_at',
        orderBy: { column: 'created_at', ascending: false },
        limit: 1,
      });
      return (data as BusinessRow | null) ?? null;
    },
    staleTime: 30_000,
  });

  const groups = useMemo(() => (business ? buildGroups(business) : []), [business]);
  const allFields = useMemo(() => groups.flatMap((g) => g.fields), [groups]);
  const completed = allFields.filter((f) => f.done).length;
  const totalSteps = allFields.length;

  // Weighted readiness: each group contributes its weight × (fields done / fields total).
  const weightedPct = useMemo(() => {
    if (!groups.length) return 0;
    const totalWeight = groups.reduce((s, g) => s + g.weight, 0);
    const earned = groups.reduce((s, g) => {
      const ratio = g.fields.length ? g.fields.filter((f) => f.done).length / g.fields.length : 0;
      return s + g.weight * ratio;
    }, 0);
    return Math.round((earned / totalWeight) * 100);
  }, [groups]);

  const dbPct = business?.onboarding_completion ?? 0;
  const pct = Math.max(weightedPct, dbPct);
  const status: ApprovalStatus = (business?.approval_status as ApprovalStatus) ?? 'draft';
  const meta = statusMeta[status];

  // Top‑3 highest‑impact missing fields = sort missing fields by their group's weight.
  const prioritized = useMemo(() => {
    const out: Array<ChecklistField & { groupWeight: number; groupTitleAr: string; groupTitleEn: string }> = [];
    for (const g of groups) {
      for (const f of g.fields) {
        if (!f.done) out.push({ ...f, groupWeight: g.weight, groupTitleAr: g.title_ar, groupTitleEn: g.title_en });
      }
    }
    return out.sort((a, b) => b.groupWeight - a.groupWeight).slice(0, 3);
  }, [groups]);

  const firstIncomplete = prioritized[0] ?? null;
  const resumeTarget = firstIncomplete?.to ?? '/dashboard/business-edit';
  const resumeLabel = firstIncomplete ? (isRTL ? firstIncomplete.label_ar : firstIncomplete.label_en) : null;

  const canSubmit = status === 'draft' || status === 'needs_changes' || status === 'rejected';
  const readyToSubmit = canSubmit && completed === totalSteps;

  const onSubmitForReview = async () => {
    if (!business || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ approval_status: 'submitted' })
        .eq('id', business.id);
      if (error) throw error;
      toast({
        title: isRTL ? 'تم الإرسال للمراجعة' : 'Submitted for review',
        description: isRTL ? 'سنخبرك فور صدور قرار المراجعة.' : 'We will notify you once a decision is made.',
      });
      queryClient.invalidateQueries({ queryKey: ['business-completion', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['provider-readiness', user?.id] });
    } catch (e) {
      toast({
        title: isRTL ? 'تعذّر الإرسال' : 'Submission failed',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Visibility boost is a friendly mapping of completion to expected uplift.
  const visibilityBoost = Math.round(pct * 1.4); // up to ~140% relative uplift at 100%
  const lastUpdated = business?.updated_at
    ? new Date(business.updated_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  // Approval timeline steps — purely visual.
  const timelineSteps: Array<{ key: ApprovalStatus | 'start'; ar: string; en: string }> = [
    { key: 'draft', ar: 'مسودة', en: 'Draft' },
    { key: 'submitted', ar: 'تم الإرسال', en: 'Submitted' },
    { key: 'under_review', ar: 'تحت المراجعة', en: 'Under review' },
    { key: 'approved', ar: 'معتمدة', en: 'Approved' },
  ];
  const timelineIndex = (() => {
    if (status === 'approved' || status === 'published') return 3;
    if (status === 'under_review') return 2;
    if (status === 'submitted') return 1;
    if (status === 'needs_changes' || status === 'rejected') return 1;
    return 0;
  })();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:py-12 max-w-6xl">
        {/* Page header */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              {isRTL ? 'لوحة التحكم • بيانات المنشأة' : 'Dashboard • Business profile'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {isRTL ? 'إكمال ملف المنشأة' : 'Complete your business profile'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              {isRTL
                ? 'هذه الصفحة تخصّ بيانات المنشأة فقط — وليست بيانات حسابك الشخصي. كل خطوة تُكملها ترفع جاهزيتك وفرص ظهورك.'
                : 'This page is for your business entity — not your personal account. Every step you complete raises readiness and visibility.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard')}>
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? '' : 'rotate-180'}`} />
              {isRTL ? 'الرجوع للوحة' : 'Back to dashboard'}
            </Button>
          </div>
        </header>

        {isLoading && (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-sm text-muted-foreground text-center">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* LEFT — hero + stats column */}
            <aside className="lg:col-span-1 space-y-5">
              {/* Identity hero */}
              <section
                className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-5"
                aria-label={isRTL ? 'هوية المنشأة' : 'Business identity'}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden ring-1 ring-border">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {isRTL ? 'بيانات المنشأة' : 'Entity profile'}
                    </p>
                    <p className="text-base font-bold text-foreground truncate" dir="auto">
                      {(isRTL ? business.name_ar : business.name_en) || business.name_ar || business.name_en
                        || (isRTL ? 'منشأة بدون اسم' : 'Unnamed entity')}
                    </p>
                    {business.ref_id && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] text-muted-foreground tech-content font-mono">{business.ref_id}</span>
                        <CopyButton value={business.ref_id} size="xs" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Radial progress */}
                <div className="flex items-center gap-4">
                  <RadialProgress value={pct} tone={meta.tone} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{isRTL ? 'الجاهزية الموزونة' : 'Weighted readiness'}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {completed} / {totalSteps} {isRTL ? 'حقل مكتمل' : 'fields complete'}
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-1.5 text-[10px] gap-1 ${toneClasses[meta.tone]}`}
                    >
                      {status === 'approved' || status === 'published' ? <ShieldCheck className="w-3 h-3" />
                        : status === 'needs_changes' || status === 'rejected' ? <AlertTriangle className="w-3 h-3" />
                        : status === 'submitted' || status === 'under_review' ? <Clock className="w-3 h-3" />
                        : <Circle className="w-3 h-3" />}
                      {isRTL ? meta.ar : meta.en}
                    </Badge>
                  </div>
                </div>
              </section>

              {/* Impact card */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    {isRTL ? 'أثر الإكمال على الظهور' : 'Visibility impact'}
                  </p>
                </div>
                <div className="space-y-3">
                  <ImpactStat
                    Icon={Eye}
                    label={isRTL ? 'تحسّن الظهور المتوقع' : 'Expected visibility uplift'}
                    value={`+${visibilityBoost}%`}
                  />
                  <ImpactStat
                    Icon={Target}
                    label={isRTL ? 'دقّة المطابقة بالقطاع' : 'Sector match accuracy'}
                    value={`${Math.min(100, Math.round(pct * 0.95))}%`}
                  />
                  <ImpactStat
                    Icon={Award}
                    label={isRTL ? 'مستوى الموثوقية' : 'Trust level'}
                    value={
                      pct >= 90 ? (isRTL ? 'ممتاز' : 'Excellent')
                        : pct >= 60 ? (isRTL ? 'جيد' : 'Good')
                        : (isRTL ? 'يحتاج تحسين' : 'Needs work')
                    }
                  />
                </div>
                {lastUpdated && (
                  <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    {isRTL ? `آخر تحديث: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
                  </p>
                )}
              </section>

              {/* Approval timeline */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground mb-4">
                  {isRTL ? 'مسار الاعتماد' : 'Approval journey'}
                </p>
                <ol className="relative space-y-3">
                  {timelineSteps.map((s, i) => {
                    const done = i <= timelineIndex;
                    const current = i === timelineIndex;
                    return (
                      <li key={s.key} className="flex items-start gap-3">
                        <span
                          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border
                            ${done ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}
                            ${current ? 'ring-2 ring-primary/30' : ''}`}
                        >
                          {done ? <Check className="w-3 h-3" /> : i + 1}
                        </span>
                        <div className="flex-1 pb-1">
                          <p className={`text-xs ${done ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                            {isRTL ? s.ar : s.en}
                          </p>
                          {current && status === 'needs_changes' && (
                            <p className="text-[10px] text-destructive mt-0.5">
                              {isRTL ? 'يحتاج تعديلات' : 'Needs changes'}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </aside>

            {/* RIGHT — content column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Review notes banner */}
              {(status === 'needs_changes' || status === 'rejected') && business.approval_notes && (
                <section className={`rounded-2xl border px-4 py-4 ${toneClasses.destructive}`} aria-live="polite">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">
                        {isRTL ? 'ملاحظات فريق المراجعة' : 'Review team notes'}
                      </p>
                      <p className="text-xs text-foreground/80 mt-1 leading-relaxed" dir="auto">
                        {business.approval_notes}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Next steps panel */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-accent" />
                  <p className="text-sm font-semibold text-foreground">
                    {isRTL ? 'أعلى ٣ خطوات تأثيراً الآن' : 'Top 3 high‑impact next steps'}
                  </p>
                </div>
                {prioritized.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'كل البنود مكتملة — أحسنت! 🎉' : 'All items complete — great job! 🎉'}
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-2.5">
                    {prioritized.map((p) => (
                      <Link
                        key={p.key}
                        to={p.to}
                        className="group rounded-xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-all p-3 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {isRTL ? p.groupTitleAr : p.groupTitleEn}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-accent/40 text-accent">
                            +{p.groupWeight}%
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {isRTL ? p.label_ar : p.label_en}
                        </p>
                        <span className="text-[11px] text-primary inline-flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                          {isRTL ? 'إكمال الآن' : 'Complete now'}
                          <ChevronRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate(resumeTarget)}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {isRTL ? 'استئناف الإعداد' : 'Resume setup'}
                    {resumeLabel && <span className="opacity-80">– {resumeLabel}</span>}
                  </Button>
                  {readyToSubmit && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={onSubmitForReview}
                      disabled={submitting}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitting
                        ? (isRTL ? 'جارِ الإرسال…' : 'Submitting…')
                        : (isRTL ? 'إرسال للمراجعة' : 'Submit for review')}
                    </Button>
                  )}
                  {(status === 'approved' || status === 'published') && business.username && (
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                      <a href={`/${business.username}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" />
                        {isRTL ? 'عرض الصفحة العامة' : 'View public profile'}
                      </a>
                    </Button>
                  )}
                </div>
              </section>

              {/* Grouped checklist */}
              <section className="space-y-3" aria-label={isRTL ? 'قائمة الإكمال' : 'Completion checklist'}>
                {groups.map((g) => {
                  const doneCount = g.fields.filter((f) => f.done).length;
                  const groupPct = Math.round((doneCount / g.fields.length) * 100);
                  const fullyDone = doneCount === g.fields.length;
                  return (
                    <article
                      key={g.key}
                      className={`rounded-2xl border bg-card p-4 transition-colors ${fullyDone ? 'border-emerald-500/30' : 'border-border'}`}
                    >
                      <header className="flex items-center gap-3 mb-3">
                        <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                          ${fullyDone ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                          <g.Icon className="w-4.5 h-4.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-semibold text-foreground">
                              {isRTL ? g.title_ar : g.title_en}
                            </h2>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border text-muted-foreground">
                              {isRTL ? `وزن ${g.weight}%` : `${g.weight}% weight`}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isRTL ? g.hint_ar : g.hint_en}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground shrink-0">{groupPct}%</span>
                      </header>
                      <Progress
                        value={groupPct}
                        className={`h-1.5 mb-3 ${fullyDone ? '[&>div]:bg-emerald-500' : ''}`}
                      />
                      <ul className="space-y-1">
                        {g.fields.map((f) => (
                          <li key={f.key}>
                            <Link
                              to={f.to}
                              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                                ${f.done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                                {f.done ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                              </span>
                              <span className={`text-sm flex-1 ${f.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                {isRTL ? f.label_ar : f.label_en}
                              </span>
                              {!f.done && (
                                <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </section>

              {/* Tips & playbook */}
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    {isRTL ? 'نصائح سريعة لرفع الجاهزية' : 'Quick tips to raise readiness'}
                  </p>
                </div>
                <ul className="text-xs text-foreground/80 space-y-1.5 leading-relaxed">
                  <li>• {isRTL
                    ? 'استخدم شعاراً مربعاً بدقة لا تقل عن 512×512 على خلفية شفافة.'
                    : 'Use a square logo at 512×512+ on a transparent background.'}</li>
                  <li>• {isRTL
                    ? 'اكتب وصفاً يتراوح بين 120 و 300 كلمة يشمل القطاع والمناطق التي تخدمها.'
                    : 'Write a 120–300 word description covering your sector and service area.'}</li>
                  <li>• {isRTL
                    ? 'حدّد دبوس الخريطة بدقة — تحسين الظهور في البحث المحلي.'
                    : 'Drop the map pin precisely — boosts local search visibility.'}</li>
                  <li>• {isRTL
                    ? 'أضف الرقم الموحّد لفتح شارة "موثّق" بعد المراجعة.'
                    : 'Add the unified number to unlock the "Verified" badge after review.'}</li>
                </ul>
              </section>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DashboardBusinessCompletion;