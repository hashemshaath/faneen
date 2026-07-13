/**
 * T5 — customer-facing return card.
 *
 * Shows the provider-recorded return (condition, damage, refund, notes,
 * photos) with inline ack + dispute actions. Uses the SECURITY DEFINER
 * `acknowledge_rental_return` RPC — the customer cannot edit any other
 * fields directly.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bi, useBi } from '@/components/common/Bilingual';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Loader2, MessageSquare, PackageCheck, X } from 'lucide-react';
import {
  customerAcknowledgeReturn,
  customerDisputeReturn,
  getPhotoSignedUrl,
  type RentalReturn,
} from '../services/returns';
import type { RentalOrder } from '../types';

export interface RentalReturnCustomerCardProps {
  order: RentalOrder;
  ret: RentalReturn;
  /** Provider owner user_id for dispute notifications (optional). */
  providerOwnerUserId?: string | null;
  onChanged?: () => void | Promise<void>;
}

const conditionCopy: Record<RentalReturn['condition'], { ar: string; en: string; tone: string }> = {
  good:          { ar: 'سليمة',   en: 'Good',          tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  damaged:       { ar: 'متضررة',  en: 'Damaged',       tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  missing_parts: { ar: 'نواقص',   en: 'Missing parts', tone: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20' },
};

export const RentalReturnCustomerCard: React.FC<RentalReturnCustomerCardProps> = ({
  order, ret, providerOwnerUserId, onChanged,
}) => {
  const bi = useBi();
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState<'idle' | 'dispute'>('idle');
  const [note, setNote] = React.useState('');
  const [signed, setSigned] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries: Record<string, string | null> = {};
      for (const p of ret.photos ?? []) {
        entries[p.path] = await getPhotoSignedUrl(p.path);
      }
      if (!cancelled) setSigned(entries);
    })();
    return () => { cancelled = true; };
  }, [ret.id, ret.photos]);

  const ack = async () => {
    setBusy(true);
    const r = await customerAcknowledgeReturn(ret.id);
    setBusy(false);
    if (r.error) { toast.error(r.error.message); return; }
    toast.success(bi('تم تأكيد الاستلام', 'Acknowledged'));
    await onChanged?.();
  };

  const dispute = async () => {
    if (note.trim().length < 3) {
      toast.error(bi('اكتب ملاحظة الاعتراض', 'Enter a dispute note'));
      return;
    }
    setBusy(true);
    const r = await customerDisputeReturn(ret.id, note.trim(), {
      rental_order_ref: order.ref_id,
      provider_owner_user_id: providerOwnerUserId ?? null,
    });
    setBusy(false);
    if (r.error) { toast.error(r.error.message); return; }
    toast.success(bi('تم إرسال الاعتراض', 'Dispute submitted'));
    setMode('idle');
    setNote('');
    await onChanged?.();
  };

  const cond = conditionCopy[ret.condition];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PackageCheck className="h-4 w-4" />
            <Bi ar="تقرير الإرجاع" en="Return report" />
          </div>
          <Badge className={cond.tone}><Bi ar={cond.ar} en={cond.en} /></Badge>
        </div>

        {(ret.damage_description || ret.damage_amount > 0) && (
          <div className="text-sm space-y-1">
            {ret.damage_description && (
              <div className="whitespace-pre-wrap"><span className="text-muted-foreground me-1"><Bi ar="التفاصيل:" en="Details:" /></span>{ret.damage_description}</div>
            )}
            {ret.damage_amount > 0 && (
              <div className="text-xs text-muted-foreground">
                <Bi ar="قيمة الضرر:" en="Damage amount:" />{' '}
                <span className="tech-content" dir="ltr">{Number(ret.damage_amount).toFixed(2)} {order.currency}</span>
              </div>
            )}
          </div>
        )}

        {ret.deposit_refunded != null && Number(order.deposit_amount) > 0 && (
          <div className="rounded-lg bg-muted/40 border border-border/60 p-2 text-xs flex flex-wrap gap-x-4 gap-y-1 items-center">
            <span className="text-muted-foreground">
              <Bi ar="التأمين المدفوع" en="Deposit paid" />:
              <span className="tech-content ms-1" dir="ltr">{Number(order.deposit_amount).toFixed(2)} {order.currency}</span>
            </span>
            <span className="font-semibold">
              <Bi ar="المبلغ المسترد" en="Refunded" />:
              <span className="tech-content ms-1" dir="ltr">{Number(ret.deposit_refunded).toFixed(2)} {order.currency}</span>
            </span>
          </div>
        )}

        {ret.provider_notes && (
          <div className="text-sm">
            <div className="text-xs text-muted-foreground mb-1"><Bi ar="ملاحظات المزوّد" en="Provider notes" /></div>
            <p className="whitespace-pre-wrap">{ret.provider_notes}</p>
          </div>
        )}

        {ret.photos && ret.photos.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {ret.photos.map(p => (
              <a key={p.path} href={signed[p.path] ?? '#'} target="_blank" rel="noopener noreferrer"
                 className="block aspect-square rounded-md overflow-hidden border bg-muted">
                {signed[p.path]
                  ? <img src={signed[p.path]!} alt="" className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">…</div>}
              </a>
            ))}
          </div>
        )}

        {/* Ack / dispute actions */}
        {ret.customer_ack ? (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <Bi ar="تم تأكيد الاستلام" en="You confirmed receipt" />
            {ret.customer_ack_at && (
              <span className="text-muted-foreground tech-content ms-2" dir="ltr">
                {new Date(ret.customer_ack_at).toLocaleString()}
              </span>
            )}
          </div>
        ) : ret.customer_dispute_note ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-destructive mb-1">
              <AlertTriangle className="h-4 w-4" />
              <Bi ar="ملاحظتك على الإرجاع" en="Your dispute note" />
            </div>
            <p className="whitespace-pre-wrap">{ret.customer_dispute_note}</p>
            <p className="text-muted-foreground mt-1">
              <Bi ar="تم إبلاغ المزوّد والإدارة للمراجعة." en="Provider and admin have been notified." />
            </p>
          </div>
        ) : mode === 'dispute' ? (
          <div className="space-y-2 border rounded-lg p-3">
            <Label className="text-xs"><Bi ar="اكتب ملاحظتك" en="Your note" /></Label>
            <Textarea rows={3} dir="auto" value={note} onChange={e => setNote(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={dispute} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Bi ar="إرسال الاعتراض" en="Submit dispute" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setMode('idle'); setNote(''); }}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={ack} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin me-1" /> : <CheckCircle2 className="size-4 me-1" />}
              <Bi ar="تأكيد الاستلام" en="Confirm receipt" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode('dispute')}>
              <MessageSquare className="size-4 me-1" />
              <Bi ar="لدي ملاحظة" en="I have a note" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RentalReturnCustomerCard;