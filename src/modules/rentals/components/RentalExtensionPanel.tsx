/**
 * RENTAL-MICROSERVICE-2 — inline extension/renewal panel.
 *
 * Strict no-popup. All actions render as inline forms inside a Card.
 * Each action goes through the rentals module services so audit events
 * and notifications are emitted exactly once.
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, CalendarPlus, X, PackageCheck } from 'lucide-react';
import { Bi, useBi } from '@/components/common/Bilingual';
import { toast } from 'sonner';
import { RentalExtensionsApi, RentalOrders } from '@/modules/rentals';
import type { RentalOrder, RentalExtensionType } from '@/modules/rentals';

export interface RentalExtensionPanelProps {
  order: RentalOrder;
  /** Whether the viewer can act as provider (admin/owner). */
  asProvider?: boolean;
  /** Whether the viewer is the customer. */
  asCustomer?: boolean;
  /** Called after a mutation so the parent can refresh. */
  onChanged?: () => void | Promise<void>;
}

type Mode = 'idle' | 'request' | 'renew' | 'close';

export const RentalExtensionPanel: React.FC<RentalExtensionPanelProps> = ({
  order, asProvider, asCustomer, onChanged,
}) => {
  const bi = useBi();
  const [mode, setMode] = React.useState<Mode>('idle');
  const [busy, setBusy] = React.useState(false);
  const [days, setDays] = React.useState('7');
  const [qty, setQty] = React.useState('0');
  const [reason, setReason] = React.useState('');
  const [extType, setExtType] = React.useState<RentalExtensionType>('duration_only');

  // T4.4 — extension pricing preview. Uses `extension_daily_rate` when set
  // on the order, otherwise falls back to the order's `unit_price` (the
  // rate captured at request time from the item's base_price).
  const dailyRate = React.useMemo(
    () => Number(order.extension_daily_rate ?? order.unit_price ?? 0),
    [order.extension_daily_rate, order.unit_price],
  );
  const previewDays = Number(days) || 0;
  const previewCost = Math.max(0, previewDays * dailyRate);
  const rateSource: 'override' | 'base' =
    order.extension_daily_rate != null && Number(order.extension_daily_rate) > 0
      ? 'override' : 'base';

  const refresh = async () => { setMode('idle'); await onChanged?.(); };

  const submitExtension = async () => {
    if (Number(days) <= 0 && Number(qty) <= 0) {
      toast.error(bi('أدخل عدد أيام أو كمية صحيحة','Enter valid days or quantity'));
      return;
    }
    setBusy(true);
    const { error } = await RentalExtensionsApi.createExtension({
      rental_order_id: order.id,
      extension_type: extType,
      additional_days: Number(days) || 0,
      additional_quantity: Number(qty) || 0,
      reason: reason || undefined,
      cost: previewCost > 0 ? previewCost : undefined,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم إنشاء طلب التمديد','Extension request created'));
    await refresh();
  };

  const submitRenew = async () => {
    if (Number(days) <= 0) {
      toast.error(bi('أدخل عدد أيام صحيحة','Enter valid days'));
      return;
    }
    setBusy(true);
    const { error } = await RentalOrders.renewOrder(order.id, Number(days));
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم التجديد وإنشاء طلب جديد','Renewed — new order created'));
    await refresh();
  };

  const submitClose = async () => {
    setBusy(true);
    const { error } = await RentalOrders.closeOrder(order.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم إغلاق الطلب','Order closed'));
    await refresh();
  };

  const canAct = asProvider || asCustomer;
  const locked = order.status === 'closed' || order.status === 'cancelled';

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          <Bi ar="إجراءات التمديد والتجديد" en="Extension & renewal actions" />
        </div>
        <div className="text-xs text-muted-foreground tech-content">{order.ref_id}</div>
      </div>

      {!canAct && (
        <div className="text-xs text-muted-foreground">
          <Bi ar="لا تملك صلاحية تنفيذ إجراءات على هذا الطلب." en="You do not have permission to act on this order." />
        </div>
      )}

      {canAct && !locked && mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="hover-lift" onClick={() => { setMode('request'); setExtType('duration_only'); }}>
            <CalendarPlus className="size-4 me-1" /><Bi ar="طلب تمديد" en="Request extension" />
          </Button>
          <Button size="sm" variant="outline" className="hover-lift" onClick={() => { setMode('request'); setExtType('partial'); }}>
            <CalendarPlus className="size-4 me-1" /><Bi ar="تمديد جزئي" en="Partial extension" />
          </Button>
          <Button size="sm" variant="outline" className="hover-lift" onClick={() => setMode('renew')}>
            <RefreshCw className="size-4 me-1" /><Bi ar="تجديد كامل" en="Full renewal" />
          </Button>
          <Button size="sm" variant="outline" className="hover-lift" onClick={() => setMode('close')}>
            <PackageCheck className="size-4 me-1" /><Bi ar="إغلاق الطلب" en="Close order" />
          </Button>
        </div>
      )}

      {canAct && (mode === 'request') && (
        <div className="space-y-3 border rounded-xl p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs"><Bi ar="أيام إضافية" en="Additional days" /></Label>
              <Input type="number" min={0} value={days} onChange={e => setDays(e.target.value)} className="tech-content" />
            </div>
            {extType === 'partial' && (
              <div>
                <Label className="text-xs"><Bi ar="كمية إضافية" en="Additional quantity" /></Label>
                <Input type="number" min={0} value={qty} onChange={e => setQty(e.target.value)} className="tech-content" />
              </div>
            )}
            <div className="md:col-span-1">
              <Label className="text-xs"><Bi ar="سبب الطلب" en="Reason" /></Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} dir="auto" />
            </div>
          </div>
          {previewDays > 0 && dailyRate > 0 && (
            <div className="rounded-lg bg-muted/40 border border-border/60 p-2 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">
                <Bi ar="السعر اليومي للتمديد" en="Extension daily rate" />:
                <span className="tech-content ms-1" dir="ltr">{dailyRate.toFixed(2)} {order.currency}</span>
                <span className="ms-2 text-[10px] opacity-70">
                  {rateSource === 'override'
                    ? bi('(سعر تمديد مخصص)', '(custom extension rate)')
                    : bi('(السعر الأساسي)', '(base rate)')}
                </span>
              </span>
              <span className="font-semibold">
                <Bi ar="التكلفة التقديرية" en="Estimated cost" />:
                <span className="tech-content ms-1" dir="ltr">{previewCost.toFixed(2)} {order.currency}</span>
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={submitExtension} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Bi ar="إرسال" en="Submit" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('idle')}><X className="size-4" /></Button>
          </div>
        </div>
      )}

      {canAct && mode === 'renew' && (
        <div className="space-y-3 border rounded-xl p-3">
          <Label className="text-xs"><Bi ar="مدة التجديد بالأيام" en="Renewal days" /></Label>
          <Input type="number" min={1} value={days} onChange={e => setDays(e.target.value)} className="tech-content" />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitRenew} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Bi ar="تجديد" en="Renew" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('idle')}><X className="size-4" /></Button>
          </div>
        </div>
      )}

      {canAct && mode === 'close' && (
        <div className="space-y-3 border rounded-xl p-3">
          <div className="text-sm">
            <Bi ar="سيتم إغلاق الطلب نهائيًا. لا يمكن التراجع." en="The order will be closed permanently. This cannot be undone." />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={submitClose} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Bi ar="تأكيد الإغلاق" en="Confirm close" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('idle')}><X className="size-4" /></Button>
          </div>
        </div>
      )}

      {locked && (
        <div className="text-xs text-muted-foreground">
          <Bi ar="الطلب مغلق — لا يمكن تنفيذ إجراءات." en="Order is locked — no further actions allowed." />
        </div>
      )}
    </Card>
  );
};

export default RentalExtensionPanel;