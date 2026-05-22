import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { listOwnerBusinesses } from '@/modules/businesses';
import { toast } from 'sonner';
import { Layers, Plus, Pencil, Trash2, Send, Search, FileClock, Building2, CheckCircle2, Clock, ShieldCheck, Sparkles, Users, AlertCircle, Mail, UserCheck, HelpCircle, RefreshCw, WifiOff, Loader2 } from 'lucide-react';
import {
  listSectorsForBusiness, createSector, updateSector, deleteSector,
  submitSector, listAuditForSector, setSectorReason,
} from '@/features/private-sectors/service';
import {
  PS_STATUS_META, PS_BRAND_TYPE_META, PrivateSector,
} from '@/features/private-sectors/types';
import { PrivateSectorForm } from '@/features/private-sectors/PrivateSectorForm';
import { SectorDistributorsPanel } from '@/features/private-sectors/SectorDistributorsPanel';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';
import { PrivateSectorTemplatesShowcase } from '@/features/private-sectors/PrivateSectorTemplatesShowcase';
import type { PrivateSectorTemplate } from '@/features/private-sectors/templates';
import { MyInvitationsStatus } from '@/components/dashboard/MyInvitationsStatus';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';

const DashboardPrivateSectors: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<PrivateSector> | null>(null);
  const [auditFor, setAuditFor] = useState<string | null>(null);
  const [distributorsFor, setDistributorsFor] = useState<string | null>(null);

  // Resolve current user's business (owner OR staff). User may have multiple businesses.
  const {
    data: businesses = [],
    isLoading: loadingBusiness,
    isError: businessError,
    error: businessErrObj,
    isFetching: businessFetching,
    failureCount: businessFailureCount,
    refetch: refetchBusinesses,
  } = useQuery({
    queryKey: ['my-businesses-for-sectors', user?.id],
    enabled: !!user,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    queryFn: async () => {
      const owned = await listOwnerBusinesses<{ id: string; name_ar: string; name_en: string | null }>({
        userId: user!.id,
        select: 'id, name_ar, name_en',
        orderBy: { column: 'created_at', ascending: true },
      });
      if (owned.error) throw owned.error;
      const ownedRows = owned.data ?? [];
      const staff = await supabase
        .from('business_staff')
        .select('business_id, businesses:business_id(id, name_ar, name_en)')
        .eq('user_id', user!.id)
        .eq('is_active', true);
      if (staff.error) throw staff.error;
      const staffRows = (staff.data ?? [])
        .map((r: { businesses: { id: string; name_ar: string; name_en: string | null } | null }) => r.businesses)
        .filter((b): b is { id: string; name_ar: string; name_en: string | null } => !!b);
      const map = new Map<string, { id: string; name_ar: string; name_en: string | null }>();
      [...ownedRows, ...staffRows].forEach((b) => map.set(b.id, b));
      return Array.from(map.values());
    },
  });
  const businessIds = useMemo(() => businesses.map((b) => b.id), [businesses]);
  const { activeBusinessId } = useActiveBusiness(businessIds);
  const business = useMemo(
    () => businesses.find((b) => b.id === activeBusinessId) ?? businesses[0] ?? null,
    [businesses, activeBusinessId],
  );

  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ['my-private-sectors', business?.id],
    enabled: !!business?.id,
    queryFn: () => listSectorsForBusiness(business!.id),
  });

  const { data: audit = [] } = useQuery({
    queryKey: ['private-sector-audit', auditFor],
    enabled: !!auditFor,
    queryFn: () => listAuditForSector(auditFor!, 30),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? sectors.filter((s) => [s.name_ar, s.name_en, s.ref_id].filter(Boolean).some((v) => v!.toLowerCase().includes(q)))
      : sectors;
  }, [sectors, search]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['my-private-sectors', business?.id] });

  const saveMut = useMutation({
    mutationFn: async ({ values, reason }: { values: Partial<PrivateSector>; reason?: string }) => {
      if (reason) await setSectorReason(reason);
      if (editing?.id) return updateSector(editing.id, values);
      return createSector({ ...values, business_id: business!.id, name_ar: values.name_ar!, parent_sector: values.parent_sector ?? 'aluminum' });
    },
    onSuccess: () => { refresh(); setEditing(null); toast.success(isRTL ? 'تم الحفظ' : 'Saved'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const submitMut = useMutation({
    mutationFn: submitSector,
    onSuccess: () => { refresh(); toast.success(isRTL ? 'تم الإرسال للمراجعة' : 'Submitted for review'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const delMut = useMutation({
    mutationFn: deleteSector,
    onSuccess: () => { refresh(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  if (loadingBusiness) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            {isRTL ? 'جاري تحميل بيانات المنشأة…' : 'Loading business data…'}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (businessError) {
    const msg = businessErrObj instanceof Error ? businessErrObj.message : String(businessErrObj);
    return (
      <DashboardLayout>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-destructive/10 p-2">
                <WifiOff className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">
                  {isRTL ? 'تعذّر تحميل بيانات المنشأة' : 'Could not load business data'}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL
                    ? 'حدث خطأ مؤقت أثناء الاتصال بالخادم. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.'
                    : 'A temporary error occurred while contacting the server. Check your connection and try again.'}
                </p>
                {businessFailureCount > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isRTL
                      ? `عدد المحاولات التلقائية: ${businessFailureCount}`
                      : `Automatic retry attempts: ${businessFailureCount}`}
                  </p>
                )}
                <p className="text-[11px] text-destructive/80 mt-2 tech-content break-all">{msg}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => refetchBusinesses()} disabled={businessFetching} className="gap-1.5">
              {businessFetching
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              {isRTL ? 'إعادة تحميل الصفحة' : 'Reload page'}
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <MyInvitationsStatus />
          <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 p-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">
                  {isRTL ? 'لا توجد منشأة مرتبطة بحسابك' : 'No business linked to your account'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL
                    ? 'لا يمكن إدارة القطاعات الخاصة قبل ربط حسابك بمنشأة. تحقّق من الأسباب التالية:'
                    : 'You need a linked business before managing private sectors. Check the common reasons below:'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-background p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-primary" />
                  {isRTL ? 'لم يتم إنشاء المنشأة بعد' : 'Business not created yet'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'إذا كنت أنت المالك، أنشئ منشأتك من صفحة بيانات المنشأة لتفعيل كل ميزات لوحة التحكم.'
                    : 'If you are the owner, create your business from the business profile page to unlock dashboard features.'}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  {isRTL ? 'دعوة بانتظار القبول' : 'Pending invitation'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'تحقّق من بريدك (وصندوق الرسائل غير المرغوب فيها) لاستلام رابط قبول الدعوة كمفوّض/موظف.'
                    : 'Check your email (and spam folder) for the staff invitation acceptance link.'}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserCheck className="h-4 w-4 text-primary" />
                  {isRTL ? 'بانتظار اعتماد المالك' : 'Awaiting owner approval'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'إن قبلت دعوة سابقة، قد يحتاج المالك لاعتماد صلاحياتك. تواصل معه لتفعيل وصولك.'
                    : 'If you accepted an invite, the owner may still need to approve your access. Contact them to activate it.'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-dashed p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'خطوات الحل السريعة' : 'Quick resolution steps'}
              </div>
              <ol className="list-decimal ms-5 text-xs text-muted-foreground space-y-1">
                <li>{isRTL ? 'تأكّد من تفعيل بريدك الإلكتروني وتسجيل الدخول بالحساب الصحيح.' : 'Make sure your email is verified and you signed in with the correct account.'}</li>
                <li>{isRTL ? 'إن كنت موظفًا/مفوّضًا: تواصل مع مالك المنشأة وتأكد أنه أرسل لك دعوة على نفس البريد.' : 'If you are staff: contact the business owner and confirm they sent the invite to this exact email.'}</li>
                <li>{isRTL ? 'إن كنت المالك: أنشئ منشأتك الآن من زر "إنشاء منشأة جديدة" بالأسفل.' : 'If you are the owner: create your business now using the button below.'}</li>
                <li>{isRTL ? 'بعد ربط الحساب، أعد تحميل الصفحة لتظهر القطاعات الخاصة.' : 'After your account is linked, refresh this page to access private sectors.'}</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href="/dashboard/business-edit">
                  <Plus className="h-4 w-4 me-1" />
                  {isRTL ? 'إنشاء منشأة جديدة' : 'Create a business'}
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/dashboard/settings">
                  {isRTL ? 'تفعيل/مراجعة الحساب' : 'Verify account'}
                </a>
              </Button>
              <Button asChild variant="ghost">
                <a href="/contact">
                  {isRTL ? 'تواصل مع الدعم' : 'Contact support'}
                </a>
              </Button>
              <Button variant="ghost" onClick={() => window.location.reload()}>
                {isRTL ? 'إعادة المحاولة' : 'Retry'}
              </Button>
            </div>
          </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const stats = {
    total: sectors.length,
    approved: sectors.filter((s) => s.status === 'approved').length,
    pending: sectors.filter((s) => s.status === 'pending').length,
    drafts: sectors.filter((s) => s.status === 'draft' || s.status === 'rejected').length,
  };

  const useTemplate = (tpl: PrivateSectorTemplate) => {
    setEditing({
      name_ar: tpl.name_ar,
      name_en: tpl.name_en,
      parent_sector: tpl.parent_sector,
      brand_type: tpl.brand_type,
      short_description_ar: tpl.short_description_ar,
      short_description_en: tpl.short_description_en,
      description_ar: tpl.description_ar,
      description_en: tpl.description_en,
      established_year: tpl.established_year,
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MyInvitationsStatus />
        {/* Hero header */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 end-[-60px] h-72 w-72 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 start-[-60px] h-72 w-72 rounded-full bg-secondary/15 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start gap-5">
            <div className="rounded-2xl bg-primary/15 text-primary p-3 shadow-sm">
              <Layers className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                  <Sparkles className="h-3 w-3 me-1" />
                  {isRTL ? 'مايكرو سيرفيس' : 'Microservice'}
                </Badge>
                <Badge variant="outline" className="border-success/30 text-success bg-success/5">
                  <ShieldCheck className="h-3 w-3 me-1" />
                  {isRTL ? 'موافقة الإدارة' : 'Admin reviewed'}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {isRTL ? 'القطاعات الخاصة بالمزود' : 'Provider Private Sectors'}
              </h1>
              <p className="mt-1.5 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
                {isRTL
                  ? 'سجّل علاماتك التجارية ووكالاتك الحصرية وقطاعاتك المتخصصة (مثل سرايا الألمنيوم، رويال للمطابخ، كريستال للزجاج). كل قطاع جديد يخضع لمراجعة الإدارة قبل ظهوره للعملاء.'
                  : 'Register your brands, exclusive agencies and specialized sectors (e.g. Saraya Aluminum, Royal Kitchens, Crystal Glass). Every new entry is reviewed by the platform before going live.'}
              </p>
            </div>
            {!editing && (
              <Button size="appLg" onClick={() => setEditing({})}>
                <Plus className="h-4 w-4" />
                {isRTL ? 'قطاع خاص جديد' : 'New private sector'}
              </Button>
            )}
          </div>

          {/* KPIs */}
          <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Layers,        label_ar: 'إجمالي القطاعات', label_en: 'Total sectors', value: stats.total,    tone: 'text-primary'  },
              { icon: CheckCircle2,  label_ar: 'معتمدة',           label_en: 'Approved',      value: stats.approved, tone: 'text-success'  },
              { icon: Clock,         label_ar: 'قيد المراجعة',     label_en: 'Pending',       value: stats.pending,  tone: 'text-warning'  },
              { icon: Pencil,        label_ar: 'مسودات/مرفوض',     label_en: 'Drafts',        value: stats.drafts,   tone: 'text-muted-foreground' },
            ].map((k) => (
              <div key={k.label_en} className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur-sm p-3 flex items-center gap-3">
                <div className={`rounded-xl bg-muted p-2 ${k.tone}`}><k.icon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground truncate">{isRTL ? k.label_ar : k.label_en}</div>
                  <div className="text-xl font-bold tech-content">{k.value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {editing && (
          <PrivateSectorForm
            initial={editing}
            busy={saveMut.isPending}
            onCancel={() => setEditing(null)}
            requiresReason={editing?.status === 'approved'}
            onSubmit={async (v, reason) => { await saveMut.mutateAsync({ values: v, reason }); }}
          />
        )}

        {/* Templates showcase — only when not actively editing */}
        {!editing && (
          <PrivateSectorTemplatesShowcase onUseTemplate={useTemplate} />
        )}

        {/* My sectors */}
        <section aria-labelledby="ps-mine-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 id="ps-mine-heading" className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {isRTL ? 'قطاعاتي الخاصة' : 'My private sectors'}
            </h2>
          </div>

        <div className="relative max-w-md">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input className="ps-10" placeholder={isRTL ? 'بحث بالاسم أو المعرف…' : 'Search by name or ref id…'}
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{isRTL ? 'جاري التحميل…' : 'Loading…'}</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-10 text-center">
            <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <div className="font-semibold">{isRTL ? 'لا توجد قطاعات خاصة بعد' : 'No private sectors yet'}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'ابدأ من نموذج جاهز أعلاه أو أنشئ قطاعاً جديداً يدوياً.' : 'Start from a curated template above or create one from scratch.'}
            </p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s) => {
              const meta = PS_STATUS_META[s.status];
              const parent = ONBOARDING_SECTORS.find((p) => p.id === s.parent_sector);
              return (
                <Card key={s.id} className="hover-lift">
                  <CardContent className="p-4 flex flex-wrap items-start gap-4">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover border" loading="lazy" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted grid place-items-center"><Building2 className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</span>
                        <span className="text-xs text-muted-foreground tech-content">{s.ref_id}</span>
                        <Badge variant="outline" className={meta.tone}>{isRTL ? meta.ar : meta.en}</Badge>
                        <Badge variant="outline">{isRTL ? PS_BRAND_TYPE_META[s.brand_type].ar : PS_BRAND_TYPE_META[s.brand_type].en}</Badge>
                        {parent && <Badge variant="secondary">{isRTL ? parent.name_ar : parent.name_en}</Badge>}
                      </div>
                      {(s.short_description_ar || s.short_description_en) && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {isRTL ? (s.short_description_ar || s.short_description_en) : (s.short_description_en || s.short_description_ar)}
                        </p>
                      )}
                      {s.status === 'rejected' && s.rejection_reason && (
                        <p className="mt-2 text-xs text-destructive">{isRTL ? 'سبب الرفض: ' : 'Rejection reason: '}{s.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(s.status === 'draft' || s.status === 'rejected') && (
                        <Button size="sm" onClick={() => submitMut.mutate(s.id)} disabled={submitMut.isPending}>
                          <Send className="h-4 w-4" /> {isRTL ? 'إرسال للمراجعة' : 'Submit'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                        <Pencil className="h-4 w-4" /> {isRTL ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAuditFor(auditFor === s.id ? null : s.id)}>
                        <FileClock className="h-4 w-4" /> {isRTL ? 'السجل' : 'Audit'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDistributorsFor(distributorsFor === s.id ? null : s.id)}>
                        <Users className="h-4 w-4" /> {isRTL ? 'الموزعون' : 'Distributors'}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => delMut.mutate(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {auditFor === s.id && (
                      <div className="w-full mt-2 border-t pt-3 space-y-1.5">
                        {audit.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد إدخالات بعد.' : 'No entries yet.'}</p>
                        ) : audit.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
                            {a.notes && <span className="text-muted-foreground italic">"{a.notes}"</span>}
                            <span className="text-muted-foreground tech-content">{new Date(a.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {distributorsFor === s.id && (
                      <div className="w-full mt-3">
                        <SectorDistributorsPanel sectorId={s.id} canManage={true} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPrivateSectors;