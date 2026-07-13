/**
 * Phase E — inline (never modal) cancellation controls for the client on
 * their own RFQ detail page. Two flavors:
 *
 *   • Pre-award (`awarded_bid_id IS NULL`, status not completed/cancelled/expired)
 *     → "إلغاء الطلب" button + inline reason panel; on confirm calls
 *     `cancelRfqPreAward` and reloads.
 *
 *   • Post-award (`awarded_bid_id IS NOT NULL`, status not completed/cancelled)
 *     → "طلب إلغاء التعاقد" button + inline reason panel; on submit calls
 *     `createPostAwardCancellationRequest`. A read-only list of prior
 *     requests + provider responses is rendered below.
 *
 * Honors project rule: NO dialogs / popups. Only inline forms + cards.
 */
import React from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { AlertTriangle, Ban, MessageSquareWarning, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  cancelRfqPreAward,
  createPostAwardCancellationRequest,
  listCancellationRequestsForRfq,
  type RfqCancellationRequestRow,
} from './services';

export interface RfqCancellationActionsProps {
  quoteRequestId: string;
  status: string;
  awardedBidId: string | null;
  validUntil: string | null;
  isRTL?: boolean;
  refId?: string | null;
}

export const RfqCancellationActions: React.FC<RfqCancellationActionsProps> = ({
  quoteRequestId,
  status,
  awardedBidId,
  validUntil,
  isRTL = true,
}) => {
  const qc = useQueryClient();
  const [reason, setReason] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const isClosed = status === 'completed' || status === 'cancelled';
  const isAwarded = !!awardedBidId;

  const cancelReqsQuery = useQuery({
    queryKey: ['rfq-cancellation-requests', quoteRequestId],
    enabled: isAwarded,
    queryFn: () => listCancellationRequestsForRfq(quoteRequestId),
  });

  const preAwardMutation = useMutation({
    mutationFn: () => cancelRfqPreAward({ quoteRequestId, reason: reason.trim() || null }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم إلغاء الطلب' : 'Request cancelled');
      setOpen(false);
      setReason('');
      qc.invalidateQueries({ queryKey: ['quote-request', quoteRequestId] });
      qc.invalidateQueries({ queryKey: ['my-quote-requests'] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : (isRTL ? 'تعذر إلغاء الطلب' : 'Could not cancel'));
    },
  });

  const postAwardMutation = useMutation({
    mutationFn: () => createPostAwardCancellationRequest({ quoteRequestId, reason: reason.trim() }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال طلب الإلغاء للمزوّد' : 'Cancellation request sent to provider');
      setOpen(false);
      setReason('');
      qc.invalidateQueries({ queryKey: ['rfq-cancellation-requests', quoteRequestId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : (isRTL ? 'تعذر إرسال الطلب' : 'Could not submit'));
    },
  });

  if (isClosed) return null;

  const hasPendingReq = (cancelReqsQuery.data ?? []).some((r) => r.status === 'pending');

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold">
              {isAwarded
                ? (isRTL ? 'إلغاء التعاقد بعد الترسية' : 'Cancel after award')
                : (isRTL ? 'إلغاء طلب عرض السعر' : 'Cancel this RFQ')}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {isAwarded
                ? (isRTL
                    ? 'بعد الترسية يحتاج الإلغاء إلى موافقة المزوّد المعتمد، وقد تنطبق الشروط الجزائية المتفق عليها إن وُجد عقد.'
                    : 'After award, cancellation requires the awarded provider to accept. Penalty terms in any signed contract may apply.')
                : (isRTL
                    ? 'يمكنك إلغاء الطلب فورًا قبل الترسية. سيتم إشعار جميع المزوّدين الذين لديهم عروض مفتوحة.'
                    : 'You can cancel freely before award. All providers with open bids will be notified.')}
            </p>
            {validUntil && !isAwarded && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {isRTL ? 'تنتهي الصلاحية في: ' : 'Expires on: '}
                <span className="tech-content" dir="ltr">
                  {new Date(validUntil).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                </span>
              </p>
            )}
          </div>
          {!open && !hasPendingReq && (
            <Button
              size="sm"
              variant={isAwarded ? 'outline' : 'destructive'}
              onClick={() => setOpen(true)}
              className="gap-1.5"
            >
              {isAwarded ? <MessageSquareWarning className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
              {isAwarded
                ? (isRTL ? 'طلب إلغاء التعاقد' : 'Request cancellation')
                : (isRTL ? 'إلغاء الطلب' : 'Cancel request')}
            </Button>
          )}
        </div>

        {open && (
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <label className="text-xs text-muted-foreground">
              {isAwarded
                ? (isRTL ? 'اكتب سبب طلب الإلغاء (مطلوب)' : 'Reason for cancellation (required)')
                : (isRTL ? 'سبب الإلغاء (اختياري)' : 'Reason (optional)')}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              dir={isRTL ? 'rtl' : 'ltr'}
              rows={3}
              placeholder={isRTL ? 'اذكر السبب باختصار...' : 'Briefly describe the reason...'}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setOpen(false); setReason(''); }}
                disabled={preAwardMutation.isPending || postAwardMutation.isPending}
              >
                {isRTL ? 'إلغاء' : 'Dismiss'}
              </Button>
              <Button
                size="sm"
                variant={isAwarded ? 'default' : 'destructive'}
                onClick={() => (isAwarded ? postAwardMutation.mutate() : preAwardMutation.mutate())}
                disabled={
                  preAwardMutation.isPending ||
                  postAwardMutation.isPending ||
                  (isAwarded && reason.trim().length < 3)
                }
                className="gap-1.5"
              >
                {(preAwardMutation.isPending || postAwardMutation.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isAwarded
                  ? (isRTL ? 'إرسال الطلب' : 'Submit request')
                  : (isRTL ? 'تأكيد الإلغاء' : 'Confirm cancellation')}
              </Button>
            </div>
          </div>
        )}

        {isAwarded && (cancelReqsQuery.data ?? []).length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-muted-foreground">
              {isRTL ? 'سجل طلبات الإلغاء' : 'Cancellation requests'}
            </div>
            <ul className="space-y-2">
              {(cancelReqsQuery.data ?? []).map((r) => (
                <li key={r.id} className="rounded-md border border-border bg-background p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'accepted' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {r.status === 'pending' && (isRTL ? 'بانتظار الرد' : 'Pending')}
                      {r.status === 'accepted' && (isRTL ? 'مقبول' : 'Accepted')}
                      {r.status === 'rejected' && (isRTL ? 'مرفوض' : 'Rejected')}
                    </Badge>
                    <span className="text-muted-foreground tech-content" dir="ltr">
                      {new Date(r.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                  {r.reason && <div className="mt-1 text-foreground/80">{r.reason}</div>}
                  {(r.provider_response || r.penalty_note) && (
                    <div className="mt-1 border-t border-border pt-1">
                      {r.provider_response && (
                        <div><span className="text-muted-foreground">{isRTL ? 'ردّ المزوّد: ' : 'Provider response: '}</span>{r.provider_response}</div>
                      )}
                      {r.penalty_note && (
                        <div><span className="text-muted-foreground">{isRTL ? 'الشروط الجزائية: ' : 'Penalty note: '}</span>{r.penalty_note}</div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Provider-side response panel. Rendered on the awarded provider's view of the
 * opportunity (or their client-workspace view of the RFQ). Only surfaces when
 * a pending request exists; the awarded-provider RLS policy above lets them
 * update it. `onDecided` is fired after each successful response.
 */
import { respondToCancellationRequest } from './services';

export interface ProviderRespondToCancellationProps {
  request: RfqCancellationRequestRow;
  isRTL?: boolean;
  onDecided?: () => void;
}

export const ProviderRespondToCancellation: React.FC<ProviderRespondToCancellationProps> = ({
  request,
  isRTL = true,
  onDecided,
}) => {
  const [note, setNote] = React.useState('');
  const [mode, setMode] = React.useState<'idle' | 'reject' | 'penalty'>('idle');
  const qc = useQueryClient();

  const acceptM = useMutation({
    mutationFn: () => respondToCancellationRequest({ requestId: request.id, decision: 'accepted' }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم قبول طلب الإلغاء' : 'Cancellation accepted');
      qc.invalidateQueries({ queryKey: ['rfq-cancellation-requests', request.quote_request_id] });
      onDecided?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  });
  const rejectM = useMutation({
    mutationFn: (withPenalty: boolean) =>
      respondToCancellationRequest({
        requestId: request.id,
        decision: 'rejected',
        providerResponse: !withPenalty ? note.trim() || null : null,
        penaltyNote: withPenalty ? (note.trim() || (isRTL ? 'يُرجى الرجوع إلى الشروط الجزائية في العقد.' : 'Refer to penalty terms in the contract.')) : null,
      }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم رفض طلب الإلغاء' : 'Cancellation rejected');
      qc.invalidateQueries({ queryKey: ['rfq-cancellation-requests', request.quote_request_id] });
      onDecided?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  if (request.status !== 'pending') return null;

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <MessageSquareWarning className="h-4 w-4 text-warning mt-0.5" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold">
              {isRTL ? 'طلب إلغاء تعاقد من العميل' : 'Client requested cancellation'}
            </h4>
            {request.reason && (
              <p className="mt-1 text-xs text-foreground/80">{request.reason}</p>
            )}
          </div>
        </div>

        {mode === 'idle' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => acceptM.mutate()} disabled={acceptM.isPending}>
              {isRTL ? 'قبول الإلغاء' : 'Accept cancellation'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode('reject')}>
              {isRTL ? 'رفض' : 'Reject'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode('penalty')}>
              {isRTL ? 'الإحالة للشروط الجزائية' : 'Refer to penalty terms'}
            </Button>
          </div>
        )}

        {mode !== 'idle' && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              {mode === 'penalty'
                ? (isRTL ? 'اذكر ملخص الشروط الجزائية' : 'Summarize penalty terms')
                : (isRTL ? 'اذكر سبب الرفض (اختياري)' : 'Rejection note (optional)')}
            </label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} dir={isRTL ? 'rtl' : 'ltr'} />
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setMode('idle'); setNote(''); }}>
                {isRTL ? 'إلغاء' : 'Dismiss'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => rejectM.mutate(mode === 'penalty')}
                disabled={rejectM.isPending}
              >
                {isRTL ? 'إرسال' : 'Submit'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RfqCancellationActions;