import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { updateBusinessById } from '@/modules/businesses';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Save, ArrowRight, ShieldCheck } from 'lucide-react';

interface DraftRow {
  id: string;
  ref_id: string | null;
  approval_status: string | null;
  name_ar: string | null;
  name_en: string | null;
  short_description_ar: string | null;
  description_ar: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  region: string | null;
  national_id: string | null;
  unified_number: string | null;
}

const FIELDS: Array<keyof DraftRow> = [
  'name_ar','name_en','short_description_ar','description_ar',
  'phone','mobile','email','address','region','national_id','unified_number',
];

const DashboardBusinessDraft: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  usePageMeta({
    title: isRTL ? 'نموذج بيانات المنشأة | قِطاعات' : 'Business Draft Form | Qitaat',
    noindex: true,
  });

  const { data: business, isLoading, refetch } = useQuery({
    queryKey: ['business-draft-form', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DraftRow | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from('businesses')
        .select('id, ref_id, approval_status, name_ar, name_en, short_description_ar, description_ar, phone, mobile, email, address, region, national_id, unified_number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as DraftRow | null) ?? null;
    },
    staleTime: 15_000,
  });

  const [form, setForm] = useState<Partial<DraftRow>>({});
  const [saving, setSaving] = useState(false);

  // Auto-fill form once business loads.
  useEffect(() => {
    if (!business) return;
    const seed: Partial<DraftRow> = {};
    for (const k of FIELDS) seed[k] = (business[k] as string | null) ?? '';
    setForm(seed);
  }, [business]);

  const set = <K extends keyof DraftRow>(k: K, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const labels = useMemo(() => ({
    name_ar: isRTL ? 'الاسم بالعربية' : 'Arabic name',
    name_en: isRTL ? 'الاسم بالإنجليزية' : 'English name',
    short_description_ar: isRTL ? 'وصف مختصر' : 'Short description',
    description_ar: isRTL ? 'الوصف الكامل' : 'Full description',
    phone: isRTL ? 'الهاتف' : 'Phone',
    mobile: isRTL ? 'الجوال' : 'Mobile',
    email: isRTL ? 'البريد الإلكتروني' : 'Email',
    address: isRTL ? 'العنوان' : 'Address',
    region: isRTL ? 'المنطقة' : 'Region',
    national_id: isRTL ? 'السجل التجاري' : 'Commercial registration',
    unified_number: isRTL ? 'الرقم الموحد' : 'Unified number',
  }), [isRTL]);

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    try {
      const payload = FIELDS.reduce<Record<string, string | null>>((acc, k) => {
        const v = ((form[k] ?? '') as string).trim();
        acc[k] = v.length > 0 ? v : null;
        return acc;
      }, {});
      const { error } = await updateBusinessById({ id: business.id, values: payload });
      if (error) throw error;
      toast.success(isRTL ? 'تم حفظ بيانات المنشأة' : 'Business details saved');
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isRTL ? 'فشل الحفظ' : 'Save failed');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:py-12 max-w-3xl">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {isRTL ? 'نموذج بيانات المنشأة' : 'Business profile form'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isRTL
                ? 'تم تعبئة الحقول تلقائياً من مسودة منشأتك. عدّل ما تحتاج ثم احفظ.'
                : 'Fields are auto-filled from your business draft. Edit what you need, then save.'}
            </p>
          </div>
          <Link to="/dashboard/business-completion" className="shrink-0">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              {isRTL ? 'حالة الاعتماد' : 'Approval status'}
            </Button>
          </Link>
        </header>

        {isLoading && (
          <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            {isRTL ? 'جارِ التحميل...' : 'Loading…'}
          </div>
        )}

        {!isLoading && !business && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-6">
            <p className="text-sm text-foreground mb-3">
              {isRTL ? 'لا توجد مسودة منشأة مرتبطة بحسابك.' : 'No business draft is linked to your account.'}
            </p>
            <Button size="sm" onClick={() => navigate('/onboarding')} className="gap-1.5">
              <Building2 className="w-4 h-4" />
              {isRTL ? 'إنشاء المنشأة' : 'Create business'}
            </Button>
          </div>
        )}

        {business && (
          <>
            {/* Identity card — read-only ref_id auto-filled */}
            <section className="rounded-xl border border-border bg-card px-4 py-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="shrink-0 w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'الرقم المرجعي للمنشأة' : 'Business reference ID'}
                  </p>
                  <p className="tech-content font-mono font-semibold text-foreground text-sm">
                    {business.ref_id ?? '—'}
                  </p>
                </div>
                {business.approval_status && (
                  <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-muted/40">
                    {business.approval_status}
                  </span>
                )}
              </div>
            </section>

            {/* Inline form */}
            <form
              onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
              className="rounded-xl border border-border bg-card px-4 py-5 space-y-4"
              aria-label={isRTL ? 'بيانات المنشأة' : 'Business details'}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['name_ar','name_en','phone','mobile','email','region','address','national_id','unified_number'] as const).map((k) => (
                  <div key={k} className="space-y-1.5">
                    <Label htmlFor={k} className="text-xs">{labels[k]}</Label>
                    <Input
                      id={k}
                      dir="auto"
                      value={(form[k] as string) ?? ''}
                      onChange={(e) => set(k, e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="short_description_ar" className="text-xs">{labels.short_description_ar}</Label>
                <Input
                  id="short_description_ar"
                  dir="auto"
                  value={(form.short_description_ar as string) ?? ''}
                  onChange={(e) => set('short_description_ar', e.target.value)}
                  className="h-11 rounded-xl"
                  maxLength={160}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description_ar" className="text-xs">{labels.description_ar}</Label>
                <Textarea
                  id="description_ar"
                  dir="auto"
                  value={(form.description_ar as string) ?? ''}
                  onChange={(e) => set('description_ar', e.target.value)}
                  rows={5}
                  className="rounded-xl"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" size="sm" className="h-10 gap-1.5" disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving
                    ? (isRTL ? 'جارِ الحفظ...' : 'Saving…')
                    : (isRTL ? 'حفظ التغييرات' : 'Save changes')}
                </Button>
                <Link to="/dashboard/business-completion">
                  <Button type="button" variant="outline" size="sm" className="h-10">
                    {isRTL ? 'الرجوع لحالة المنشأة' : 'Back to status'}
                  </Button>
                </Link>
              </div>
            </form>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DashboardBusinessDraft;
