/**
 * R5.1 — Dashboard-side RFQ (quote request) creation wizard.
 *
 * Six-step RTL Arabic wizard for authenticated clients to raise a new
 * RFQ from inside the dashboard, distinct from the public `/quote` form.
 * Reuses ONLY existing services (submitQuoteRequest, uploadQuoteRequestFile,
 * createQuoteRequestFileRecord) — no new schema columns.
 *
 * Steps:
 *   1. القطاع ونوع العمل
 *   2. الموقع (المدينة + الحي + ربط موقع مسجّل اختياري)
 *   3. المقاسات والمخططات والصور
 *   4. المواصفات والكميات والمواد المفضّلة
 *   5. الجدول الزمني والضمان والشروط والعينة (requires_sample checkbox)
 *   6. المراجعة والنشر
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft, ChevronRight, Send, Upload, X, CheckCircle2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { submitQuoteRequest } from '@/modules/quotes/services/submitQuoteRequest';
import { uploadQuoteRequestFile } from '@/modules/quotes/services/uploadQuoteRequestFile';
import { createQuoteRequestFileRecord } from '@/modules/quotes/services/createQuoteRequestFileRecord';
import {
  CANONICAL_PRIMARY_SLUGS,
  CANONICAL_PRIMARY_LABELS,
  type CanonicalPrimarySlug,
} from '@/modules/taxonomy/canonical-primaries';
import { ApprovedBrandPicker } from '@/components/brands/ApprovedBrandPicker';
import type { BrandPreferenceMode } from '@/modules/brands/lib/brandSelectionRules';

const STEPS: { id: number; ar: string; en: string }[] = [
  { id: 1, ar: 'القطاع ونوع العمل', en: 'Sector & type' },
  { id: 2, ar: 'الموقع', en: 'Location' },
  { id: 3, ar: 'المقاسات والمخططات', en: 'Measurements & attachments' },
  { id: 4, ar: 'المواصفات والكميات', en: 'Specs & quantities' },
  { id: 5, ar: 'الجدول الزمني والشروط', en: 'Timeline & terms' },
  { id: 6, ar: 'المراجعة والنشر', en: 'Review & publish' },
];

const TIMELINE_OPTIONS = [
  { value: 'urgent', ar: 'عاجل (خلال أسبوع)' },
  { value: 'this_month', ar: 'خلال هذا الشهر' },
  { value: 'next_month', ar: 'الشهر القادم' },
  { value: 'flexible', ar: 'مرن' },
];

interface AttachedFile { file: File; preview?: string }

const DashboardNewRfq: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  useNoIndex();

  const [step, setStep] = useState(1);
  const [sector, setSector] = useState<CanonicalPrimarySlug | ''>('');
  const [projectDescription, setProjectDescription] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [siteId, setSiteId] = useState<string>('');
  const [approxDimensions, setApproxDimensions] = useState('');
  const [quantity, setQuantity] = useState('');
  const [specNotes, setSpecNotes] = useState('');
  const [preferredBrandIds, setPreferredBrandIds] = useState<string[]>([]);
  const [brandPreferenceMode, setBrandPreferenceMode] = useState<BrandPreferenceMode>('flexible');
  const [brandNotes, setBrandNotes] = useState('');
  const [executionTimeline, setExecutionTimeline] = useState('flexible');
  const [warranty, setWarranty] = useState('');
  const [specialConditions, setSpecialConditions] = useState('');
  const [requiresSample, setRequiresSample] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);

  // Optional: load registered sites owned by the user for linking.
  const { data: mySites = [] } = useQuery({
    queryKey: ['my-client-sites', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('client_sites')
        .select('id, site_name, city_name')
        .eq('owner_user_id', user!.id)
        .limit(50);
      return (data ?? []) as unknown as Array<{
        id: string;
        site_name: string | null;
        city_name: string | null;
      }>;
    },
  });

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return !!sector && projectDescription.trim().length >= 10;
      case 2: return !!city.trim();
      case 3: return true;
      case 4: return true;
      case 5: return !!executionTimeline;
      default: return true;
    }
  }, [step, sector, projectDescription, city, executionTimeline]);

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('auth_required');
      if (!sector) throw new Error('sector_required');
      const payload = {
        customer_name: profile?.full_name || user.email || 'عميل',
        customer_phone: profile?.phone || '',
        customer_email: user.email ?? null,
        customer_type: 'individual',
        preferred_contact_method: 'in_app',
        sector,
        city: city.trim(),
        district: district.trim() || null,
        service_location_type: 'on_site',
        project_description: projectDescription.trim(),
        approx_dimensions: approxDimensions.trim() || null,
        quantity: quantity.trim() || null,
        execution_timeline: executionTimeline,
        has_budget: false,
        budget_amount: null,
        budget_note: null,
        preferred_brand_ids: preferredBrandIds.length ? preferredBrandIds : null,
        brand_preference_mode: preferredBrandIds.length ? brandPreferenceMode : null,
        brand_notes: brandNotes.trim() || null,
        metadata: {
          source: 'dashboard_wizard_v1',
          site_id: siteId || null,
          spec_notes: specNotes.trim() || null,
          warranty: warranty.trim() || null,
          special_conditions: specialConditions.trim() || null,
          requires_sample: requiresSample,
        },
      };
      const result = await submitQuoteRequest(payload);
      // R5.1 — persist requires_sample directly on the row (column exists).
      if (result.quote_request_id && requiresSample) {
        try {
          await supabase
            .from('quote_requests')
            .update({ requires_sample: true, site_id: siteId || null })
            .eq('id', result.quote_request_id);
        } catch { /* best-effort */ }
      } else if (result.quote_request_id && siteId) {
        try {
          await supabase
            .from('quote_requests')
            .update({ site_id: siteId })
            .eq('id', result.quote_request_id);
        } catch { /* best-effort */ }
      }
      // Upload attachments (best-effort).
      if (result.quote_request_id && attachments.length && user?.id) {
        for (const a of attachments) {
          try {
            const safeName = a.file.name.replace(/[^\w.\-]+/g, '_');
            const path = `${user.id}/${result.quote_request_id}/${Date.now()}_${safeName}`;
            const uploaded = await uploadQuoteRequestFile({ path, file: a.file });
            await createQuoteRequestFileRecord({
              quote_request_id: result.quote_request_id,
              user_id: user.id,
              file_name: a.file.name,
              file_path: uploaded.path,
              file_size: a.file.size,
              file_type: a.file.type || null,
            });
          } catch { /* best-effort */ }
        }
      }
      return result;
    },
    onSuccess: (r) => {
      toast.success('تم إنشاء الطلب بنجاح');
      navigate(`/dashboard/my-requests/${r.quote_request_id}`);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'تعذر إنشاء الطلب');
    },
  });

  const progress = Math.round(((step - 1) / (STEPS.length - 1)) * 100);
  const currentStep = STEPS[step - 1];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 px-3 py-4">
        <div>
          <h1 className="text-xl font-bold">
            {isRTL ? 'طلب عرض سعر جديد' : 'New quote request'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'أنشئ طلبك خطوة بخطوة' : 'Create your RFQ step by step'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{isRTL ? currentStep.ar : currentStep.en}</span>
            <span>{step}/{STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-1 flex-wrap">
            {STEPS.map((s) => (
              <Badge
                key={s.id}
                variant={s.id === step ? 'default' : s.id < step ? 'secondary' : 'outline'}
                className="text-[10px]"
              >
                {s.id}. {isRTL ? s.ar : s.en}
              </Badge>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-1">
                  <Label>القطاع</Label>
                  <Select value={sector} onValueChange={(v) => setSector(v as CanonicalPrimarySlug)}>
                    <SelectTrigger><SelectValue placeholder="اختر القطاع" /></SelectTrigger>
                    <SelectContent>
                      {CANONICAL_PRIMARY_SLUGS.map((slug) => (
                        <SelectItem key={slug} value={slug}>
                          {CANONICAL_PRIMARY_LABELS[slug].ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>وصف العمل المطلوب</Label>
                  <Textarea
                    rows={5}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="اشرح باختصار طبيعة العمل المطلوب…"
                    dir="auto"
                  />
                  <p className="text-xs text-muted-foreground">10 أحرف على الأقل.</p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>المدينة</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} dir="auto" />
                  </div>
                  <div className="space-y-1">
                    <Label>الحي (اختياري)</Label>
                    <Input value={district} onChange={(e) => setDistrict(e.target.value)} dir="auto" />
                  </div>
                </div>
                {mySites.length > 0 && (
                  <div className="space-y-1">
                    <Label>ربط بموقع مسجّل (اختياري)</Label>
                    <Select value={siteId} onValueChange={setSiteId}>
                      <SelectTrigger><SelectValue placeholder="بدون ربط" /></SelectTrigger>
                      <SelectContent>
                        {mySites.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}{s.city ? ` — ${s.city}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-1">
                  <Label>المقاسات التقريبية</Label>
                  <Input
                    value={approxDimensions}
                    onChange={(e) => setApproxDimensions(e.target.value)}
                    placeholder="مثال: 3م × 2.5م"
                    dir="auto"
                  />
                </div>
                <div className="space-y-1">
                  <Label>مرفقات (مخططات، صور)</Label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setAttachments((prev) => [
                        ...prev,
                        ...files.map((f) => ({ file: f })),
                      ]);
                    }}
                    className="block w-full text-sm"
                  />
                  {attachments.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {attachments.map((a, i) => (
                        <li key={i} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                          <span className="truncate">{a.file.name}</span>
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="space-y-1">
                  <Label>الكمية</Label>
                  <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} dir="auto" placeholder="مثال: 5 قطع" />
                </div>
                <div className="space-y-1">
                  <Label>المواصفات الفنية</Label>
                  <Textarea rows={3} value={specNotes} onChange={(e) => setSpecNotes(e.target.value)} dir="auto" />
                </div>
                <div className="space-y-1">
                  <Label>المواد / الماركات المفضّلة</Label>
                  <ApprovedBrandPicker
                    mode="multi"
                    value={preferredBrandIds}
                    onChange={setPreferredBrandIds}
                  />
                  <Select
                    value={brandPreferenceMode}
                    onValueChange={(v) => setBrandPreferenceMode(v as BrandPreferenceMode)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="نمط تفضيل الماركات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">حصريًا هذه الماركات</SelectItem>
                      <SelectItem value="preferred">مفضّلة</SelectItem>
                      <SelectItem value="flexible">مرن</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    rows={2}
                    placeholder="ملاحظات إضافية حول الماركات (اختياري)"
                    value={brandNotes}
                    onChange={(e) => setBrandNotes(e.target.value)}
                    dir="auto"
                  />
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="space-y-1">
                  <Label>الجدول الزمني</Label>
                  <Select value={executionTimeline} onValueChange={setExecutionTimeline}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMELINE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>الضمان المطلوب</Label>
                  <Input value={warranty} onChange={(e) => setWarranty(e.target.value)} dir="auto" placeholder="مثال: سنة على التركيب" />
                </div>
                <div className="space-y-1">
                  <Label>شروط خاصة</Label>
                  <Textarea rows={3} value={specialConditions} onChange={(e) => setSpecialConditions(e.target.value)} dir="auto" />
                </div>
                <label className="flex items-center gap-2 text-sm border rounded p-2">
                  <input
                    type="checkbox"
                    checked={requiresSample}
                    onChange={(e) => setRequiresSample(e.target.checked)}
                    className="h-4 w-4"
                  />
                  أرغب بطلب عينة قبل التعاقد
                </label>
              </>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold">راجع طلبك</div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">القطاع</dt>
                  <dd>{sector ? CANONICAL_PRIMARY_LABELS[sector].ar : '—'}</dd>
                  <dt className="text-muted-foreground">المدينة</dt>
                  <dd>{city || '—'}{district ? ` — ${district}` : ''}</dd>
                  <dt className="text-muted-foreground">الوصف</dt>
                  <dd className="whitespace-pre-wrap">{projectDescription}</dd>
                  <dt className="text-muted-foreground">المقاسات</dt>
                  <dd>{approxDimensions || '—'}</dd>
                  <dt className="text-muted-foreground">الكمية</dt>
                  <dd>{quantity || '—'}</dd>
                  <dt className="text-muted-foreground">الجدول الزمني</dt>
                  <dd>{TIMELINE_OPTIONS.find((o) => o.value === executionTimeline)?.ar}</dd>
                  <dt className="text-muted-foreground">الضمان</dt>
                  <dd>{warranty || '—'}</dd>
                  <dt className="text-muted-foreground">عينة قبل التعاقد</dt>
                  <dd>{requiresSample ? 'نعم' : 'لا'}</dd>
                  <dt className="text-muted-foreground">مرفقات</dt>
                  <dd>{attachments.length}</dd>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || submitMut.isPending}
          >
            <ChevronRight className="h-4 w-4 me-1" /> السابق
          </Button>
          {step < STEPS.length ? (
            <Button
              onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              disabled={!canNext}
            >
              التالي <ChevronLeft className="h-4 w-4 ms-1" />
            </Button>
          ) : (
            <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
              {submitMut.isPending
                ? <Loader2 className="h-4 w-4 animate-spin me-1" />
                : <Send className="h-4 w-4 me-1" />}
              نشر الطلب
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardNewRfq;
