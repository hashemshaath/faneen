import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Send, Loader2, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

type ApprovalStatus =
  | 'draft' | 'submitted' | 'under_review'
  | 'approved' | 'rejected' | 'needs_changes' | 'published';

const STATUS_LABEL: Record<ApprovalStatus, { ar: string; en: string; tone: 'muted' | 'info' | 'warn' | 'success' | 'danger' }> = {
  draft:         { ar: 'مسودة',           en: 'Draft',          tone: 'muted'   },
  submitted:     { ar: 'تم الإرسال',      en: 'Submitted',      tone: 'info'    },
  under_review:  { ar: 'قيد المراجعة',    en: 'Under Review',   tone: 'info'    },
  approved:      { ar: 'موافق عليه',      en: 'Approved',       tone: 'success' },
  rejected:      { ar: 'مرفوض',           en: 'Rejected',       tone: 'danger'  },
  needs_changes: { ar: 'يحتاج تعديلات',   en: 'Needs Changes',  tone: 'warn'    },
  published:     { ar: 'منشور',           en: 'Published',      tone: 'success' },
};

const TONE_CLASSES: Record<string, string> = {
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-info/10 text-info dark:text-info',
  warn: 'bg-warning/10 text-warning dark:text-warning',
  success: 'bg-success/10 text-success dark:text-success',
  danger: 'bg-destructive/10 text-destructive',
};

/**
 * Shows the supplier's approval status, completion %, and missing fields.
 * Auto-hides for non-business accounts. Renders nothing while loading.
 */
export function ProviderReadinessCard() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const qc = useQueryClient();

  const { data: business } = useQuery({
    queryKey: ['provider-readiness', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, name_ar, username, logo_url, description_ar, short_description_ar, category_id, city_id, phone, mobile, email, address, approval_status, approval_notes, onboarding_completion, username_status, is_active')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error('no_business');
      const { data, error } = await supabase.rpc('submit_business_for_review', {
        _business_id: business.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إرسال ملفك للمراجعة' : 'Submitted for review');
      qc.invalidateQueries({ queryKey: ['provider-readiness'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error';
      if (msg.includes('low_completion') || msg.includes('50')) {
        toast.error(language === 'ar'
          ? 'يجب إكمال 50٪ على الأقل قبل الإرسال'
          : 'Complete at least 50% before submitting');
      } else {
        toast.error(msg);
      }
    },
  });

  const missing = useMemo(() => {
    if (!business) return [] as { key: string; ar: string; en: string }[];
    const items: { key: string; ar: string; en: string }[] = [];
    if (!business.logo_url) items.push({ key: 'logo', ar: 'الشعار', en: 'Logo' });
    if (!(business.description_ar || business.short_description_ar)) {
      items.push({ key: 'desc', ar: 'وصف النشاط', en: 'Description' });
    }
    if (!business.category_id) items.push({ key: 'category', ar: 'القطاع', en: 'Sector' });
    if (!business.city_id) items.push({ key: 'city', ar: 'المدينة', en: 'City' });
    if (!(business.phone || business.mobile)) items.push({ key: 'phone', ar: 'رقم التواصل', en: 'Phone' });
    if (!business.email) items.push({ key: 'email', ar: 'البريد الإلكتروني', en: 'Email' });
    if (!business.address) items.push({ key: 'address', ar: 'العنوان', en: 'Address' });
    return items;
  }, [business]);

  if (!user || !business) return null;

  const status = (business.approval_status ?? 'draft') as ApprovalStatus;
  const completion = business.onboarding_completion ?? 0;
  const label = STATUS_LABEL[status];
  const canSubmit = status === 'draft' || status === 'needs_changes' || status === 'rejected';
  const isPublic = status === 'approved' || status === 'published';

  return (
    <Card className="overflow-hidden border-accent/20" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {isPublic ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-warning" />
            )}
            {language === 'ar' ? 'جاهزية الملف للنشر' : 'Profile Readiness'}
          </CardTitle>
          <Badge className={TONE_CLASSES[label.tone]}>
            {language === 'ar' ? label.ar : label.en}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'نسبة الإكمال' : 'Completion'}
            </span>
            <span className="tech-content font-bold text-foreground">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
        </div>

        {/* Public URL preview */}
        {business.username && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="text-[11px] text-muted-foreground">
              {language === 'ar' ? 'رابط الملف العام' : 'Public profile URL'}
            </div>
            <div className="tech-content mt-0.5 flex items-center gap-2 text-sm font-medium text-foreground">
              qitaat.com/{business.username}
              {!isPublic && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Clock className="h-3 w-3" />
                  {language === 'ar' ? 'بانتظار الموافقة' : 'Pending approval'}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Admin feedback */}
        {business.approval_notes && (status === 'rejected' || status === 'needs_changes') && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <AlertCircle className="h-3.5 w-3.5" />
              {language === 'ar' ? 'ملاحظات الإدارة' : 'Admin notes'}
            </div>
            <p className="text-foreground">{business.approval_notes}</p>
          </div>
        )}

        {/* Missing fields */}
        {missing.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              {language === 'ar' ? 'حقول ناقصة' : 'Missing fields'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((m) => (
                <Badge key={m.key} variant="outline" className="gap-1 text-[11px]">
                  <AlertCircle className="h-3 w-3 text-warning" />
                  {language === 'ar' ? m.ar : m.en}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/settings">
              {language === 'ar' ? 'تعديل الملف' : 'Edit profile'}
            </Link>
          </Button>
          {canSubmit && (
            <Button
              variant="hero"
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || completion < 50}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {language === 'ar' ? 'إرسال للمراجعة' : 'Submit for review'}
            </Button>
          )}
          {isPublic && (
            <Badge className="gap-1 bg-success/10 text-success">
              <CheckCircle2 className="h-3 w-3" />
              {language === 'ar' ? 'ملفك يظهر للجمهور' : 'Visible to the public'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}