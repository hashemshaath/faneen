import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { createMembershipPaymentIntent } from '@/modules/memberships';
import type { CreateMembershipPaymentIntentInput } from '@/modules/memberships';

/**
 * R4F-9C: User-facing checkout entry for the live Moyasar provider.
 *
 * - Calls the canonical `createMembershipPaymentIntent` wrapper only.
 * - Never invokes the edge function directly.
 * - Never calls Moyasar from the browser.
 * - Never activates the subscription on the client.
 *
 * On success, redirects the browser to the Moyasar-hosted checkout URL
 * returned by the edge function. All amount/currency validation happens
 * server-side; the client provides only the subscription context.
 */

interface Props {
  subscriptionId: string;
  isRTL: boolean;
  /** Optional disabled state controlled by the page (e.g. unauthenticated). */
  disabled?: boolean;
  className?: string;
}

interface CreateIntentSuccess {
  ok: true;
  payment_intent_id: string;
  provider: 'moyasar';
  checkout_url: string;
  status: string;
  reused?: boolean;
}
interface CreateIntentFailure {
  ok: false;
  code:
    | 'missing_payment_config'
    | 'unauthorized'
    | 'not_found'
    | 'not_eligible'
    | 'provider_error'
    | 'amount_mismatch'
    | 'invalid_body'
    | 'method_not_allowed';
}
type CreateIntentResponse = CreateIntentSuccess | CreateIntentFailure;

function friendlyError(code: CreateIntentFailure['code'], isRTL: boolean): string {
  switch (code) {
    case 'missing_payment_config':
      return isRTL
        ? 'الدفع الإلكتروني غير مفعّل حاليًا. يرجى المحاولة لاحقًا أو التواصل مع الدعم.'
        : 'Online payment is not available yet. Please try again later or contact support.';
    case 'not_eligible':
      return isRTL
        ? 'لا يمكن إنشاء عملية دفع لهذه العضوية حاليًا.'
        : 'This membership is not eligible for payment right now.';
    case 'not_found':
      return isRTL ? 'تعذّر العثور على بيانات الاشتراك.' : 'Subscription not found.';
    case 'unauthorized':
      return isRTL ? 'يرجى تسجيل الدخول للمتابعة.' : 'Please sign in to continue.';
    case 'provider_error':
    default:
      return isRTL
        ? 'تعذّر بدء عملية الدفع. يرجى المحاولة مرة أخرى.'
        : 'Could not start the payment. Please try again.';
  }
}

export const MembershipCheckoutButton: React.FC<Props> = ({
  subscriptionId,
  isRTL,
  disabled,
  className,
}) => {
  const [loading, setLoading] = React.useState(false);

  const label = isRTL ? 'المتابعة للدفع' : 'Continue to payment';
  const loadingLabel = isRTL ? 'جارٍ تحضير الدفع…' : 'Preparing payment…';

  const handleClick = async () => {
    if (loading || disabled || !subscriptionId) return;
    setLoading(true);
    try {
      // The server recomputes amount / currency / plan from the
      // subscription, so client-supplied numeric fields are intentionally
      // minimal. The wrapper preserves its existing typed shape.
      const payload = {
        subscriptionId,
        provider: 'moyasar',
      } as unknown as CreateMembershipPaymentIntentInput;

      const { data, error } = await createMembershipPaymentIntent(payload);
      if (error) {
        toast.error(friendlyError('provider_error', isRTL));
        return;
      }
      const resp = data as CreateIntentResponse | null;
      if (!resp || resp.ok !== true) {
        const code: CreateIntentFailure['code'] =
          resp && resp.ok === false ? resp.code : 'provider_error';
        toast.error(friendlyError(code, isRTL));
        return;
      }
      if (!resp.checkout_url) {
        toast.error(friendlyError('provider_error', isRTL));
        return;
      }
      // Hosted checkout — redirect away from the SPA.
      window.location.href = resp.checkout_url;
    } catch {
      toast.error(friendlyError('provider_error', isRTL));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4" />
      )}
      <span>{loading ? loadingLabel : label}</span>
    </Button>
  );
};

export default MembershipCheckoutButton;