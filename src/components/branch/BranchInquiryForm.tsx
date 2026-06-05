import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BranchInquiryFormProps {
  branchId: string;
  businessId: string;
  serviceId?: string | null;
  serviceName?: string | null;
  compact?: boolean;
  onSubmitted?: () => void;
}

/**
 * Inline (no popup) inquiry form for a branch.
 * - Requires the visitor to be authenticated; otherwise prompts them to log in.
 * - Submits to `branch_inquiries` and shows a success state inline.
 */
export const BranchInquiryForm: React.FC<BranchInquiryFormProps> = ({
  branchId, businessId, serviceId, serviceName, compact, onSubmitted,
}) => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: serviceName
      ? (isRTL ? `أرغب بطلب عرض سعر لخدمة: ${serviceName}` : `Please send a quote for: ${serviceName}`)
      : '',
    budget: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('AUTH');
      const { error } = await supabase.from('branch_inquiries').insert({
        branch_id: branchId,
        business_id: businessId,
        user_id: user.id,
        service_id: serviceId ?? null,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        message: form.message.trim(),
        budget: form.budget ? Number(form.budget) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ['my-branch-inquiries'] });
      toast.success(isRTL ? 'تم إرسال استفسارك بنجاح' : 'Inquiry sent successfully');
      onSubmitted?.();
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === 'AUTH') {
        toast.error(isRTL ? 'يرجى تسجيل الدخول للإرسال' : 'Please sign in to submit');
        navigate('/auth');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(isRTL ? `تعذّر الإرسال: ${msg}` : `Failed to send: ${msg}`);
    },
  });

  if (done) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-semibold">
            {isRTL ? 'تم استلام استفسارك' : 'Inquiry received'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {isRTL
              ? 'سيتواصل معك مزود الخدمة قريبًا. يمكنك متابعة الحالة من لوحة "استفساراتي".'
              : 'The provider will contact you soon. Track the status from "My inquiries" in your dashboard.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/inquiries')}>
            {isRTL ? 'استفساراتي' : 'My inquiries'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className={compact ? 'p-4 space-y-3' : 'p-6 space-y-4'}>
        <h3 className="font-semibold flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          {isRTL ? 'استفسار / طلب عرض سعر' : 'Inquiry / Request a quote'}
        </h3>
        {serviceName && (
          <p className="text-xs text-muted-foreground" dir="auto">
            {isRTL ? 'بخصوص:' : 'About:'} <span className="font-medium text-foreground">{serviceName}</span>
          </p>
        )}
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        >
          <div className="space-y-1">
            <Label htmlFor="bi-name" className="text-xs">{isRTL ? 'الاسم' : 'Name'} *</Label>
            <Input id="bi-name" required minLength={2} maxLength={120} dir="auto"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bi-phone" className="text-xs">{isRTL ? 'الهاتف' : 'Phone'} *</Label>
            <Input id="bi-phone" required minLength={5} maxLength={30} dir="ltr" className="tech-content"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="bi-email" className="text-xs">{isRTL ? 'البريد (اختياري)' : 'Email (optional)'}</Label>
            <Input id="bi-email" type="email" maxLength={255} dir="ltr" className="tech-content"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bi-budget" className="text-xs">{isRTL ? 'الميزانية (ريال)' : 'Budget (SAR)'}</Label>
            <Input id="bi-budget" type="number" min={0} dir="ltr" className="tech-content"
              value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="bi-message" className="text-xs">{isRTL ? 'تفاصيل الطلب' : 'Request details'} *</Label>
            <Textarea id="bi-message" required minLength={5} maxLength={2000} rows={4} dir="auto"
              value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-1">
            <Button type="submit" disabled={mutation.isPending} className="gap-2 rounded-xl">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isRTL ? 'إرسال الاستفسار' : 'Send inquiry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BranchInquiryForm;