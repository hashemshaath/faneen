import React, { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { track, trackLeadFailed, categorizeReason } from '@/lib/analytics-events';
import { notifySupplierLead } from '@/modules/leads/services/notifications';
import { getAttributionPayload } from '@/lib/analytics-attribution';

/**
 * Inline lead-request form (NO popups, per UX policy).
 * Sends a qualified inquiry to a specific business.
 * Triggers a notification to the business owner via DB trigger.
 */

interface Props {
  businessId: string;
  businessName?: string;
  source?: string; // e.g. 'business-profile', 'search-result'
  onSuccess?: () => void;
  className?: string;
}

const schema = z.object({
  name: z.string().trim().min(2, 'minName').max(200),
  email: z.string().trim().email('invalidEmail').max(254),
  phone: z.string().trim().max(32).optional().or(z.literal('')),
  subject: z.string().trim().max(300).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'minMessage').max(5000),
  budget_range: z.string().optional(),
  contact_preference: z.enum(['any', 'email', 'phone', 'whatsapp', 'platform']).default('any'),
});

type FormState = z.infer<typeof schema>;

const BUDGET_OPTIONS = [
  { v: '', ar: 'غير محدد', en: 'Not specified' },
  { v: '<5k', ar: 'أقل من 5,000 ر.س', en: 'Under 5,000 SAR' },
  { v: '5k-20k', ar: '5,000 - 20,000 ر.س', en: '5,000 - 20,000 SAR' },
  { v: '20k-100k', ar: '20,000 - 100,000 ر.س', en: '20,000 - 100,000 SAR' },
  { v: '100k-500k', ar: '100,000 - 500,000 ر.س', en: '100,000 - 500,000 SAR' },
  { v: '>500k', ar: 'أكثر من 500,000 ر.س', en: 'Over 500,000 SAR' },
];

const CONTACT_OPTIONS: { v: FormState['contact_preference']; ar: string; en: string }[] = [
  { v: 'any', ar: 'أي طريقة', en: 'Any' },
  { v: 'email', ar: 'بريد إلكتروني', en: 'Email' },
  { v: 'phone', ar: 'هاتف', en: 'Phone' },
  { v: 'whatsapp', ar: 'واتساب', en: 'WhatsApp' },
  { v: 'platform', ar: 'عبر المنصة', en: 'Via platform' },
];

