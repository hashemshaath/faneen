import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CircleCheck,
  Clock,
  FileCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { maskEmail as maskInviteEmail, type PendingInvite } from '@/lib/contract-invitations';
import { getWorkType, type WorkTypeKey } from '@/lib/contract-work-types';

export type AcceptedInvitationRow = {
  id: string;
  ref_id: string;
  email_lower: string;
  recipient_name: string | null;
  work_type: string | null;
  template_version_id: string | null;
  accepted_at: string | null;
  status: string;
  bound_contract_id: string | null;
};

interface AcceptedInvitationsPanelProps {
  isRTL: boolean;
  invitations: AcceptedInvitationRow[];
  isCompleting: boolean;
  onRefresh: () => void;
  onCompleteFromInvite: (inviteId: string) => void;
}

/**
 * Read-only list of accepted client invitations awaiting contract issuance.
 * Parent owns the React Query and mutation; this component only renders.
 * Privacy: only masked email is displayed; no raw token, no draft_payload.
 */
export const AcceptedInvitationsPanel: React.FC<AcceptedInvitationsPanelProps> = ({
  isRTL,
  invitations,
  isCompleting,
  onRefresh,
  onCompleteFromInvite,
}) => {
  if (invitations.length === 0) return null;
  const someMissingTemplate = invitations.some((i) => !i.template_version_id);

  return (
    <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CircleCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span className="text-xs font-semibold">
            {isRTL ? 'دعوات مقبولة بانتظار إصدار العقد' : 'Accepted invitations awaiting contract'}
          </span>
          <Badge variant="secondary" className="text-[9px]">{invitations.length}</Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px]"
          onClick={onRefresh}
          aria-label={isRTL ? 'تحديث قائمة الدعوات' : 'Refresh invitations list'}
        >
          <RefreshCw className="w-3 h-3 me-1" aria-hidden="true" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>
      <div className="space-y-2">
        {invitations.map((inv) => {
          const wt = inv.work_type ? getWorkType(inv.work_type as WorkTypeKey) : null;
          return (
            <div
              key={inv.id}
              className="p-3 rounded-lg border border-emerald-500/20 bg-background flex flex-wrap items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[9px] tech-content">{inv.ref_id}</Badge>
                  {wt && <Badge variant="secondary" className="text-[9px]">{isRTL ? wt.ar : wt.en}</Badge>}
                  {inv.template_version_id && (
                    <Badge variant="secondary" className="text-[9px] gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                      {isRTL ? 'قالب جاهز' : 'Template ready'}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span dir="ltr" className="font-mono">{maskInviteEmail(inv.email_lower)}</span>
                  {inv.recipient_name && <span>· {inv.recipient_name}</span>}
                  {inv.accepted_at && (
                    <span dir="ltr">· {new Date(inv.accepted_at).toISOString().slice(0, 10)}</span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="hero"
                size="sm"
                className="h-8 gap-1.5 text-[11px]"
                disabled={!inv.template_version_id || isCompleting}
                onClick={() => onCompleteFromInvite(inv.id)}
              >
                {isCompleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                ) : (
                  <FileCheck className="w-3 h-3" aria-hidden="true" />
                )}
                {isRTL ? 'إكمال إصدار العقد' : 'Complete contract'}
              </Button>
            </div>
          );
        })}
      </div>
      {someMissingTemplate && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isRTL
            ? 'بعض الدعوات لا تحتوي على قالب محفوظ — يلزم إنشاء العقد يدويًا.'
            : 'Some invitations have no saved template — these require manual contract creation.'}
        </p>
      )}
    </div>
  );
};

interface PendingInvitePanelProps {
  isRTL: boolean;
  pendingInvite: PendingInvite;
  pendingInviteAccepted: boolean;
  isCompleting: boolean;
  isResending: boolean;
  isCancelling: boolean;
  onRefresh: () => void;
  onCompleteFromInvite: (inviteId: string) => void;
  onResend: () => void;
  onCancel: () => void;
}

/**
 * Awaiting/accepted state card for a single pending client invitation.
 * Parent owns polling query and all mutations. Only safe fields rendered:
 * ref_id, masked email, expires_at (date only), reminder_count.
 * Never renders token_hash, raw token, or draft_payload.
 */
export const PendingInvitePanel: React.FC<PendingInvitePanelProps> = ({
  isRTL,
  pendingInvite,
  pendingInviteAccepted,
  isCompleting,
  isResending,
  isCancelling,
  onRefresh,
  onCompleteFromInvite,
  onResend,
  onCancel,
}) => {
  return (
    <div className="p-4 rounded-xl border-2 border-warning/40 bg-warning/5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {pendingInviteAccepted ? (
            <CircleCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Clock className="w-4 h-4 text-warning" aria-hidden="true" />
          )}
          <span className="text-xs font-semibold">
            {pendingInviteAccepted
              ? (isRTL ? 'تم قبول الدعوة — جاهزة لإصدار العقد' : 'Invitation accepted — ready to issue contract')
              : (isRTL ? 'بانتظار قبول الدعوة' : 'Awaiting invitation acceptance')}
          </span>
          <Badge variant="secondary" className="text-[9px]">{pendingInvite.ref_id}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[9px]">
            {pendingInviteAccepted ? (isRTL ? 'مقبولة' : 'Accepted') : (isRTL ? 'قيد الانتظار' : 'Pending')}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            onClick={onRefresh}
            aria-label={isRTL ? 'تحديث حالة الدعوة' : 'Refresh invitation status'}
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="text-muted-foreground text-[9px]">{isRTL ? 'البريد' : 'Email'}</div>
          <div dir="ltr" className="font-mono">{maskInviteEmail(pendingInvite.email_lower)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[9px]">{isRTL ? 'صالحة حتى' : 'Valid until'}</div>
          <div dir="ltr">{new Date(pendingInvite.expires_at).toISOString().slice(0, 10)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[9px]">{isRTL ? 'التذكيرات' : 'Reminders'}</div>
          <div>{pendingInvite.reminder_count} / 2</div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {pendingInviteAccepted
          ? (isRTL
            ? 'قبل العميل الدعوة. يمكنك الآن إكمال إصدار العقد.'
            : 'The client accepted the invitation. You can now finalise the contract.')
          : (isRTL
            ? 'بعد قبول العميل للدعوة، يمكنك إنشاء العقد أو سيتم ربط المسودة حسب الخطوة التالية.'
            : 'After the client accepts the invitation, you can create the contract or the draft will be linked in the next step.')}
      </p>
      <div className="flex flex-wrap gap-2">
        {pendingInviteAccepted ? (
          <Button
            type="button"
            variant="hero"
            size="sm"
            className="h-8 gap-1.5 text-[11px]"
            disabled={isCompleting}
            onClick={() => onCompleteFromInvite(pendingInvite.id)}
          >
            {isCompleting ? (
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            ) : (
              <FileCheck className="w-3 h-3" aria-hidden="true" />
            )}
            {isRTL ? 'إكمال إصدار العقد' : 'Complete contract'}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[11px]"
              disabled={isResending || pendingInvite.reminder_count >= 2}
              onClick={onResend}
            >
              {isResending ? (
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
              )}
              {isRTL ? 'إعادة إرسال' : 'Resend'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[11px] text-destructive"
              disabled={isCancelling}
              onClick={onCancel}
            >
              {isCancelling ? (
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              ) : (
                <XCircle className="w-3 h-3" aria-hidden="true" />
              )}
              {isRTL ? 'إلغاء الدعوة' : 'Cancel invitation'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptedInvitationsPanel;