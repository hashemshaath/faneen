/**
 * Presentational form: mark a membership payment as paid manually.
 * Pure UI — values + handlers come from parent. No Supabase, no mutations.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { pickBi } from '@/components/common/Bilingual';

export interface PaymentManualFormProps {
  isRTL: boolean;
  intentId: string;
  externalPaymentId: string;
  invoiceId: string;
  paidAt: string;
  notes: string;
  submitting: boolean;
  canSubmit: boolean;
  onExternalPaymentIdChange: (value: string) => void;
  onInvoiceIdChange: (value: string) => void;
  onPaidAtChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const PaymentManualForm: React.FC<PaymentManualFormProps> = ({
  isRTL,
  intentId,
  externalPaymentId,
  invoiceId,
  paidAt,
  notes,
  submitting,
  canSubmit,
  onExternalPaymentIdChange,
  onInvoiceIdChange,
  onPaidAtChange,
  onNotesChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {pickBi(isRTL, 'تأكيد دفع نية الدفع', 'Confirm payment intent')}
          <span className="ms-2 text-xs font-mono text-muted-foreground">{intentId.slice(0, 8)}…</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ext-pay-id">{pickBi(isRTL, 'معرف الدفع الخارجي', 'External payment ID')}</Label>
            <Input
              id="ext-pay-id"
              dir="auto"
              value={externalPaymentId}
              onChange={(e) => onExternalPaymentIdChange(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-id">{pickBi(isRTL, 'رقم الفاتورة', 'Invoice ID')}</Label>
            <Input
              id="invoice-id"
              dir="auto"
              value={invoiceId}
              onChange={(e) => onInvoiceIdChange(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid-at">{pickBi(isRTL, 'تاريخ الدفع', 'Paid at')}</Label>
            <Input
              id="paid-at"
              type="datetime-local"
              value={paidAt}
              onChange={(e) => onPaidAtChange(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">{pickBi(isRTL, 'ملاحظات', 'Notes')}</Label>
            <Textarea
              id="notes"
              dir="auto"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            {pickBi(isRTL, 'إلغاء', 'Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !canSubmit}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {pickBi(isRTL, 'تأكيد الدفع', 'Confirm paid')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentManualForm;