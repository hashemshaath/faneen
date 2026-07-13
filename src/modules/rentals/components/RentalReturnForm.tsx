/**
 * T5 — provider "record return & close" inline form.
 *
 * Strict no-popup — renders inline inside the OrdersPanel expanded view.
 * Submitting inserts `rental_returns`, closes the order, logs
 * `return.recorded`, and notifies the customer.
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, PackageCheck, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Bi, useBi } from '@/components/common/Bilingual';
import { toast } from 'sonner';
import {
  recordReturnAndClose,
  appendReturnPhotos,
  uploadReturnPhoto,
  type RentalReturnCondition,
  type RentalReturnPhoto,
} from '../services/returns';
import type { RentalOrder } from '../types';

export interface RentalReturnFormProps {
  order: RentalOrder;
  onDone?: () => void | Promise<void>;
}

export const RentalReturnForm: React.FC<RentalReturnFormProps> = ({ order, onDone }) => {
  const bi = useBi();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [condition, setCondition] = React.useState<RentalReturnCondition>('good');
  const [damageDesc, setDamageDesc] = React.useState('');
  const [damageAmount, setDamageAmount] = React.useState('0');
  const [providerNotes, setProviderNotes] = React.useState('');
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const deposit = Number(order.deposit_amount ?? 0);
  const damageNum = Math.max(0, Number(damageAmount) || 0);
  const suggestedRefund = Math.max(0, deposit - damageNum);
  const [depositRefunded, setDepositRefunded] = React.useState<string>(String(suggestedRefund));

  // Re-suggest refund when damage changes (unless the user edited it manually).
  const damageAmountRef = React.useRef(damageAmount);
  React.useEffect(() => {
    if (damageAmountRef.current !== damageAmount) {
      damageAmountRef.current = damageAmount;
      setDepositRefunded(String(Math.max(0, deposit - damageNum)));
    }
  }, [damageAmount, damageNum, deposit]);

  const disallowed = order.status === 'closed' || order.status === 'cancelled' || order.status === 'declined';

  const submit = async () => {
    setBusy(true);
    const r = await recordReturnAndClose({
      rental_order_id: order.id,
      condition,
      damage_description: condition === 'good' ? null : damageDesc.trim() || null,
      damage_amount: condition === 'good' ? 0 : damageNum,
      deposit_refunded: deposit > 0 ? Math.max(0, Number(depositRefunded) || 0) : null,
      provider_notes: providerNotes.trim() || null,
    });
    if (r.error || !r.data) {
      setBusy(false);
      toast.error(r.error?.message ?? bi('تعذّر تسجيل الإرجاع', 'Failed to record return'));
      return;
    }

    // Upload any pending photos and attach them to the freshly-created row.
    if (pendingFiles.length > 0) {
      setUploading(true);
      const uploaded: RentalReturnPhoto[] = [];
      for (const f of pendingFiles) {
        const u = await uploadReturnPhoto(r.data.returnRow.id, f);
        if (u.data) uploaded.push(u.data);
      }
      if (uploaded.length > 0) {
        await appendReturnPhotos(r.data.returnRow.id, uploaded);
      }
      setUploading(false);
    }

    setBusy(false);
    toast.success(bi('تم تسجيل الإرجاع وإغلاق الطلب', 'Return recorded and order closed'));
    setOpen(false);
    await onDone?.();
  };

  const onPick = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => /^image\//.test(f.type));
    setPendingFiles(prev => [...prev, ...arr].slice(0, 10));
  };

  if (disallowed) return null;

  return (
    <Card className="p-4 space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-2">
          <PackageCheck className="size-4" />
          <Bi ar="تسجيل الإرجاع والإغلاق" en="Record return & close" />
        </div>
        {!open ? (
          <Button size="sm" onClick={() => setOpen(true)} className="hover-lift">
            <Bi ar="بدء التسجيل" en="Start" />
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs"><Bi ar="حالة المعدة" en="Condition" /></Label>
            <Select value={condition} onValueChange={v => setCondition(v as RentalReturnCondition)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="good">{bi('سليمة', 'Good')}</SelectItem>
                <SelectItem value="damaged">{bi('متضررة', 'Damaged')}</SelectItem>
                <SelectItem value="missing_parts">{bi('نواقص', 'Missing parts')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {condition !== 'good' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs"><Bi ar="وصف الضرر / النواقص" en="Damage / missing description" /></Label>
                <Textarea rows={2} dir="auto" value={damageDesc} onChange={e => setDamageDesc(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs"><Bi ar="قيمة الضرر" en="Damage amount" /></Label>
                <Input type="number" min={0} step="0.01" value={damageAmount}
                       onChange={e => setDamageAmount(e.target.value)} className="tech-content" />
              </div>
            </div>
          )}

          {deposit > 0 && (
            <div className="rounded-lg bg-muted/40 border border-border/60 p-2 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  <Bi ar="التأمين المدفوع" en="Deposit paid" />:
                  <span className="tech-content ms-1" dir="ltr">{deposit.toFixed(2)} {order.currency}</span>
                </span>
                <span className="text-muted-foreground">
                  <Bi ar="مقترح الاسترداد" en="Suggested refund" />:
                  <span className="tech-content ms-1" dir="ltr">{suggestedRefund.toFixed(2)} {order.currency}</span>
                </span>
              </div>
              <div>
                <Label className="text-xs"><Bi ar="المبلغ المسترد للعميل" en="Deposit refund to customer" /></Label>
                <Input type="number" min={0} step="0.01" value={depositRefunded}
                       onChange={e => setDepositRefunded(e.target.value)} className="tech-content" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs"><Bi ar="ملاحظات المزوّد" en="Provider notes" /></Label>
            <Textarea rows={2} dir="auto" value={providerNotes} onChange={e => setProviderNotes(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-2">
              <ImageIcon className="size-3.5" />
              <Bi ar="صور الإرجاع (اختياري)" en="Return photos (optional)" />
            </Label>
            <label className="flex items-center gap-2 border border-dashed rounded-md p-2 cursor-pointer text-xs hover:bg-muted/40">
              <Upload className="size-4" />
              <span><Bi ar="اختر صورًا" en="Choose images" /></span>
              <input type="file" accept="image/*" multiple className="hidden"
                     onChange={e => onPick(e.target.files)} />
            </label>
            {pendingFiles.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <Bi ar="عدد الصور المختارة" en="Selected" />: {pendingFiles.length}
                <Button size="sm" variant="ghost" className="ms-2 h-6 px-2"
                        onClick={() => setPendingFiles([])}>
                  <Bi ar="مسح" en="Clear" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={submit} disabled={busy || uploading} className="hover-lift">
              {(busy || uploading) ? <Loader2 className="size-4 animate-spin me-1" /> : <PackageCheck className="size-4 me-1" />}
              <Bi ar="تسجيل وإغلاق" en="Record & close" />
            </Button>
            <div className="text-[11px] text-muted-foreground">
              <Bi ar="سيتم إغلاق الطلب نهائيًا بعد التسجيل." en="Order will be closed permanently after recording." />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RentalReturnForm;