export const LeadRequestForm: React.FC<Props> = ({ businessId, businessName, source, onSuccess, className }) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', subject: '', message: '',
    budget_range: '', contact_preference: 'any',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errMsg = (key: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      minName: { ar: 'الاسم قصير جداً', en: 'Name too short' },
      invalidEmail: { ar: 'البريد غير صحيح', en: 'Invalid email' },
      minMessage: { ar: 'الرسالة قصيرة جداً (10 أحرف على الأقل)', en: 'Message too short (min 10 chars)' },
    };
    return isRTL ? (map[key]?.ar ?? key) : (map[key]?.en ?? key);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      parsed.error.issues.forEach((iss) => {
        const k = iss.path[0] as keyof FormState;
        fieldErrors[k] = iss.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const leadId = crypto.randomUUID();
      const payload = {
        id: leadId,
        business_id: businessId,
        user_id: user?.id ?? null,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        subject: parsed.data.subject || null,
        message: parsed.data.message,
        budget_range: parsed.data.budget_range || null,
        contact_preference: parsed.data.contact_preference,
        source: source ?? 'business-profile',
      };
      const { error } = await supabase
        .from('lead_requests')
        .insert(payload);
      if (error) throw error;

      // Fire-and-forget owner email notification. Failure must NOT break lead capture.
      notifySupplierLead(leadId);

      // Canonical lead conversion event (Phase 6). `lead_request_submitted` deprecated.
      // PII-safe — no name/email/phone in dataLayer.
      track.supplierLeadSubmitted({
        source_page: source ?? 'business-profile',
        inquiry_type: parsed.data.contact_preference,
        is_authenticated: !!user,
        ...getAttributionPayload(),
      });
      setSubmitted(true);
      toast.success(isRTL ? 'تم إرسال طلبك بنجاح' : 'Your request has been sent');
      onSuccess?.();
    } catch (err: unknown) {
      // Supabase errors are plain objects with { message, code, details, hint }.
      let message = 'Unknown error';
      if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === 'object') {
        const e = err as { message?: string; details?: string; hint?: string; code?: string };
        message = e.message || e.details || e.hint || e.code || 'Unknown error';
      }
      console.error('LeadRequestForm submit failed:', err);
      try {
        trackLeadFailed({
          source_page: source ?? 'business-profile',
          inquiry_type: parsed.data.contact_preference,
          is_authenticated: !!user,
          reason_category: categorizeReason(err),
        });
      } catch { /* analytics never breaks lead capture */ }
      setServerError(isRTL ? `حدث خطأ: ${message}` : `Error: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="p-6 sm:p-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-success dark:text-success" />
          </div>
          <h3 className="text-base font-semibold">
            {isRTL ? 'تم إرسال طلبك بنجاح' : 'Request sent successfully'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {isRTL
              ? `سيتواصل معك ${businessName ?? 'المزود'} خلال 24-48 ساعة عبر طريقة التواصل المفضلة لديك.`
              : `${businessName ?? 'The provider'} will reach out within 24-48 hours via your preferred contact method.`}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => { setSubmitted(false); setForm({ ...form, message: '', subject: '' }); }}>
            {isRTL ? 'إرسال طلب آخر' : 'Send another request'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lr-name" className="text-xs">{isRTL ? 'الاسم *' : 'Name *'}</Label>
              <Input id="lr-name" dir="auto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10" autoComplete="name" required />
              {errors.name && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errMsg(errors.name)}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lr-email" className="text-xs">{isRTL ? 'البريد الإلكتروني *' : 'Email *'}</Label>
              <Input id="lr-email" type="email" dir="ltr" className="h-10 tech-content" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required />
              {errors.email && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errMsg(errors.email)}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lr-phone" className="text-xs">{isRTL ? 'الهاتف (اختياري)' : 'Phone (optional)'}</Label>
              <Input id="lr-phone" type="tel" dir="ltr" className="h-10 tech-content" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? 'طريقة التواصل المفضلة' : 'Preferred contact'}</Label>
              <Select value={form.contact_preference} onValueChange={(v) => setForm({ ...form, contact_preference: v as FormState['contact_preference'] })}>
                <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_OPTIONS.map((o) => (
                    <SelectItem key={o.v} value={o.v}>{isRTL ? o.ar : o.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="lr-subject" className="text-xs">{isRTL ? 'موضوع الطلب (اختياري)' : 'Subject (optional)'}</Label>
            <Input id="lr-subject" dir="auto" className="h-10" value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder={isRTL ? 'مثال: عرض سعر لواجهة زجاجية' : 'e.g. Quote for glass facade'} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isRTL ? 'الميزانية المتوقعة' : 'Expected budget'}</Label>
            <Select value={form.budget_range || 'none'} onValueChange={(v) => setForm({ ...form, budget_range: v === 'none' ? '' : v })}>
              <SelectTrigger className="h-10 text-xs"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map((o) => (
                  <SelectItem key={o.v || 'none'} value={o.v || 'none'}>{isRTL ? o.ar : o.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="lr-message" className="text-xs">{isRTL ? 'تفاصيل المشروع *' : 'Project details *'}</Label>
            <Textarea id="lr-message" dir="auto" rows={5} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder={isRTL ? 'صف المشروع، الموقع، المدة المطلوبة...' : 'Describe scope, location, timeline...'} required />
            <div className="flex justify-between items-center">
              {errors.message ? (
                <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errMsg(errors.message)}</p>
              ) : <span />}
              <span className="text-[10px] text-muted-foreground tech-content">{form.message.length}/5000</span>
            </div>
          </div>

          {serverError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{serverError}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full h-11 gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting
              ? (isRTL ? 'جاري الإرسال...' : 'Sending...')
              : (isRTL ? 'إرسال الطلب' : 'Send request')}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {isRTL
              ? 'بإرسالك هذا الطلب، توافق على مشاركة معلومات التواصل مع المزود.'
              : 'By submitting, you agree to share your contact details with the provider.'}
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeadRequestForm;