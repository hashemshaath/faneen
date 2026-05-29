/**
 * CUSTOMER-EXPERIENCE-1 — Provider-side card for issuing & monitoring the
 * customer tracking portal link for a single work order.
 *
 * Inline UI only (no modals). Token is shown ONCE on creation, never
 * re-fetched. Copy / revoke are local actions on the issued link.
 */
import { useCallback, useState } from 'react';
import { Copy, Link2, Loader2, ShieldOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  buildCustomerPortalUrl,
  createCustomerTrackingLink,
  revokeCustomerTrackingLink,
} from '@/modules/customerTracking';

interface Props {
  workOrderId: string;
  customerEmail?: string | null;
  canManage: boolean;
}

interface Issued {
  refId: string;
  url: string;
}

export function CustomerTrackingCard({ workOrderId, customerEmail, canManage }: Props) {
  const { isRTL } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [copied, setCopied] = useState(false);

  const tx = {
    title: isRTL ? 'متابعة العميل' : 'Customer Tracking',
    desc: isRTL
      ? 'أنشئ رابطًا آمنًا لمشاركته مع العميل لمتابعة المشروع.'
      : 'Create a secure read-only link to share with the customer.',
    create: isRTL ? 'إنشاء رابط متابعة' : 'Create tracking link',
    copy: isRTL ? 'نسخ' : 'Copy',
    copied: isRTL ? 'تم النسخ' : 'Copied',
    revoke: isRTL ? 'إبطال الرابط' : 'Revoke link',
    revoked: isRTL ? 'تم إبطال الرابط' : 'Link revoked',
    err: isRTL ? 'تعذّر إنشاء الرابط.' : 'Could not create link.',
  };

  const onCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    const { data, error: err } = await createCustomerTrackingLink({
      workOrderId,
      customerEmail: customerEmail ?? null,
    });
    setBusy(false);
    if (err || !data) {
      setError(tx.err);
      return;
    }
    setIssued({
      refId: data.ref_id,
      url: buildCustomerPortalUrl(data.ref_id, data.token),
    });
    setRevoked(false);
  }, [workOrderId, customerEmail, tx.err]);

  const onCopy = useCallback(async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + issued.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silent */
    }
  }, [issued]);

  const onRevoke = useCallback(async () => {
    if (!issued) return;
    setBusy(true);
    const { ok } = await revokeCustomerTrackingLink(issued.refId);
    setBusy(false);
    if (ok) {
      setRevoked(true);
      setIssued(null);
    }
  }, [issued]);

  if (!canManage) return null;

  return (
    <div
      className="rounded-2xl border bg-card p-4 shadow-sm"
      data-testid="customer-tracking-card"
    >
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{tx.title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{tx.desc}</p>

      {!issued && !revoked && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl h-10"
          onClick={onCreate}
          disabled={busy}
          data-testid="customer-tracking-create"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin me-1" />
          ) : (
            <Link2 className="w-4 h-4 me-1" />
          )}
          {tx.create}
        </Button>
      )}

      {issued && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs">
            <span className="tech-content truncate flex-1">{issued.url}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={onCopy}
              data-testid="customer-tracking-copy"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="ms-1">{copied ? tx.copied : tx.copy}</span>
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-destructive hover:text-destructive"
            onClick={onRevoke}
            disabled={busy}
            data-testid="customer-tracking-revoke"
          >
            <ShieldOff className="w-4 h-4 me-1" /> {tx.revoke}
          </Button>
        </div>
      )}

      {revoked && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <ShieldOff className="w-4 h-4" /> {tx.revoked}
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-destructive">{error}</div>
      )}
    </div>
  );
}