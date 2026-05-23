import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Clock, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Copy, Loader2, Building2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { listMyStaffInvitations } from '@/modules/identity';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STAFF_ROLE_META, type StaffRole } from '@/components/dashboard/business-edit/types';

interface MyInvitationRow {
  id: string;
  business_id: string;
  business_name_ar: string | null;
  business_name_en: string | null;
  email: string;
  role: StaffRole;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  is_expired: boolean;
}

const STATUS_TONE: Record<string, string> = {
  pending: 'border-info/30 bg-info/10 text-info',
  accepted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  revoked: 'border-destructive/30 bg-destructive/10 text-destructive',
  expired: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

const statusLabel = (s: MyInvitationRow['status'], expired: boolean, isRTL: boolean): string => {
  const effective = expired && s === 'pending' ? 'expired' : s;
  if (isRTL) {
    return ({ pending: 'معلّقة', accepted: 'مقبولة', revoked: 'مرفوضة/ملغاة', expired: 'منتهية' } as const)[effective];
  }
  return ({ pending: 'Pending', accepted: 'Accepted', revoked: 'Revoked', expired: 'Expired' } as const)[effective];
};

interface Props {
  /** Render only when there is at least one invitation (default true). */
  hideWhenEmpty?: boolean;
  className?: string;
}

export const MyInvitationsStatus: React.FC<Props> = ({ hideWhenEmpty = true, className }) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['my-staff-invitations', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyInvitationRow[]> => {
      const { data, error } = await listMyStaffInvitations();
      if (error) throw error;
      return (data ?? []) as MyInvitationRow[];
    },
  });

  if (!user) return null;
  if (isLoading) return null;
  if (hideWhenEmpty && invitations.length === 0) return null;

  const counts = {
    pending: invitations.filter((i) => i.status === 'pending' && !i.is_expired).length,
    expired: invitations.filter((i) => i.status === 'expired' || (i.status === 'pending' && i.is_expired)).length,
    revoked: invitations.filter((i) => i.status === 'revoked').length,
    accepted: invitations.filter((i) => i.status === 'accepted').length,
  };

  const acceptUrl = (token: string) => `${window.location.origin}/staff-invite/${token}`;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(acceptUrl(token));
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    } catch {
      toast.error(isRTL ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {isRTL ? 'دعوات الربط بالمنشآت' : 'Business linking invitations'}
              <Badge variant="outline" className="text-[11px]">{invitations.length}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL
                ? 'الدعوات الموجَّهة لبريدك الإلكتروني. قبول الدعوة يُفعِّل ظهور المنشأة في حسابك ويمنحك الصلاحيات المحدَّدة.'
                : 'Invitations addressed to your email. Accepting an invitation links the business to your account and unlocks the assigned permissions.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {counts.pending > 0 && (
            <Badge variant="outline" className={STATUS_TONE.pending}>
              <Clock className="w-3 h-3 me-1" />
              {isRTL ? `معلّقة: ${counts.pending}` : `Pending: ${counts.pending}`}
            </Badge>
          )}
          {counts.expired > 0 && (
            <Badge variant="outline" className={STATUS_TONE.expired}>
              <AlertTriangle className="w-3 h-3 me-1" />
              {isRTL ? `منتهية: ${counts.expired}` : `Expired: ${counts.expired}`}
            </Badge>
          )}
          {counts.revoked > 0 && (
            <Badge variant="outline" className={STATUS_TONE.revoked}>
              <XCircle className="w-3 h-3 me-1" />
              {isRTL ? `مرفوضة: ${counts.revoked}` : `Revoked: ${counts.revoked}`}
            </Badge>
          )}
          {counts.accepted > 0 && (
            <Badge variant="outline" className={STATUS_TONE.accepted}>
              <CheckCircle2 className="w-3 h-3 me-1" />
              {isRTL ? `مقبولة: ${counts.accepted}` : `Accepted: ${counts.accepted}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {isRTL ? 'لا توجد دعوات حاليًا.' : 'No invitations right now.'}
          </p>
        ) : (
          <ul className="rounded-lg border border-border divide-y divide-border bg-card">
            {invitations.map((inv) => {
              const expired = inv.is_expired || inv.status === 'expired';
              const effectiveStatus = expired && inv.status === 'pending' ? 'expired' : inv.status;
              const canAccept = inv.status === 'pending' && !expired;
              const businessName = isRTL
                ? (inv.business_name_ar ?? inv.business_name_en ?? '—')
                : (inv.business_name_en ?? inv.business_name_ar ?? '—');
              return (
                <li key={inv.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate">{businessName}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{isRTL ? STAFF_ROLE_META[inv.role].ar : STAFF_ROLE_META[inv.role].en}</span>
                      <span>·</span>
                      <Clock className="w-3 h-3" />
                      <span className="tech-content">
                        {isRTL ? 'تنتهي ' : 'expires '}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_TONE[effectiveStatus]}>
                    {effectiveStatus === 'pending' && <Clock className="w-3 h-3 me-1" />}
                    {effectiveStatus === 'accepted' && <CheckCircle2 className="w-3 h-3 me-1" />}
                    {effectiveStatus === 'expired' && <AlertTriangle className="w-3 h-3 me-1" />}
                    {effectiveStatus === 'revoked' && <XCircle className="w-3 h-3 me-1" />}
                    {statusLabel(inv.status, expired, isRTL)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {canAccept && (
                      <Button asChild size="sm" className="gap-1">
                        <a href={`/staff-invite/${inv.token}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                          {isRTL ? 'إدارة القبول' : 'Manage'}
                        </a>
                      </Button>
                    )}
                    {canAccept && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        title={isRTL ? 'نسخ الرابط' : 'Copy link'}
                        onClick={() => copyLink(inv.token)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {effectiveStatus === 'expired' && (
                      <span className="text-[11px] text-muted-foreground">
                        {isRTL ? 'اطلب من المالك إعادة الإرسال' : 'Ask the owner to resend'}
                      </span>
                    )}
                    {effectiveStatus === 'revoked' && (
                      <span className="text-[11px] text-muted-foreground">
                        {isRTL ? 'تم إلغاؤها من قِبل المالك' : 'Revoked by the owner'}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="rounded-md border border-dashed bg-muted/20 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
          {isRTL ? (
            <>
              <strong className="text-foreground">تأثير الدعوات على ظهور المنشأة:</strong> الدعوات المعلّقة لا تربط حسابك بالمنشأة بعد، لذا لن تظهر في لوحة التحكم. الدعوات المنتهية أو المرفوضة تتطلّب إعادة إرسال من المالك. بمجرد قبول الدعوة، يتم ربط حسابك تلقائيًا وتظهر المنشأة وتُفعَّل الصلاحيات.
            </>
          ) : (
            <>
              <strong className="text-foreground">Impact on business visibility:</strong> Pending invitations don't link your account yet, so the business won't appear in your dashboard. Expired or revoked invitations require the owner to resend. Once accepted, your account is linked and the business with its permissions becomes visible immediately.
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};