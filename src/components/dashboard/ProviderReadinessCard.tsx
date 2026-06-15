import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useProviderReadiness, type ApprovalStatus } from '@/hooks/useProviderReadiness';

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

  const { business, missing, status, completion, isPublic, canSubmit } = useProviderReadiness(user?.id);

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

  if (!user || !business) return null;

  const label = STATUS_LABEL[status];

  return (
    <Card className="overflow-hidden border-accent/20" dir={isRTL ? 'rtl' : 'ltr'} data-testid="provider-readiness-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {isPublic ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-warning" />
            )}
            {language === 'ar' ? 'اكتمال ملفك' : 'Your profile completion'}
          </CardTitle>
          <Badge className={TONE_CLASSES[label.tone]}>
            {language === 'ar' ? label.ar : label.en}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
          {language === 'ar'
            ? 'كلما اكتمل ملفك زادت فرصة ظهورك واستقبال طلبات مناسبة.'
            : 'The more complete your profile, the better your visibility and the more relevant the requests you receive.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground" data-testid="provider-visibility-message">
          {isPublic
            ? (language === 'ar' ? 'ملفك ظاهر الآن للعملاء.' : 'Your profile is visible to clients now.')
            : (language === 'ar'
                ? 'ملفك غير ظاهر للعامة حتى يكتمل الحد الأدنى ويتم اعتماده.'
                : 'Your profile is not public until it meets the minimum and is approved.')}
        </p>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'نسبة الإكمال' : 'Completion'}
            </span>
            <span className="tech-content font-bold text-foreground">{completion}%</span>
          </div>
          <Progress
            value={completion}
            className="h-2"
            aria-label={language === 'ar' ? `نسبة الإكمال ${completion}٪` : `Completion ${completion}%`}
          />
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