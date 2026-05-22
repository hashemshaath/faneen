/**
 * Client Sites Phase 2.6 — Public QR scan page at /s/:token.
 *
 * Hard rules:
 *  - Works for anonymous visitors.
 *  - Never reveals address, phone, map, owner, contracts, attachments.
 *  - Never reveals whether the token exists, is revoked, or is private.
 *  - noindex; no sitemap entry; no JSON-LD.
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Loader2, MapPin, ShieldCheck, Lock, LogIn, Building2, Send, Check, AlertCircle, Briefcase,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { listOwnerBusinesses } from '@/modules/businesses';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/components/common/BrandLogo';
import { toast } from 'sonner';
import {
  SITE_SECTIONS,
  PUBLIC_LOCKED_SECTION_KEYS,
  pickLabel,
} from '@/lib/client-sites/client-site-labels';

interface PublicSiteSummary {
  site_ref: string | null;
  site_name: string | null;
  site_type: string | null;
  city_name: string | null;
  visibility: string | null;
  status: string | null;
}

interface ProviderBusinessRow {
  id: string;
  name: string | null;
}

const LOCKED_SECTIONS = PUBLIC_LOCKED_SECTION_KEYS
  .map((key) => SITE_SECTIONS.find((s) => s.key === key))
  .filter((s): s is (typeof SITE_SECTIONS)[number] => !!s);

const PublicSiteScan: React.FC = () => {
  useNoIndex();
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { user, isProvider, loading: authLoading } = useAuth();

  const [reason, setReason] = useState('');
  const [providerBusinessId, setProviderBusinessId] = useState<string>('');
  const [interestMsg, setInterestMsg] = useState('');
  const [interestCategory, setInterestCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  // --- Public summary (anon-safe) ---
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-site', token],
    queryFn: async (): Promise<PublicSiteSummary | null> => {
      if (!token) return null;
      const { data, error } = await supabase.rpc('get_public_site_by_token', { _token: token });
      if (error) throw error;
      return ((data as unknown) as PublicSiteSummary | null) ?? null;
    },
    enabled: !!token,
    retry: false,
  });

  // --- Provider businesses for logged-in provider ---
  const { data: businesses = [] } = useQuery({
    queryKey: ['my-managed-businesses', user?.id],
    enabled: !!user?.id && isProvider,
    queryFn: async (): Promise<ProviderBusinessRow[]> => {
      const [owned, staff] = await Promise.all([
        listOwnerBusinesses<{ id: string; name_ar: string | null; name_en: string | null }>({
          userId: user!.id,
          select: 'id, name_ar, name_en',
        }),
        supabase.from('business_staff')
          .select('business_id, businesses(id, name_ar, name_en)')
          .eq('user_id', user!.id).eq('is_active', true),
      ]);
      const pickName = (ar: string | null, en: string | null) =>
        (isRTL ? ar : en) ?? en ?? ar ?? null;
      const out: ProviderBusinessRow[] = [];
      (owned.data ?? []).forEach((b) => out.push({ id: b.id, name: pickName(b.name_ar, b.name_en) }));
      type StaffBiz = { id: string; name_ar: string | null; name_en: string | null };
      type StaffRow = { businesses: StaffBiz | null };
      ((staff.data ?? []) as unknown as StaffRow[]).forEach((s) => {
        if (s.businesses?.id && !out.find((x) => x.id === s.businesses!.id)) {
          out.push({ id: s.businesses.id, name: pickName(s.businesses.name_ar, s.businesses.name_en) });
        }
      });
      return out;
    },
  });

  useEffect(() => {
    if (!providerBusinessId && businesses.length > 0) {
      setProviderBusinessId(businesses[0].id);
    }
  }, [businesses, providerBusinessId]);

  // --- Request access ---
  const requestMut = useMutation({
    mutationFn: async () => {
      if (!data?.site_ref) throw new Error(isRTL ? 'الموقع غير متاح' : 'Site unavailable');
      if (!providerBusinessId) throw new Error(isRTL ? 'اختر منشأتك' : 'Select your business');
      const { data: res, error } = await supabase.rpc('request_client_site_access', {
        _site_ref: data.site_ref,
        _provider_business_id: providerBusinessId,
        _reason: reason.trim() || null,
      });
      if (error) throw error;
      return res as { requested?: boolean; duplicate?: boolean; status?: string };
    },
    onSuccess: (res) => {
      if (res?.status === 'approved') {
        toast.success(isRTL ? 'لديك وصول معتمد بالفعل' : 'You already have approved access');
      } else if (res?.duplicate) {
        toast.info(isRTL ? 'طلبك قيد المراجعة بالفعل' : 'Your request is already pending');
      } else {
        toast.success(isRTL ? 'تم إرسال طلب الوصول لصاحب الموقع' : 'Your access request has been sent to the site owner');
      }
      setReason('');
    },
    onError: (e: Error) =>
      toast.error(isRTL ? `تعذر إرسال الطلب: ${e.message}` : `Could not send request: ${e.message}`),
  });

  // --- Submit interest / offer ---
  const interestMut = useMutation({
    mutationFn: async () => {
      if (!data?.site_ref) throw new Error(isRTL ? 'الموقع غير متاح' : 'Site unavailable');
      if (!providerBusinessId) throw new Error(isRTL ? 'اختر منشأتك' : 'Select your business');
      const min = budgetMin.trim() ? Number(budgetMin) : null;
      const max = budgetMax.trim() ? Number(budgetMax) : null;
      if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) {
        throw new Error(isRTL ? 'قيمة الميزانية غير صحيحة' : 'Invalid budget value');
      }
      const { data: res, error } = await supabase.rpc('submit_site_interest', {
        _site_ref: data.site_ref,
        _provider_business_id: providerBusinessId,
        _message: interestMsg.trim(),
        _service_category: interestCategory.trim() || null,
        _estimated_budget_min: min,
        _estimated_budget_max: max,
      });
      if (error) throw error;
      return res as { submitted?: boolean; interest_ref?: string; grant_status?: string; grant_created?: boolean };
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال اهتمامك لصاحب الموقع.' : 'Your interest has been sent to the site owner.');
      setInterestMsg('');
      setInterestCategory('');
      setBudgetMin('');
      setBudgetMax('');
    },
    onError: (e: Error) =>
      toast.error(isRTL ? `تعذر إرسال الاهتمام: ${e.message}` : `Could not submit interest: ${e.message}`),
  });

  const unavailable = !isLoading && !data;
  const summary = data;

  const headTitle = isRTL ? 'موقع — قِطاعات' : 'Site — Qitaat';
  useEffect(() => {
    const prev = document.title;
    document.title = headTitle;
    return () => { document.title = prev; };
  }, [headTitle]);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover-lift">
            <BrandLogo size={28} />
          </Link>
          <Badge variant="outline" size="sm" className="text-[10px]">
            <ShieldCheck className="w-3 h-3 me-1" />
            {isRTL ? 'صفحة موقع خاصة' : 'Private site page'}
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{isRTL ? 'جارٍ التحميل…' : 'Loading…'}</span>
          </div>
        )}

        {unavailable && (
          <section className="p-6 rounded-xl border border-border/40 bg-muted/20 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <h1 className="text-base font-semibold">
              {isRTL ? 'الموقع غير متاح' : 'Site unavailable'}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isRTL
                ? 'الموقع غير متاح أو تم إلغاء الرمز.'
                : 'This site is unavailable or the QR code was revoked.'}
            </p>
            <Button asChild variant="outline" size="sm" className="h-9 text-xs">
              <Link to="/">{isRTL ? 'العودة للرئيسية' : 'Back to home'}</Link>
            </Button>
          </section>
        )}

        {summary && (
          <>
            {/* Limited summary */}
            <section className="p-5 rounded-xl border border-border/40 bg-card space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MapPin className="w-4 h-4 text-primary" />
                <h1 className="text-base font-semibold">
                  {summary.site_name || (isRTL ? 'موقع' : 'Site')}
                </h1>
                {summary.site_ref && (
                  <Badge variant="outline" size="sm" className="tech-content text-[10px]" dir="ltr">
                    {summary.site_ref}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                {summary.site_type && <span>{summary.site_type}</span>}
                {summary.site_type && summary.city_name && <span>·</span>}
                {summary.city_name && <span>{summary.city_name}</span>}
              </div>
              <p className="text-[11px] text-muted-foreground bg-info/5 border border-info/20 rounded-md p-2 leading-relaxed mt-2">
                {isRTL
                  ? 'لا تظهر تفاصيل الموقع إلا بعد موافقة صاحب الموقع.'
                  : 'Site details are only shown after the site owner approves access.'}
              </p>
            </section>

            {/* Locked sections */}
            <section className="space-y-2" aria-label={isRTL ? 'أقسام مغلقة' : 'Locked sections'}>
              <h2 className="text-xs font-semibold text-muted-foreground px-1">
                {isRTL ? 'الأقسام المتاحة بعد الموافقة' : 'Available after approval'}
              </h2>
              <ul className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                {LOCKED_SECTIONS.map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      className="w-full text-start p-3 rounded-lg border border-border/40 bg-muted/10 hover-lift min-h-[44px] flex items-center gap-2"
                    >
                      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{pickLabel(s, isRTL)}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {isRTL ? 'مغلق — اطلب الوصول' : 'Locked — request access'}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Auth / request access CTA */}
            <section className="p-5 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
              {authLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {isRTL ? 'جارٍ التحقق…' : 'Checking…'}
                </div>
              ) : !user ? (
                <>
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <LogIn className="w-4 h-4 text-primary" />
                    {isRTL ? 'سجّل الدخول كمزود' : 'Log in as a provider'}
                  </h2>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isRTL
                      ? 'سجّل الدخول كمزود لطلب الوصول أو تقديم عرض خدمة.'
                      : 'Log in as a provider to request access or submit a service offer.'}
                  </p>
                  <Button asChild variant="hero" size="sm" className="h-10 w-full text-xs gap-1.5">
                    <Link to={`/auth?mode=login&redirect=${encodeURIComponent(`/s/${token ?? ''}`)}`}>
                      <LogIn className="w-3.5 h-3.5" />
                      {isRTL ? 'تسجيل الدخول / إنشاء حساب' : 'Login / Register'}
                    </Link>
                  </Button>
                </>
              ) : !isProvider ? (
                <>
                  <h2 className="text-sm font-semibold">
                    {isRTL ? 'متاح لحسابات المزودين فقط' : 'Providers only'}
                  </h2>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isRTL
                      ? 'طلب الوصول متاح لحسابات المزودين فقط.'
                      : 'Access requests are available for provider accounts only.'}
                  </p>
                  <Button asChild variant="outline" size="sm" className="h-10 w-full text-xs">
                    <Link to="/for-providers">{isRTL ? 'انضم كمزود' : 'Become a provider'}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-primary" />
                    {isRTL ? 'طلب الوصول للموقع' : 'Request site access'}
                  </h2>

                  {businesses.length > 1 && (
                    <div className="space-y-1">
                      <Label htmlFor="biz-sel" className="text-[10px]">
                        {isRTL ? 'المنشأة' : 'Business'}
                      </Label>
                      <select
                        id="biz-sel"
                        value={providerBusinessId}
                        onChange={(e) => setProviderBusinessId(e.target.value)}
                        className="w-full h-10 text-xs rounded-md border border-border/40 bg-background px-2"
                      >
                        {businesses.map((b) => (
                          <option key={b.id} value={b.id}>{b.name ?? b.id}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {businesses.length === 1 && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" />
                      {businesses[0].name ?? businesses[0].id}
                    </div>
                  )}
                  {businesses.length === 0 && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      {isRTL ? 'لم نجد منشأة لحسابك.' : 'No business found for your account.'}
                    </p>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="reason" className="text-[10px]">
                      {isRTL ? 'سبب الطلب (اختياري)' : 'Reason (optional)'}
                    </Label>
                    <Textarea
                      id="reason" dir="auto" rows={3}
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="text-xs"
                      placeholder={isRTL ? 'وضّح اهتمامك أو خبرتك بإيجاز' : 'Briefly explain your interest or expertise'}
                    />
                  </div>

                  <Button
                    type="button" variant="hero" size="sm" className="h-10 w-full text-xs gap-1.5"
                    disabled={requestMut.isPending || businesses.length === 0 || !providerBusinessId}
                    onClick={() => requestMut.mutate()}
                  >
                    {requestMut.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : requestMut.isSuccess ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isRTL ? 'طلب الوصول للموقع' : 'Request site access'}
                  </Button>
                </>
              )}
            </section>

            {/* Submit interest / offer (providers only) */}
            {user && isProvider && businesses.length > 0 && (
              <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {isRTL ? 'سجل اهتمامك أو اذكر الخدمة' : 'Register interest or describe service'}
                </h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isRTL
                    ? 'سيصل اهتمامك لصاحب الموقع. لن نُفصح عن بيانات الاتصال الخاصة بك إلا بعد قبوله.'
                    : 'Your interest goes to the site owner. Private contact details are not shared until they accept.'}
                </p>

                <div className="space-y-1">
                  <Label htmlFor="int-cat" className="text-[10px]">
                    {isRTL ? 'الخدمة / الفئة (اختياري)' : 'Service / category (optional)'}
                  </Label>
                  <Input
                    id="int-cat" dir="auto" maxLength={120}
                    value={interestCategory}
                    onChange={(e) => setInterestCategory(e.target.value)}
                    className="h-10 text-xs"
                    placeholder={isRTL ? 'مثال: ألمنيوم، زجاج، خشب' : 'e.g. Aluminum, Glass, Wood'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="int-bmin" className="text-[10px]">
                      {isRTL ? 'ميزانية تقديرية من (اختياري)' : 'Est. budget from (optional)'}
                    </Label>
                    <Input
                      id="int-bmin" type="number" inputMode="numeric" min={0}
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      className="h-10 text-xs tech-content" dir="ltr"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="int-bmax" className="text-[10px]">
                      {isRTL ? 'إلى (اختياري)' : 'To (optional)'}
                    </Label>
                    <Input
                      id="int-bmax" type="number" inputMode="numeric" min={0}
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      className="h-10 text-xs tech-content" dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="int-msg" className="text-[10px]">
                    {isRTL ? 'رسالتك *' : 'Your message *'}
                  </Label>
                  <Textarea
                    id="int-msg" dir="auto" rows={4}
                    minLength={5} maxLength={2000}
                    value={interestMsg}
                    onChange={(e) => setInterestMsg(e.target.value)}
                    className="text-xs"
                    placeholder={isRTL
                      ? 'وضّح الخدمة التي يمكنك تقديمها لهذا الموقع'
                      : 'Describe the service you can offer for this site'}
                  />
                </div>

                <Button
                  type="button" variant="default" size="sm" className="h-10 w-full text-xs gap-1.5"
                  disabled={
                    interestMut.isPending ||
                    !providerBusinessId ||
                    interestMsg.trim().length < 5
                  }
                  onClick={() => interestMut.mutate()}
                >
                  {interestMut.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : interestMut.isSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isRTL ? 'إرسال الاهتمام' : 'Submit interest'}
                </Button>
              </section>
            )}
          </>
        )}

        {error && !unavailable && (
          <p className="text-[11px] text-destructive text-center">
            {isRTL ? 'حدث خطأ غير متوقع.' : 'Unexpected error.'}
          </p>
        )}
      </main>
    </div>
  );
};

export default PublicSiteScan;