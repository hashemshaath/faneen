import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, ShieldCheck, AlertTriangle, Mail, Building2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { acceptStaffInvitation, getStaffInvitationPreview } from '@/modules/identity';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STAFF_ROLE_META, type StaffRole } from '@/components/dashboard/business-edit/types';

interface PreviewRow {
  id: string;
  business_id: string;
  business_name_ar: string | null;
  business_name_en: string | null;
  email: string;
  role: StaffRole;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
}

const StaffInviteAccept: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  usePageMeta({
    title: isRTL ? 'قبول دعوة المفوّض | قِطاعات' : 'Accept staff invitation | Qitaat',
    noindex: true,
  });

  const [preview, setPreview] = useState<PreviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error: rpcError } = await getStaffInvitationPreview({ _token: token });
      if (!active) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        const row = (data ?? [])[0] as PreviewRow | undefined;
        if (!row) setError(isRTL ? 'الدعوة غير موجودة' : 'Invitation not found');
        else setPreview(row);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [token, isRTL]);

  const expired = useMemo(() => {
    if (!preview) return false;
    return new Date(preview.expires_at).getTime() < Date.now();
  }, [preview]);

  const emailMatch = useMemo(() => {
    if (!preview || !user?.email) return null;
    return preview.email.toLowerCase() === user.email.toLowerCase();
  }, [preview, user]);

  const handleAccept = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/staff-invite/${token}`)}`);
      return;
    }
    setAccepting(true);
    const { data, error: rpcError } = await acceptStaffInvitation({ _token: token });
    setAccepting(false);

    if (rpcError) {
      toast.error(isRTL ? `تعذّر القبول: ${rpcError.message}` : `Failed: ${rpcError.message}`);
      return;
    }
    const result = data as { ok: boolean; code?: string; expected?: string };
    if (result?.ok) {
      setDone(true);
      toast.success(isRTL ? 'تم قبول الدعوة بنجاح' : 'Invitation accepted');
      setTimeout(() => navigate('/dashboard'), 1600);
      return;
    }
    const codeMessages: Record<string, [string, string]> = {
      unauthenticated: ['يرجى تسجيل الدخول أولاً', 'Please sign in first'],
      not_found: ['الدعوة غير موجودة', 'Invitation not found'],
      already_processed: ['تمت معالجة هذه الدعوة مسبقًا', 'This invitation was already processed'],
      expired: ['انتهت صلاحية الدعوة', 'Invitation has expired'],
      email_mismatch: [
        `هذه الدعوة مرسلة إلى ${result.expected}. يرجى تسجيل الدخول بنفس البريد.`,
        `This invitation is for ${result.expected}. Please sign in with the same email.`,
      ],
    };
    const [ar, en] = codeMessages[result?.code ?? ''] ?? ['تعذّر قبول الدعوة', 'Failed to accept invitation'];
    toast.error(isRTL ? ar : en);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg shadow-[var(--elev-2)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {isRTL ? 'دعوة للانضمام كمفوّض' : 'Staff invitation'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'راجع تفاصيل الدعوة قبل القبول. سيتم منحك صلاحية الوصول إلى لوحة المنشأة وفق الدور المحدد.'
              : 'Review the invitation details before accepting. You will be granted access to the business dashboard with the specified role.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin me-2" />
              {isRTL ? 'جارِ التحقق من الدعوة…' : 'Verifying invitation…'}
            </div>
          ) : error || !preview ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <div>{error ?? (isRTL ? 'الدعوة غير صالحة' : 'Invalid invitation')}</div>
            </div>
          ) : done ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-medium">{isRTL ? 'تم قبول الدعوة' : 'Invitation accepted'}</p>
                <p className="text-xs opacity-80 mt-1">
                  {isRTL ? 'سيتم تحويلك إلى لوحة التحكم…' : 'Redirecting to your dashboard…'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'المنشأة' : 'Business'}</p>
                    <p className="font-medium" dir="auto">
                      {(isRTL ? preview.business_name_ar : preview.business_name_en) ?? preview.business_name_ar ?? preview.business_name_en}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'البريد المُرسَل إليه' : 'Sent to'}</p>
                    <p className="font-medium tech-content">{preview.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Badge variant="outline" className={STAFF_ROLE_META[preview.role]?.tone}>
                    <ShieldCheck className="w-3 h-3 me-1" />
                    {isRTL ? STAFF_ROLE_META[preview.role]?.ar : STAFF_ROLE_META[preview.role]?.en}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {isRTL ? 'صالحة حتى:' : 'Valid until:'}{' '}
                    <span className="tech-content ms-1">{new Date(preview.expires_at).toLocaleDateString()}</span>
                  </Badge>
                </div>
              </div>

              {preview.status !== 'pending' && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-warning flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  {isRTL
                    ? `تمت معالجة هذه الدعوة مسبقًا (${preview.status}).`
                    : `This invitation was already processed (${preview.status}).`}
                </div>
              )}
              {expired && preview.status === 'pending' && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  {isRTL ? 'انتهت صلاحية الدعوة. اطلب من المنشأة إعادة الإرسال.' : 'This invitation has expired. Ask the business to resend it.'}
                </div>
              )}
              {user && emailMatch === false && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-warning flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  {isRTL
                    ? `أنت مسجّل بـ ${user.email}. هذه الدعوة لـ ${preview.email}. يرجى تسجيل الدخول بالبريد الصحيح.`
                    : `You're signed in as ${user.email}. This invitation is for ${preview.email}. Please sign in with the correct email.`}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleAccept}
                  disabled={accepting || expired || preview.status !== 'pending' || emailMatch === false}
                  className="flex-1 gap-1.5"
                >
                  {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {user
                    ? (isRTL ? 'قبول الدعوة' : 'Accept invitation')
                    : (isRTL ? 'تسجيل الدخول للقبول' : 'Sign in to accept')}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/">{isRTL ? 'إلغاء' : 'Cancel'}</Link>
                </Button>
              </div>

              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  {isRTL
                    ? `لا حساب لديك؟ يمكنك إنشاء حساب بنفس البريد (${preview.email}) ثم العودة لقبول الدعوة.`
                    : `No account yet? Sign up with the same email (${preview.email}), then return to accept.`}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffInviteAccept;